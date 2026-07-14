const trustedAppOrigins = new Set([
  'https://localhost',
  'capacitor://localhost'
]);

export function isAllowedOrigin(origin: string | undefined, configuredOrigins: readonly string[]) {
  return !origin
    || configuredOrigins.includes('*')
    || configuredOrigins.includes(origin)
    || trustedAppOrigins.has(origin);
}
