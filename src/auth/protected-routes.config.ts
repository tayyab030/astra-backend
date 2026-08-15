/**
 * URL paths after `api/` that require a valid access token.
 * Example: `auth` protects `/api/auth/*` except routes listed in publicRoutePrefixes.
 */
export const protectedRoutePrefixes = [
  'auth',
  'goals',
  'tasks',
  'wealth',
  'time-track',
  'health',
  'notes',
  'assistant',
];

/**
 * Paths that stay public even when they match a protected prefix.
 */
export const publicRoutePrefixes = [
  'auth/users',
  'auth/jwt',
  'auth/password',
];

function normalizeRoutePath(path: string): string {
  return path
    .split('?')[0]
    .replace(/^\/api\/?/, '')
    .replace(/^\/+|\/+$/g, '');
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function routeRequiresAuth(url: string): boolean {
  const path = normalizeRoutePath(url);

  for (const publicPrefix of publicRoutePrefixes) {
    if (matchesPrefix(path, publicPrefix)) {
      return false;
    }
  }

  for (const protectedPrefix of protectedRoutePrefixes) {
    if (matchesPrefix(path, protectedPrefix)) {
      return true;
    }
  }

  return false;
}
