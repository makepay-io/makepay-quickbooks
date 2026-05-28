import type { ConnectedCompany, PaymentMapping } from './types.js';

export interface Repository {
  saveCompany(company: ConnectedCompany): Promise<void>;
  getCompany(realmId: string): Promise<ConnectedCompany | undefined>;
  savePayment(mapping: PaymentMapping): Promise<void>;
  findPaymentByInvoice(realmId: string, invoiceId: string): Promise<PaymentMapping | undefined>;
  findPaymentByLink(paymentLinkUid: string): Promise<PaymentMapping | undefined>;
}

export class MemoryRepository implements Repository {
  private readonly companies = new Map<string, ConnectedCompany>();

  private readonly paymentsByInvoice = new Map<string, PaymentMapping>();

  private readonly paymentsByLink = new Map<string, PaymentMapping>();

  async saveCompany(company: ConnectedCompany): Promise<void> {
    this.companies.set(company.realmId, company);
  }

  async getCompany(realmId: string): Promise<ConnectedCompany | undefined> {
    return this.companies.get(realmId);
  }

  async savePayment(mapping: PaymentMapping): Promise<void> {
    this.paymentsByInvoice.set(`${mapping.realmId}:${mapping.invoiceId}`, mapping);
    this.paymentsByLink.set(mapping.paymentLinkUid, mapping);
  }

  async findPaymentByInvoice(
    realmId: string,
    invoiceId: string,
  ): Promise<PaymentMapping | undefined> {
    return this.paymentsByInvoice.get(`${realmId}:${invoiceId}`);
  }

  async findPaymentByLink(paymentLinkUid: string): Promise<PaymentMapping | undefined> {
    return this.paymentsByLink.get(paymentLinkUid);
  }
}
