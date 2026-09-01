# HxHashFavicon

![Next.js](https://img.shields.io/badge/Next.js-000-white?style=flat-square&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000?style=flat-square&logo=shadcnui)

Minimalist OSINT tool that converts website favicons into Shodan/Fofa compatible MurmurHash3 signatures, letting you pivot from a visual identity to an organization's exposed infrastructure.

## Features

- Hash a favicon directly from a target URL, or upload a local file.
- One-click pivot to Shodan and Fofa with the generated hash.
- Local scan history (last 10 entries, stored in `localStorage`).
- Follows Shodan's exact hashing logic (Base64 with 76-character line breaks + MurmurHash3 x86 32-bit).
- Dark/light terminal-inspired UI, responsive on mobile.

## Stack

Next.js 15, Tailwind CSS v4, shadcn/ui, MurmurHash3.js, Axios, Cheerio.

## Usage

```bash
git clone https://github.com/G3kSec/HxHashFavicon.git
cd HxHashFavicon
npm install
npm run dev
```

1. Enter a target domain (or paste a direct favicon URL) or upload an icon file.
2. Copy the generated hash, or jump straight to Shodan/Fofa to find matching infrastructure (dev/staging servers, admin panels, forgotten buckets, phishing clones).
