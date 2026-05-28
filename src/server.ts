import express, { type Request, type Response } from 'express';
import {
  authorizationUrl,
  createOAuthState,
  exchangeCode,
  verifyOAuthState,
} from './intuit.js';
import {
  extractPaymentLinkUid,
  isPaidMakePayEvent,
  verifyMakePaySignature,
} from './makepay.js';
import { createLinkForInvoice, reconcilePaidPayment } from './flows.js';
import { MemoryRepository, type Repository } from './storage.js';
import type { AppConfig, MakePayWebhookEvent } from './types.js';

type RawBodyRequest = Request & { rawBody?: Buffer };

function requireAdmin(config: AppConfig, request: Request, response: Response): boolean {
  if (request.header('authorization') !== `Bearer ${config.adminToken}`) {
    response.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export function createApp(config: AppConfig, repository: Repository = new MemoryRepository()) {
  const app = express();

  app.use(
    express.json({
      verify: (request: RawBodyRequest, _response, buffer) => {
        request.rawBody = Buffer.from(buffer);
      },
    }),
  );

  app.get('/health', (_request, response) => response.json({ ok: true }));

  app.get('/oauth/start', (_request, response) => {
    const state = createOAuthState(config);
    response.redirect(authorizationUrl(config, state));
  });

  app.get('/oauth/callback', async (request, response, next) => {
    try {
      const code = String(request.query.code ?? '');
      const realmId = String(request.query.realmId ?? '');
      const state = String(request.query.state ?? '');
      if (!code || !realmId || !verifyOAuthState(config, state)) {
        response.status(400).json({ error: 'Invalid OAuth callback.' });
        return;
      }
      const company = await exchangeCode(config, code, realmId);
      await repository.saveCompany(company);
      response.json({ ok: true, realmId });
    } catch (error) {
      next(error);
    }
  });

  app.post('/admin/invoices/:realmId/:invoiceId/payment-link', async (request, response, next) => {
    try {
      if (!requireAdmin(config, request, response)) {
        return;
      }
      const mapping = await createLinkForInvoice(
        config,
        repository,
        request.params.realmId,
        request.params.invoiceId,
      );
      response.json(mapping);
    } catch (error) {
      next(error);
    }
  });

  app.post('/webhooks/makepay', async (request: RawBodyRequest, response, next) => {
    try {
      const verified = verifyMakePaySignature(
        request.rawBody ?? Buffer.from(JSON.stringify(request.body)),
        request.header('x-makepay-signature'),
        config.makePayWebhookSecret,
      );
      if (!verified) {
        response.status(401).json({ error: 'Invalid MakePay signature.' });
        return;
      }

      const event = request.body as MakePayWebhookEvent;
      const paymentLinkUid = extractPaymentLinkUid(event);
      if (!paymentLinkUid || !isPaidMakePayEvent(event)) {
        response.status(202).json({ ok: true, ignored: true });
        return;
      }

      const mapping = await reconcilePaidPayment(config, repository, paymentLinkUid);
      response.json({ ok: true, reconciled: Boolean(mapping) });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _request: Request, response: Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    response.status(500).json({ error: message });
  });

  return app;
}
