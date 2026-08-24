import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { isPrivateIPv4, isPrivateIPv6 } from './url-validation';

type LookupAllCallback = (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void;
type LookupOneCallback = (err: NodeJS.ErrnoException | null, address: string, family: number) => void;

function isSafeAddress({ address, family }: dns.LookupAddress): boolean {
  return !(family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address));
}

/**
 * Node resolves a hostname again when the request actually connects, so a
 * pre-request DNS check (resolveAndValidate) leaves a TOCTOU window: an
 * attacker's DNS server can answer a public IP for the check and a private
 * one (e.g. 169.254.169.254) moments later for the real connection —
 * classic DNS-rebinding SSRF. Pinning the lookup used by the agent makes
 * validation and connection use the exact same resolution, closing that gap
 * on every hop including redirects (each new connection re-runs this).
 *
 * net.connect always calls back with { all: true } (Happy Eyeballs), so this
 * must honor that flag and reply with an address array in that mode —
 * replying with the single-address (err, address, family) form instead
 * makes Node treat the address string as an array and throw
 * ERR_INVALID_IP_ADDRESS.
 */
function safeLookup(
  hostname: string,
  options: dns.LookupOptions | LookupOneCallback,
  callback?: LookupOneCallback | LookupAllCallback
) {
  const wantsAll = typeof options === 'object' && options.all === true;
  const cb = typeof options === 'function' ? options : callback!;

  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    const safeAddresses = err ? [] : addresses.filter(isSafeAddress);
    const failure =
      err ?? (safeAddresses.length === 0 ? new Error('Hostname resolves to a private/internal address') : null);

    if (wantsAll) {
      (cb as LookupAllCallback)(failure, safeAddresses);
    } else if (failure) {
      (cb as LookupOneCallback)(failure, '', 0);
    } else {
      const { address, family } = safeAddresses[0];
      (cb as LookupOneCallback)(null, address, family);
    }
  });
}

export const safeHttpAgent = new http.Agent({ lookup: safeLookup as unknown as (typeof dns)['lookup'] });
export const safeHttpsAgent = new https.Agent({ lookup: safeLookup as unknown as (typeof dns)['lookup'] });
