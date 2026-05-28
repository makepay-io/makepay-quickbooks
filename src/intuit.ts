import { createHmac, randomBytes } from 'node:crypto';
import type { AppConfig, ConnectedCompany, QuickBooksInvoice } from './types.js';
import type { Repository } from './storage.js';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
};

function apiBase(config: AppConfig): string {
  return config.intuitEnvironment === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';
}

function basicAuth(config: AppConfig): string {
  return Buffer.from(`${config.intuitClientId}:${config.intuitClientSecret}`).toString('base64');
}

async function readResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : ({} as T);
  if (!response.ok) {
    throw new Error(`QuickBooks API ${response.status}: ${text || response.statusText}`);
  }
  return payload;
}

export function createOAuthState(config: AppConfig): string {
  const nonce = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', config.oauthStateSecret).update(nonce).digest('hex');
  return `${nonce}.${signature}`;
}

export function verifyOAuthState(config: AppConfig, state: string): boolean {
  const [nonce, signature] = state.split('.');
  if (!nonce || !signature) {
    return false;
  }
  const expected = createHmac('sha256', config.oauthStateSecret).update(nonce).digest('hex');
  return expected === signature;
}

export function authorizationUrl(config: AppConfig, state: string): string {
  const url = new URL('https://appcenter.intuit.com/connect/oauth2');
  url.searchParams.set('client_id', config.intuitClientId);
  url.searchParams.set('redirect_uri', `${config.publicAppUrl}/oauth/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'com.intuit.quickbooks.accounting');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeCode(
  config: AppConfig,
  code: string,
  realmId: string,
): Promise<ConnectedCompany> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${config.publicAppUrl}/oauth/callback`,
  });
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${basicAuth(config)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const token = await readResponse<TokenResponse>(response);
  const now = Date.now();

  return {
    realmId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    accessTokenExpiresAt: now + token.expires_in * 1000,
    refreshTokenExpiresAt: token.x_refresh_token_expires_in
      ? now + token.x_refresh_token_expires_in * 1000
      : undefined,
    connectedAt: new Date().toISOString(),
  };
}

export async function refreshCompanyToken(
  config: AppConfig,
  repository: Repository,
  company: ConnectedCompany,
): Promise<ConnectedCompany> {
  if (company.accessTokenExpiresAt > Date.now() + 60_000) {
    return company;
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: company.refreshToken,
  });
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${basicAuth(config)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const token = await readResponse<TokenResponse>(response);
  const now = Date.now();
  const updated: ConnectedCompany = {
    ...company,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    accessTokenExpiresAt: now + token.expires_in * 1000,
    refreshTokenExpiresAt: token.x_refresh_token_expires_in
      ? now + token.x_refresh_token_expires_in * 1000
      : company.refreshTokenExpiresAt,
  };
  await repository.saveCompany(updated);
  return updated;
}

export async function getInvoice(
  config: AppConfig,
  company: ConnectedCompany,
  invoiceId: string,
): Promise<QuickBooksInvoice> {
  const response = await fetch(
    `${apiBase(config)}/v3/company/${company.realmId}/invoice/${invoiceId}?minorversion=75`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${company.accessToken}`,
      },
    },
  );
  const payload = await readResponse<{ Invoice: QuickBooksInvoice }>(response);
  return payload.Invoice;
}

export async function createInvoicePayment(
  config: AppConfig,
  company: ConnectedCompany,
  invoice: QuickBooksInvoice,
  amount: number,
  paymentLinkUid: string,
): Promise<unknown> {
  const response = await fetch(`${apiBase(config)}/v3/company/${company.realmId}/payment?minorversion=75`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${company.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      CustomerRef: invoice.CustomerRef,
      TotalAmt: amount,
      PaymentRefNum: paymentLinkUid,
      PrivateNote: `MakePay payment ${paymentLinkUid}`,
      Line: [
        {
          Amount: amount,
          LinkedTxn: [
            {
              TxnId: invoice.Id,
              TxnType: 'Invoice',
            },
          ],
        },
      ],
    }),
  });
  return await readResponse<unknown>(response);
}
