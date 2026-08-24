import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import murmurhash3 from 'murmurhash3js';
import { isPrivateUrl, resolveAndValidate } from '@/lib/url-validation';
import { safeHttpAgent, safeHttpsAgent } from '@/lib/safe-agent';

const MAX_FAVICON_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (url.length > 2048) {
      return NextResponse.json({ error: 'URL too long' }, { status: 400 });
    }

    if (url.includes('://') && !url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json({ error: 'Only HTTP/HTTPS protocols are allowed' }, { status: 400 });
    }

    const targetUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return NextResponse.json({ error: 'Only HTTP/HTTPS protocols are allowed' }, { status: 400 });
    }

    if (isPrivateUrl(parsed)) {
      return NextResponse.json({ error: 'Requests to private/internal addresses are not allowed' }, { status: 400 });
    }

    await resolveAndValidate(parsed.hostname);

    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaviconHasher/1.0)' },
      timeout: 5000,
      maxRedirects: 3,
      maxContentLength: 5 * 1024 * 1024,
      httpAgent: safeHttpAgent,
      httpsAgent: safeHttpsAgent,
      beforeRedirect: (options) => {
        const href = String(options.href || `${options.protocol}//${options.hostname}`);
        const redirectUrl = new URL(href);
        if (isPrivateUrl(redirectUrl)) {
          throw new Error('Redirect to private/internal address blocked');
        }
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    let faviconUrl =
      $('link[rel="shortcut icon"]').attr('href') ||
      $('link[rel="icon"]').attr('href') ||
      '/favicon.ico';

    if (faviconUrl && !faviconUrl.startsWith('http')) {
      faviconUrl = new URL(faviconUrl, parsed.origin).toString();
    }

    let faviconParsed: URL;
    try {
      faviconParsed = new URL(faviconUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid favicon URL found in page' }, { status: 400 });
    }

    if (faviconParsed.protocol !== 'https:' && faviconParsed.protocol !== 'http:') {
      return NextResponse.json({ error: 'Favicon URL uses unsupported protocol' }, { status: 400 });
    }

    if (isPrivateUrl(faviconParsed)) {
      return NextResponse.json({ error: 'Favicon points to a private/internal address' }, { status: 400 });
    }

    await resolveAndValidate(faviconParsed.hostname);

    const imageResponse = await axios.get(faviconUrl, {
      responseType: 'arraybuffer',
      timeout: 5000,
      maxRedirects: 3,
      maxContentLength: MAX_FAVICON_SIZE,
      httpAgent: safeHttpAgent,
      httpsAgent: safeHttpsAgent,
      beforeRedirect: (options) => {
        const href = String(options.href || `${options.protocol}//${options.hostname}`);
        const redirectUrl = new URL(href);
        if (isPrivateUrl(redirectUrl)) {
          throw new Error('Redirect to private/internal address blocked');
        }
      },
    });

    const base64 = Buffer.from(imageResponse.data).toString('base64');
    const withNewLines = base64.replace(/(.{76})/g, '$1\n') + '\n';
    const hash = murmurhash3.x86.hash32(withNewLines);

    return NextResponse.json({
      hash,
      faviconUrl,
      shodanQuery: `http.favicon.hash:${hash}`,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('private')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const isAxiosTimeout = axios.isAxiosError(error) && error.code === 'ECONNABORTED';
    const message = isAxiosTimeout
      ? 'Request timed out. Ensure the URL is reachable.'
      : 'Failed to fetch favicon. Ensure the URL is reachable.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
