interface Env {
  apiUrl: string;
  cloudflareTurnstileSiteKey?: string;
}

export const env: Env = {
  apiUrl: (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1',
  cloudflareTurnstileSiteKey: import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITEKEY,
};
export default env;
