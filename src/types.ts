export type AppConfig = {
  port: number;
  publicAppUrl: string;
  intuitEnvironment: 'sandbox' | 'production';
  intuitClientId: string;
  intuitClientSecret: string;
  oauthStateSecret: string;
  makePayBaseUrl: string;
  makePayKeyId: string;
  makePayKeySecret: string;
  makePayWebhookSecret: string;
  adminToken: string;
};

export type ConnectedCompany = {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt?: number;
  connectedAt: string;
};

export type QuickBooksInvoice = {
  Id: string;
  DocNumber?: string;
  Balance?: number;
  TotalAmt?: number;
  CurrencyRef?: { value?: string; name?: string };
  CustomerRef?: { value?: string; name?: string };
};

export type PaymentMapping = {
  realmId: string;
  invoiceId: string;
  paymentLinkUid: string;
  paymentUrl?: string;
  amount: number;
  status: 'created' | 'paid';
  createdAt: string;
  paidAt?: string;
};

export type MakePayWebhookEvent = {
  type?: string;
  event?: { type?: string };
  session?: { status?: string };
  paymentLink?: { uid?: string; id?: string; status?: string };
  data?: Record<string, unknown>;
};
