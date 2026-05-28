import 'dotenv/config';
import { z } from 'zod';
import type { AppConfig } from './types.js';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  PUBLIC_APP_URL: z.string().url(),
  INTUIT_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  INTUIT_CLIENT_ID: z.string().min(1),
  INTUIT_CLIENT_SECRET: z.string().min(1),
  OAUTH_STATE_SECRET: z.string().min(1),
  MAKEPAY_BASE_URL: z.string().url().default('https://www.makecrypto.io'),
  MAKEPAY_KEY_ID: z.string().min(1),
  MAKEPAY_KEY_SECRET: z.string().min(1),
  MAKEPAY_WEBHOOK_SECRET: z.string().min(1),
  ADMIN_TOKEN: z.string().min(16),
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);

  return {
    port: parsed.PORT,
    publicAppUrl: parsed.PUBLIC_APP_URL.replace(/\/+$/, ''),
    intuitEnvironment: parsed.INTUIT_ENVIRONMENT,
    intuitClientId: parsed.INTUIT_CLIENT_ID,
    intuitClientSecret: parsed.INTUIT_CLIENT_SECRET,
    oauthStateSecret: parsed.OAUTH_STATE_SECRET,
    makePayBaseUrl: parsed.MAKEPAY_BASE_URL.replace(/\/+$/, ''),
    makePayKeyId: parsed.MAKEPAY_KEY_ID,
    makePayKeySecret: parsed.MAKEPAY_KEY_SECRET,
    makePayWebhookSecret: parsed.MAKEPAY_WEBHOOK_SECRET,
    adminToken: parsed.ADMIN_TOKEN,
  };
}
