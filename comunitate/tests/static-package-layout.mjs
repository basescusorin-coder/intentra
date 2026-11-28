import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE);
const root = path.resolve('site-release');
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript'],
  ['.mjs', 'text/javascript'], ['.css', 'text/css'], ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'], ['.webp', 'image/webp'], ['.ico', 'image/x-icon'],
  ['.xml', 'application/xml'], ['.txt', 'text/plain'],
]);

const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/') pathname = '/index.html';
    let file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': mime.get(path.extname(file)) ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

const routes = ['/', '/comunitate/', '/comunitate/privacy.html',
  '/comunitate/rules.html', '/comunitate/terms.html',
  '/comunitate/joburi/', '/contact/', '/joburi/'];
const widths = [320, 390, 768, 1440];
const failures = [];

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {}),
});
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: widths[0], height: 900 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const response = await page.goto(base + route, { waitUntil: 'networkidle' });
    if (response?.status() !== 200) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      if (dimensions.scrollWidth > dimensions.width + 1) {
        const offenders = await page.evaluate(() => ({
          viewport: innerWidth,
          html: { width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth },
          body: { width: document.body.clientWidth, scroll: document.body.scrollWidth,
            rect: Math.round(document.body.getBoundingClientRect().width),
            minWidth: getComputedStyle(document.body).minWidth,
            padding: getComputedStyle(document.body).padding },
          elements: [...document.querySelectorAll('body *')].map(element => {
            const rect = element.getBoundingClientRect();
            return { tag: element.tagName, id: element.id, className: String(element.className).slice(0, 80),
              left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width),
              client: element.clientWidth, scroll: element.scrollWidth,
              position: getComputedStyle(element).position, whiteSpace: getComputedStyle(element).whiteSpace,
              text: (element.textContent ?? '').trim().slice(0, 60) };
          }).filter(item => (item.width > 0 && (item.left < -1 || item.right > innerWidth + 1)) ||
            item.scroll > item.client + 1).slice(0, 12),
          textNodes: (() => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            const out = [];
            while (walker.nextNode()) {
              const node = walker.currentNode;
              if (!node.textContent.trim() || !node.parentElement.getClientRects().length) continue;
              const range = document.createRange(); range.selectNodeContents(node);
              const rects = [...range.getClientRects()];
              for (const rect of rects) if (rect.right > innerWidth + 1 || rect.left < -1) {
                out.push({ text: node.textContent.trim().slice(0, 100), right: Math.round(rect.right),
                  parent: node.parentElement.tagName + '.' + String(node.parentElement.className).slice(0, 50) });
              }
            }
            return out.slice(0, 12);
          })()
        }));
        failures.push(`${route}: horizontal overflow at ${width}px (${dimensions.scrollWidth}px): ${JSON.stringify(offenders)}`);
      }
    }
    const accessibilityIssues = await page.evaluate(() => {
      const issues = [];
      if (!document.documentElement.lang) issues.push('document language is missing');
      for (const image of document.querySelectorAll('img')) {
        if (!image.hasAttribute('alt')) issues.push('image missing alt text');
      }
      for (const element of document.querySelectorAll('a,button,input,select,textarea')) {
        if (!element.getClientRects().length || getComputedStyle(element).visibility === 'hidden') continue;
        const name = element.getAttribute('aria-label') || element.getAttribute('title') ||
          element.innerText?.trim() || [...(element.labels ?? [])].map(label => label.innerText.trim()).join(' ').trim() ||
          [...(element.querySelectorAll?.('img[alt]') ?? [])].map(image => image.alt).join(' ').trim();
        if (!name) issues.push(element.tagName.toLowerCase() + ' has no accessible name');
        if (/^(INPUT|SELECT|TEXTAREA)$/.test(element.tagName) &&
            !element.getAttribute('aria-label') && !element.labels?.length) {
          issues.push(element.tagName.toLowerCase() + ' has no associated label');
        }
      }
      return [...new Set(issues)].slice(0, 12);
    });
    if (accessibilityIssues.length) failures.push(`${route}: accessibility smoke check: ${accessibilityIssues.join('; ')}`);
    if (pageErrors.length) failures.push(`${route}: ${pageErrors.join('; ')}`);
    console.log(`${response?.status() === 200 ? 'PASS' : 'FAIL'} ${route} — 320/390/768/1440px`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: staging routes render without horizontal overflow or uncaught JavaScript errors.');
}
