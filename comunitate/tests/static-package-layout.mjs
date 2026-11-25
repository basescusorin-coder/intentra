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
  '/comunitate/rules.html', '/comunitate/joburi/', '/contact/', '/joburi/'];
const widths = [320, 390, 768, 1440];
const failures = [];

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
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
        failures.push(`${route}: horizontal overflow at ${width}px (${dimensions.scrollWidth}px)`);
      }
    }
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
