// All API calls go through the Next.js rewrite proxy (see next.config.mjs),
// so the browser only ever talks to this same origin. The real backend URL
// lives server-side in NEXT_PUBLIC_API_BASE_URL (rewrite destination).
export const API_BASE_URL = "/api";

