import { describe, expect, it } from 'vitest';
import { authorizationUrl, createOAuthState, verifyOAuthState } from '../src/intuit.js';
import type { AppConfig } from '../src/types.js';

const config: AppConfig = {
  port: 3000,
  publicAppUrl: 'https://app.example.com',
  intuitEnvironment: 'sandbox',
  intuitClientId: 'client_id',
  intuitClientSecret: 'client_secret',
  oauthStateSecret: 'state_secret',
  makePayBaseUrl: 'https://makepay.example.com',
  makePayKeyId: 'key_id',
  makePayKeySecret: 'key_secret',
  makePayWebhookSecret: 'webhook_secret',
  adminToken: 'test_admin_token_123',
};

describe('Intuit OAuth helpers', () => {
  it('creates and verifies signed OAuth state values', () => {
    const state = createOAuthState(config);
    expect(verifyOAuthState(config, state)).toBe(true);
    expect(verifyOAuthState(config, `${state}x`)).toBe(false);
  });

  it('builds the Intuit authorization URL', () => {
    const url = new URL(authorizationUrl(config, 'state'));
    expect(url.hostname).toBe('appcenter.intuit.com');
    expect(url.searchParams.get('scope')).toBe('com.intuit.quickbooks.accounting');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/oauth/callback');
  });
});
