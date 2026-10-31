import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock('undici', () => ({ fetch: fetchMock }));
// Isolate proxy/database infrastructure; exercise the provider's real OAuth logic.
vi.mock('../siteProxy.js', () => ({
  withExplicitProxyRequestInit: (_url: string, init: unknown) => init,
}));

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  for (const prefix of ['GEMINI_CLI', 'ANTIGRAVITY']) {
    vi.stubEnv(`${prefix}_CLIENT_ID`, '');
    vi.stubEnv(`${prefix}_CLIENT_SECRET`, '');
  }
});

afterEach(() => vi.unstubAllEnvs());

for (const prefix of ['GEMINI_CLI', 'ANTIGRAVITY'] as const) {
  const loadProvider = async () => prefix === 'GEMINI_CLI'
    ? (await import('./geminiCliProvider.js')).geminiCliOauthProvider
    : (await import('./antigravityProvider.js')).antigravityOauthProvider;

  describe(`${prefix} OAuth credentials`, () => {
    it.each(['CLIENT_ID', 'CLIENT_SECRET'] as const)('rejects missing %s before authorization or network access', async (missing) => {
      vi.stubEnv(`${prefix}_CLIENT_ID`, 'test-google-client-id');
      vi.stubEnv(`${prefix}_CLIENT_SECRET`, 'test-google-client-secret');
      vi.stubEnv(`${prefix}_${missing}`, '   ');
      const provider = await loadProvider();
      const input = { state: 'test-state', redirectUri: 'http://localhost/callback', codeVerifier: 'test-verifier' };
      const error = `${prefix}_${missing} is not configured`;

      await expect(provider.buildAuthorizationUrl(input)).rejects.toThrow(error);
      await expect(provider.exchangeAuthorizationCode({ ...input, code: 'test-code' })).rejects.toThrow(error);
      await expect(provider.refreshAccessToken({ refreshToken: 'test-refresh' })).rejects.toThrow(error);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('uses configured credentials in the authorization URL and refresh request', async () => {
      vi.stubEnv(`${prefix}_CLIENT_ID`, 'test-google-client-id');
      vi.stubEnv(`${prefix}_CLIENT_SECRET`, 'test-google-client-secret');
      const provider = await loadProvider();
      const url = new URL(await provider.buildAuthorizationUrl({
        state: 'test-state', redirectUri: 'http://localhost/callback', codeVerifier: 'test-verifier',
      }));
      expect(url.searchParams.get('client_id')).toBe('test-google-client-id');
      expect(url.searchParams.has('client_secret')).toBe(false);

      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-access', token_type: 'Bearer' })));
      if (prefix === 'GEMINI_CLI') {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ state: 'ENABLED' })));
      }
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ email: 'tester@example.com' })));
      const result = await provider.refreshAccessToken({ refreshToken: 'test-refresh', oauth: { projectId: 'test-project' } });
      expect(result.accessToken).toBe('test-access');
      const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
      expect(body.get('client_id')).toBe('test-google-client-id');
      expect(body.get('client_secret')).toBe('test-google-client-secret');
      expect(body.get('refresh_token')).toBe('test-refresh');
    });
  });
}
