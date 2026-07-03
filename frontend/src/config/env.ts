interface Env {
  apiUrl: string;
  cloudflareTurnstileSiteKey?: string;
  googleClientId?: string;
}

export const env: Env = {
  apiUrl: (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1',
  cloudflareTurnstileSiteKey: import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITEKEY,
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '793728037081-03p54l6ntfisafaavflhpmtq5o3dfs1g.apps.googleusercontent.com',
};
export default env;
