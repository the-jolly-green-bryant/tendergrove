/**
 * Render the design-overview.html to a single PNG using Playwright.
 */
import { chromium } from 'playwright'
import * as path from 'path'

const HTML_PATH = path.join(__dirname, '..', 'docs', 'design-overview.html')
const OUTPUT_PATH = path.join(__dirname, '..', 'docs', 'design-overview.png')

async function combine() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1800, height: 1200 },
    deviceScaleFactor: 2,
  })

  await page.goto(`file://${HTML_PATH}`, { waitUntil: 'load' })
  await page.waitForTimeout(1000)

  await page.screenshot({ path: OUTPUT_PATH, fullPage: true })
  await browser.close()

  console.log(`✅ Combined design overview saved to: ${OUTPUT_PATH}`)
}

combine().catch((err) => {
  console.error('Combine failed:', err)
  process.exit(1)
})
