import {
  createInvoicePayment,
  getInvoice,
  refreshCompanyToken,
} from './intuit.js';
import { createPaymentLinkForInvoice } from './makepay.js';
import type { AppConfig, PaymentMapping } from './types.js';
import type { Repository } from './storage.js';

export async function createLinkForInvoice(
  config: AppConfig,
  repository: Repository,
  realmId: string,
  invoiceId: string,
): Promise<PaymentMapping> {
  const existing = await repository.findPaymentByInvoice(realmId, invoiceId);
  if (existing) {
    return existing;
  }

  const company = await repository.getCompany(realmId);
  if (!company) {
    throw new Error('QuickBooks company is not connected.');
  }

  const freshCompany = await refreshCompanyToken(config, repository, company);
  const invoice = await getInvoice(config, freshCompany, invoiceId);
  const link = await createPaymentLinkForInvoice(config, realmId, invoice);
  const mapping: PaymentMapping = {
    realmId,
    invoiceId,
    paymentLinkUid: link.uid,
    paymentUrl: link.paymentUrl,
    amount: link.amount,
    status: 'created',
    createdAt: new Date().toISOString(),
  };
  await repository.savePayment(mapping);
  return mapping;
}

export async function reconcilePaidPayment(
  config: AppConfig,
  repository: Repository,
  paymentLinkUid: string,
): Promise<PaymentMapping | undefined> {
  const mapping = await repository.findPaymentByLink(paymentLinkUid);
  if (!mapping || mapping.status === 'paid') {
    return mapping;
  }

  const company = await repository.getCompany(mapping.realmId);
  if (!company) {
    return undefined;
  }

  const freshCompany = await refreshCompanyToken(config, repository, company);
  const invoice = await getInvoice(config, freshCompany, mapping.invoiceId);
  await createInvoicePayment(config, freshCompany, invoice, mapping.amount, paymentLinkUid);

  const paidMapping: PaymentMapping = {
    ...mapping,
    status: 'paid',
    paidAt: new Date().toISOString(),
  };
  await repository.savePayment(paidMapping);
  return paidMapping;
}
