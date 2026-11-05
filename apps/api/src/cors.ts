const trustedAppOrigins = new Set([
  'https://localhost',
  'capacitor://localhost'
]);

/**
 * Acesso temporário e restrito à demonstração autenticada da Etapa 09.
 * Não concede sessão, conta, permissão nem acesso ao banco por si só.
 * O backend continua exigindo JWT MEG e aplicando autorização por workspace.
 */
export const stage09PreviewOrigin = 'https://meg-lancamentos-09-pr.onrender.com';

const stage09ReadPaths = new Set([
  '/auth/me',
  '/finance/events',
  '/finance/events/month',
  '/finance/summary',
  '/finance/accounts',
  '/finance/categories',
  '/finance/payment-methods',
  '/finance/sync-status',
  '/finance/cashflow',
  '/finance/benefit-summary',
  '/finance/home-available',
  '/cards',
  '/payables/open',
]);

const stage09AuthPaths = new Set(['/auth/login', '/auth/refresh', '/auth/logout']);

export function isAllowedOrigin(origin: string | undefined, configuredOrigins: readonly string[]) {
  return !origin
    || configuredOrigins.includes('*')
    || configuredOrigins.includes(origin)
    || trustedAppOrigins.has(origin)
    || origin === stage09PreviewOrigin;
}

/**
 * Camada adicional de proteção para a origem de preview da Web.
 * Não substitui autorização JWT nem deve ser usada como garantia de
 * segurança contra clientes que falsifiquem/omitam o header Origin.
 */
export function isStage09PreviewRequestAllowed(
  origin: string | undefined,
  method: string,
  url: string,
) {
  if (origin !== stage09PreviewOrigin) return true;
  if (method === 'OPTIONS') return true; // o preflight CORS não efetua operações
  const path = url.split('?')[0];
  if (method === 'GET') return stage09ReadPaths.has(path);
  if (method === 'POST') return stage09AuthPaths.has(path);
  return false;
}
