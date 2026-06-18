/**
 * Deep Production Audit — AvatarX Client
 * Runs in a LIVE (headed) Chromium browser against the Vercel deployment.
 * Captures screenshots, console errors, network failures, performance metrics,
 * accessibility violations, and broken links.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const RESULTS_DIR = path.resolve('audit-results');

// Ensure output directory
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

const report = {
  url: BASE_URL,
  timestamp: new Date().toISOString(),
  pages: [],
  consoleErrors: [],
  networkFailures: [],
  brokenLinks: [],
  performanceMetrics: {},
  securityHeaders: {},
  seoChecks: {},
  accessibilityIssues: [],
  summary: {},
};

async function run() {
  console.log('🚀 Launching LIVE (headed) Chromium browser...');
  const browser = await chromium.launch({
    headless: false,        // LIVE browser — user can see it
    slowMo: 300,            // Slow down for visibility
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'AvatarX-DeepAudit/1.0',
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // ── Collect console errors ──────────────────────────────────────────
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      report.consoleErrors.push({
        text: msg.text(),
        location: msg.location(),
      });
    }
  });

  // ── Collect network failures ────────────────────────────────────────
  page.on('requestfailed', (req) => {
    report.networkFailures.push({
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText || 'unknown',
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1 — Homepage Audit
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📄 Phase 1: Loading Homepage...');
  const homeResponse = await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Screenshot
  await page.screenshot({ path: path.join(RESULTS_DIR, '01_homepage.png'), fullPage: true });
  console.log('  📸 Screenshot saved: 01_homepage.png');

  // HTTP Status
  const homeStatus = homeResponse?.status() || 0;
  console.log(`  📡 HTTP Status: ${homeStatus}`);

  // Security headers
  const headers = homeResponse?.headers() || {};
  report.securityHeaders = {
    'content-security-policy': headers['content-security-policy'] || 'MISSING ⚠️',
    'x-frame-options': headers['x-frame-options'] || 'MISSING ⚠️',
    'x-content-type-options': headers['x-content-type-options'] || 'MISSING ⚠️',
    'strict-transport-security': headers['strict-transport-security'] || 'MISSING ⚠️',
    'referrer-policy': headers['referrer-policy'] || 'MISSING ⚠️',
    'permissions-policy': headers['permissions-policy'] || 'MISSING ⚠️',
  };
  console.log('  🔒 Security headers captured');

  // SEO checks
  const title = await page.title();
  const metaDesc = await page.$eval('meta[name="description"]', el => el.content).catch(() => 'MISSING');
  const h1Count = await page.$$eval('h1', els => els.length);
  const canonicalHref = await page.$eval('link[rel="canonical"]', el => el.href).catch(() => 'MISSING');
  const ogTitle = await page.$eval('meta[property="og:title"]', el => el.content).catch(() => 'MISSING');
  const ogImage = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => 'MISSING');

  report.seoChecks = {
    title: title || 'MISSING',
    metaDescription: metaDesc,
    h1Count,
    h1Warning: h1Count !== 1 ? `⚠️ Expected 1 <h1>, found ${h1Count}` : '✅ OK',
    canonical: canonicalHref,
    ogTitle,
    ogImage,
  };
  console.log(`  🔍 SEO — Title: "${title}" | H1 count: ${h1Count}`);

  // Performance metrics
  const perfTiming = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    if (!perf) return null;
    return {
      domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.startTime),
      loadComplete: Math.round(perf.loadEventEnd - perf.startTime),
      ttfb: Math.round(perf.responseStart - perf.startTime),
      domInteractive: Math.round(perf.domInteractive - perf.startTime),
    };
  });
  report.performanceMetrics = perfTiming || {};
  console.log(`  ⚡ Performance — TTFB: ${perfTiming?.ttfb || '?'}ms | DOMContentLoaded: ${perfTiming?.domContentLoaded || '?'}ms | Load: ${perfTiming?.loadComplete || '?'}ms`);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2 — Broken Link Detection
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n🔗 Phase 2: Checking all <a> links on homepage...');
  const links = await page.$$eval('a[href]', els =>
    els.map(el => ({
      href: el.href,
      text: el.textContent?.trim().substring(0, 50) || '',
    }))
  );

  const uniqueLinks = [...new Map(links.map(l => [l.href, l])).values()];
  console.log(`  Found ${uniqueLinks.length} unique links`);

  for (const link of uniqueLinks.slice(0, 30)) { // Cap at 30 to avoid timeout
    if (link.href.startsWith('mailto:') || link.href.startsWith('tel:') || link.href.startsWith('javascript:')) continue;
    try {
      const resp = await page.request.get(link.href, { timeout: 5000 });
      if (resp.status() >= 400) {
        report.brokenLinks.push({ url: link.href, text: link.text, status: resp.status() });
        console.log(`  ❌ [${resp.status()}] ${link.href}`);
      }
    } catch {
      report.brokenLinks.push({ url: link.href, text: link.text, status: 'TIMEOUT/ERROR' });
      console.log(`  ⚠️ [TIMEOUT] ${link.href}`);
    }
  }
  console.log(`  🔗 Broken links found: ${report.brokenLinks.length}`);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3 — Image Audit
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n🖼️  Phase 3: Auditing images...');
  const imageAudit = await page.$$eval('img', imgs =>
    imgs.map(img => ({
      src: img.src?.substring(0, 100),
      alt: img.alt || 'MISSING ALT ⚠️',
      width: img.naturalWidth,
      height: img.naturalHeight,
      loading: img.loading || 'eager',
      broken: img.naturalWidth === 0 && img.naturalHeight === 0,
    }))
  );

  const brokenImages = imageAudit.filter(i => i.broken);
  const missingAlt = imageAudit.filter(i => i.alt === 'MISSING ALT ⚠️');
  console.log(`  Total images: ${imageAudit.length} | Broken: ${brokenImages.length} | Missing alt: ${missingAlt.length}`);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 4 — Accessibility Audit (basic)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n♿ Phase 4: Basic accessibility audit...');
  const a11yIssues = await page.evaluate(() => {
    const issues = [];

    // Check for missing lang attribute
    if (!document.documentElement.lang) {
      issues.push({ type: 'html-lang', message: 'Missing lang attribute on <html>' });
    }

    // Check for buttons without accessible text
    document.querySelectorAll('button').forEach((btn, i) => {
      const text = btn.textContent?.trim() || btn.getAttribute('aria-label') || btn.getAttribute('title');
      if (!text) {
        issues.push({ type: 'button-no-text', message: `Button #${i} has no accessible text` });
      }
    });

    // Check for inputs without labels
    document.querySelectorAll('input, select, textarea').forEach((input, i) => {
      const id = input.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
      if (!hasLabel && !hasAriaLabel && input.type !== 'hidden') {
        issues.push({ type: 'input-no-label', message: `Input #${i} (type=${input.type}) has no label or aria-label` });
      }
    });

    // Check color contrast on text elements (basic check)
    const lowContrast = [];
    document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, li').forEach((el) => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bg = style.backgroundColor;
      if (color === bg && color !== 'rgba(0, 0, 0, 0)') {
        lowContrast.push(el.tagName);
      }
    });
    if (lowContrast.length > 0) {
      issues.push({ type: 'contrast', message: `${lowContrast.length} elements may have low contrast` });
    }

    // Check for focus visibility
    const focusableElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    issues.push({ type: 'info', message: `${focusableElements.length} focusable elements found` });

    return issues;
  });

  report.accessibilityIssues = a11yIssues;
  console.log(`  ♿ Accessibility issues: ${a11yIssues.filter(i => i.type !== 'info').length}`);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 5 — Key Route Navigation
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n🗺️  Phase 5: Testing key route navigation...');
  const routes = ['/', '/sign-in', '/browse', '/about'];

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const fullUrl = `${BASE_URL}${route}`;
    try {
      const resp = await page.goto(fullUrl, { waitUntil: 'load', timeout: 15000 });
      const status = resp?.status() || 0;
      await page.waitForTimeout(1500);
      const screenshotName = `0${i + 2}_route_${route.replace(/\//g, '_') || 'home'}.png`;
      await page.screenshot({ path: path.join(RESULTS_DIR, screenshotName), fullPage: true });
      report.pages.push({ route, status, screenshot: screenshotName });
      console.log(`  ✅ [${status}] ${route} → ${screenshotName}`);
    } catch (err) {
      report.pages.push({ route, status: 'ERROR', error: err.message });
      console.log(`  ❌ ${route} → ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 6 — Responsive Design Test
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📱 Phase 6: Responsive design checks...');
  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ];

  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(RESULTS_DIR, `responsive_${vp.name}.png`), fullPage: false });
    console.log(`  📐 ${vp.name} (${vp.width}x${vp.height}) → responsive_${vp.name}.png`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  report.summary = {
    totalConsoleErrors: report.consoleErrors.length,
    totalNetworkFailures: report.networkFailures.length,
    totalBrokenLinks: report.brokenLinks.length,
    totalBrokenImages: brokenImages.length,
    totalMissingAltImages: missingAlt.length,
    totalA11yIssues: a11yIssues.filter(i => i.type !== 'info').length,
    totalPagesAudited: report.pages.length,
    imageAudit: {
      total: imageAudit.length,
      broken: brokenImages.length,
      missingAlt: missingAlt.length,
      details: imageAudit.slice(0, 20),
    },
  };

  // Save JSON report
  const reportPath = path.join(RESULTS_DIR, 'audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Full JSON report saved: ${reportPath}`);

  // Print summary
  console.log('\n══════════════════════════════════════════════');
  console.log('  🔎 DEEP AUDIT SUMMARY');
  console.log('══════════════════════════════════════════════');
  console.log(`  URL:                  ${BASE_URL}`);
  console.log(`  HTTP Status:          ${homeStatus}`);
  console.log(`  Title:                "${title}"`);
  console.log(`  Console Errors:       ${report.consoleErrors.length}`);
  console.log(`  Network Failures:     ${report.networkFailures.length}`);
  console.log(`  Broken Links:         ${report.brokenLinks.length}`);
  console.log(`  Broken Images:        ${brokenImages.length}`);
  console.log(`  Missing Alt Text:     ${missingAlt.length}`);
  console.log(`  A11y Issues:          ${a11yIssues.filter(i => i.type !== 'info').length}`);
  console.log(`  TTFB:                 ${perfTiming?.ttfb || '?'}ms`);
  console.log(`  DOMContentLoaded:     ${perfTiming?.domContentLoaded || '?'}ms`);
  console.log(`  Full Load:            ${perfTiming?.loadComplete || '?'}ms`);
  console.log('══════════════════════════════════════════════');

  console.log('\n✅ Audit complete. Closing browser in 5s...');
  await page.waitForTimeout(5000);
  await browser.close();
}

run().catch((err) => {
  console.error('💥 Audit failed:', err);
  process.exit(1);
});
