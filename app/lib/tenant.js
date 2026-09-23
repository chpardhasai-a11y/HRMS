export function getTenantSlugFromLocation() {
  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  const tenantParam = searchParams.get('tenant') || searchParams.get('company');
  if (tenantParam) return tenantParam.toLowerCase();

  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length > 1 && !['localhost', '127', '0', 'www'].includes(parts[0])) {
    return parts[0].toLowerCase();
  }
  return null;
}
