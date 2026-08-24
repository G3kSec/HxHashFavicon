import { isIP } from 'net';

const PRIVATE_RANGES = [
  { prefix: '10.', mask: null },
  { prefix: '172.', mask: (ip: string) => { const b = parseInt(ip.split('.')[1]); return b >= 16 && b <= 31; } },
  { prefix: '192.168.', mask: null },
  { prefix: '127.', mask: null },
  { prefix: '0.', mask: null },
  { prefix: '169.254.', mask: null },
  { prefix: '100.64.', mask: (ip: string) => { const b = parseInt(ip.split('.')[1]); return b >= 64 && b <= 127; } },
];

export function isPrivateIPv4(ip: string): boolean {
  for (const range of PRIVATE_RANGES) {
    if (ip.startsWith(range.prefix)) {
      return range.mask ? range.mask(ip) : true;
    }
  }
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('fe80')) return true;
  if (lower.startsWith('::ffff:')) {
    const v4part = lower.slice(7);
    if (isIP(v4part) === 4) return isPrivateIPv4(v4part);
    const hexParts = v4part.split(':');
    if (hexParts.length === 2) {
      const hi = parseInt(hexParts[0], 16);
      const lo = parseInt(hexParts[1], 16);
      if (!isNaN(hi) && !isNaN(lo) && hi <= 0xffff && lo <= 0xffff) {
        const mapped = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
        return isPrivateIPv4(mapped);
      }
    }
  }
  if (lower.startsWith('::') && lower.includes('.')) {
    const v4part = lower.slice(2);
    if (isIP(v4part) === 4) return isPrivateIPv4(v4part);
  }
  return false;
}

function parseNumericIPv4(hostname: string): string | null {
  if (/^\d+$/.test(hostname)) {
    const num = parseInt(hostname, 10);
    if (num >= 0 && num <= 0xffffffff) {
      return `${(num >> 24) & 0xff}.${(num >> 16) & 0xff}.${(num >> 8) & 0xff}.${num & 0xff}`;
    }
  }
  if (/^0x[0-9a-f]+$/i.test(hostname)) {
    const num = parseInt(hostname, 16);
    if (num >= 0 && num <= 0xffffffff) {
      return `${(num >> 24) & 0xff}.${(num >> 16) & 0xff}.${(num >> 8) & 0xff}.${num & 0xff}`;
    }
  }
  return null;
}

export function isPrivateUrl(parsed: URL): boolean {
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return true;

  const numericIp = parseNumericIPv4(hostname);
  if (numericIp) return isPrivateIPv4(numericIp);

  if (isIP(hostname) === 4) return isPrivateIPv4(hostname);
  if (isIP(hostname) === 6) return isPrivateIPv6(hostname);

  return false;
}

export async function resolveAndValidate(hostname: string): Promise<void> {
  if (isIP(hostname)) return;
  const { lookup } = await import('dns/promises');
  const results = await lookup(hostname, { all: true });
  for (const { address, family } of results) {
    if (family === 4 && isPrivateIPv4(address)) {
      throw new Error('Hostname resolves to a private/internal address');
    }
    if (family === 6 && isPrivateIPv6(address)) {
      throw new Error('Hostname resolves to a private/internal address');
    }
  }
}
