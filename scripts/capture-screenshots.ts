/**
 * Capture screenshots of all app pages and combine into a design overview.
 *
 * Run with: npx tsx scripts/capture-screenshots.ts
 *
 * Prerequisites:
 *   - Dev server running on localhost:8200
 *   - Playwright + Chromium installed
 *   - Auth temporarily bypassed in App.tsx
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:8200';
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const COMBINED_OUTPUT = path.join(__dirname, '..', 'docs', 'design-overview.png');

// Mobile viewport (iPhone-ish)
const VIEWPORT = { width: 390, height: 844 };

// Pages to capture — static routes that render without dynamic params
const PAGES: { name: string; path: string; waitMs?: number }[] = [
  { name: '01-login', path: '/', waitMs: 2000 },
  { name: '02-household-dashboard', path: '/dashboard', waitMs: 2000 },
  { name: '03-timeline', path: '/check-in', waitMs: 2000 },
  { name: '04-checkin-wizard', path: '/check-in/wizard', waitMs: 2000 },
  { name: '05-insights', path: '/reports', waitMs: 2000 },
  { name: '06-reports-export', path: '/reports/export', waitMs: 2000 },
  { name: '07-add-person', path: '/people/new', waitMs: 2000 },
  { name: '08-archived-people', path: '/archived', waitMs: 2000 },
];

async function captureScreenshots() {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));

  const captured: string[] = [];

  for (const screen of PAGES) {
    const filePath = path.join(OUTPUT_DIR, `${screen.name}.png`);
    console.log(`  📸 Capturing ${screen.name} (${screen.path})...`);

    try {
      await page.goto(`${BASE_URL}${screen.path}`, {
        waitUntil: 'networkidle',
        timeout: 15000,
      });
    } catch {
      // networkidle may timeout due to API calls — that's fine, page is rendered
      console.log(`    ⚠ Network didn't fully settle, capturing anyway...`);
    }

    // Extra wait for animations/rendering
    await page.waitForTimeout(screen.waitMs ?? 1500);

    await page.screenshot({ path: filePath, fullPage: false });
    captured.push(filePath);
    console.log(`    ✓ Saved ${filePath}`);
  }

  await browser.close();
  console.log(`\n✅ Captured ${captured.length} screenshots in ${OUTPUT_DIR}`);

  // Combine into a grid using sips + ImageMagick or built-in tools
  combineScreenshots(captured);
}

function combineScreenshots(files: string[]) {
  console.log('\n🖼  Combining screenshots into design overview...');

  // Check if ImageMagick is available
  try {
    execSync('which magick || which convert', { stdio: 'pipe' });
  } catch {
    console.log('⚠ ImageMagick not found. Trying sips-based approach...');
    combineWithSips(files);
    return;
  }

  // Use ImageMagick montage to create a grid
  const cols = 4;
  const fileList = files.map((f) => `"${f}"`).join(' ');

  try {
    const cmd = `magick montage ${fileList} -tile ${cols}x -geometry 390x844+20+20 -background '#f5f5f5' -border 2 -bordercolor '#e0e0e0' -title "Tendergrove – Current Design (${new Date().toISOString().slice(0, 10)})" "${COMBINED_OUTPUT}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log(`\n✅ Design overview saved to: ${COMBINED_OUTPUT}`);
  } catch (err) {
    console.log('⚠ montage failed, trying simpler approach...');
    combineWithSips(files);
  }
}

function combineWithSips(files: string[]) {
  // Fallback: just create a simple HTML file that shows all screenshots
  const htmlPath = path.join(path.dirname(COMBINED_OUTPUT), 'design-overview.html');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tendergrove – Design Overview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f5;
      padding: 40px;
      margin: 0;
    }
    h1 {
      text-align: center;
      color: #5C7A5E;
      margin-bottom: 8px;
    }
    .date {
      text-align: center;
      color: #888;
      margin-bottom: 32px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      max-width: 1800px;
      margin: 0 auto;
    }
    .screen {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .screen img {
      width: 100%;
      display: block;
    }
    .screen .label {
      padding: 12px;
      text-align: center;
      font-weight: 600;
      color: #333;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <h1>🌿 Tendergrove – Current Design</h1>
  <p class="date">Generated: ${new Date().toISOString().slice(0, 10)}</p>
  <div class="grid">
    ${files
      .map((f) => {
        const name = path.basename(f, '.png').replace(/^\d+-/, '').replace(/-/g, ' ');
        const relPath = path.relative(path.dirname(htmlPath), f);
        return `<div class="screen">
      <img src="${relPath}" alt="${name}">
      <div class="label">${name}</div>
    </div>`;
      })
      .join('\n    ')}
  </div>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html);
  console.log(`\n✅ Design overview HTML saved to: ${htmlPath}`);
  console.log(`   Open it in a browser to view all screens.`);

  // Also try to use sips to create a combined PNG
  try {
    // Create a simple combined image using canvas approach
    console.log(`\n💡 Individual screenshots are in: ${path.dirname(files[0])}`);
    console.log(`   You can share the HTML file or the individual PNGs.`);
  } catch {
    // ignore
  }
}

captureScreenshots().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
