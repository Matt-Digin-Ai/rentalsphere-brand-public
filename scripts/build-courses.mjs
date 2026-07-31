#!/usr/bin/env node
/**
 * Rebuilds data/courses.json from the live rentalsphere.co.za catalogue.
 *
 * Why this exists: the course list used to be hand-maintained inside Fundi's
 * prompt. It drifted badly (dead product links, a reused course code pointing
 * at the wrong course, two thirds of the catalogue missing). This makes the
 * live shop the single source of truth.
 *
 * No dependencies, no credentials: the WooCommerce Store API is public read.
 * Run: node scripts/build-courses.mjs
 */

const API = 'https://rentalsphere.co.za/wp-json/wc/store/v1/products';

// Categories that represent buyable training. Membership, documents,
// consultations and mandates are deliberately excluded.
const TRAINING_CATEGORIES = new Set([
  'on-demand-training',
  'online-training',
  'online-training-live',
  'onsite-training',
  'level-1-beginners',
  'level-2-beginners',
  'level-3-intermediate',
  'level-4-advanced',
  'rentalrealities',
  'pro-power-pack',
]);

const decode = (s = '') =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/&#8211;|&#8212;/g, '-')
    .replace(/&#8217;|&#039;|&#39;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&#0?38;|&amp;/g, '&')
    .replace(/&nbsp;|&#160;/g, ' ')
    // any leftover numeric entity
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();

/** Course codes appear in titles as (RS310), RS310 |, RS203/241022 etc. */
function extractCode(title) {
  const patterns = [
    /\(([A-Z]{2,4}\d{2,4})(?:\/\d+)?\)/,   // (RS310) or (RS203/241022)
    /\b([A-Z]{2,4}\d{2,4})\s*\/\s*\d{4,6}\)?/, // RS302/250211, unbalanced parens included
    /\b([A-Z]{2,4}\d{2,4})\s*[|:\-]/,       // RS310 | ...
    /\b(PPP\d)\b/,
    /\b(RTC\s?\d{4})\b/,
  ];
  for (const re of patterns) {
    const m = title.match(re);
    if (m) return m[1].replace(/\s+/g, '');
  }
  return null;
}

// The shop sits behind a WAF that serves an HTML challenge to unfamiliar
// clients, so present as a normal browser and check we actually got JSON.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-ZA,en;q=0.9',
};

async function getJSON(url, attempt = 1) {
  const res = await fetch(url, { headers: HEADERS });
  const body = await res.text();
  const looksHtml = body.trimStart().startsWith('<');
  if (!res.ok || looksHtml) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 4000));
      return getJSON(url, attempt + 1);
    }
    throw new Error(
      looksHtml
        ? `Blocked by the site firewall (HTML challenge instead of JSON) after ${attempt} attempts. ` +
          `If this keeps happening, allowlist the GitHub Actions runner or move this job onto a machine with a South African IP.`
        : `Store API returned ${res.status} after ${attempt} attempts.`
    );
  }
  return JSON.parse(body);
}

async function fetchAll() {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await getJSON(`${API}?per_page=100&page=${page}`);
    if (!batch.length) break;
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

const products = await fetchAll();

const courses = products
  .filter((p) => (p.categories || []).some((c) => TRAINING_CATEGORIES.has(c.slug)))
  .filter((p) => p.permalink && !p.name.toLowerCase().includes('membership'))
  .map((p) => {
    const price = Number(p.prices?.price ?? 0) / 10 ** (p.prices?.currency_minor_unit ?? 2);
    return {
      code: extractCode(decode(p.name)),
      title: decode(p.name),
      price,
      free: price === 0,
      url: p.permalink,
      categories: (p.categories || []).map((c) => c.name),
      short_description: decode(p.short_description).slice(0, 300),
      id: p.id,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

if (courses.length < 10) {
  // Guard: never publish a near-empty list over a good one.
  throw new Error(`Only ${courses.length} courses found; refusing to overwrite.`);
}

const payload = {
  _meta: {
    purpose:
      'Single source of truth for Fundi course answers. Generated from the live catalogue, do not hand-edit.',
    generated: new Date().toISOString().slice(0, 10),
    source: 'rentalsphere.co.za WooCommerce Store API',
    currency: 'ZAR',
    count: courses.length,
    note:
      'Course codes get reused for new courses, so match on url or id, never on code alone.',
  },
  courses,
};

const fs = await import('node:fs/promises');
await fs.mkdir('data', { recursive: true });
await fs.writeFile('data/courses.json', JSON.stringify(payload, null, 2) + '\n');
console.log(`Wrote data/courses.json with ${courses.length} courses.`);
