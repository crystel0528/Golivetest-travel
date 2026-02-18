// tools/orphan-detector/orphan-utils.ts

/**
 * Normalize URL by removing trailing slash and query strings
 */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

/**
 * Check if a URL is NOT in ignored paths
 */
export function filterIgnoredPaths(url: string, ignoredPaths: string[]): boolean {
  try {
    const pathname = new URL(url).pathname;
    return !ignoredPaths.includes(pathname);
  } catch {
    return true;
  }
}
