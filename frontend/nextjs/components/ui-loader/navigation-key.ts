export function navigationKey(url: { pathname: string; search: string }) {
  const query = new URLSearchParams(url.search).toString();
  return url.pathname + (query ? `?${query}` : "");
}
