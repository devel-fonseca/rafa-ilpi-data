const SIGNED_QUERY_KEYS = new Set([
  'x-amz-algorithm',
  'x-amz-credential',
  'x-amz-date',
  'x-amz-expires',
  'x-amz-security-token',
  'x-amz-signature',
  'x-amz-signedheaders',
  'expires',
  'signature',
  'key-pair-id',
  'token',
]);

function extractQueryString(urlOrPath: string): string {
  const queryIndex = urlOrPath.indexOf('?');
  if (queryIndex === -1) return '';
  return urlOrPath.slice(queryIndex + 1);
}

export function hasSignedUrlQuery(urlOrPath?: string | null): boolean {
  if (!urlOrPath || typeof urlOrPath !== 'string') return false;

  const queryString = extractQueryString(urlOrPath).trim();
  if (!queryString) return false;

  const params = new URLSearchParams(queryString);
  for (const key of params.keys()) {
    if (SIGNED_QUERY_KEYS.has(key.toLowerCase())) {
      return true;
    }
  }

  return false;
}
