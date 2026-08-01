import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const storeDir = path.join(root, 'pwa', 'store', 'google-play')
const pngDataUrl = (filePath) =>
  `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`
const background = pngDataUrl(
  path.join(storeDir, 'source', 'feature-background.png'),
)
const wordmark = pngDataUrl(
  path.join(root, 'pwa', 'public', 'assets', 'brand', 'grove-wordmark.png'),
)

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({
  viewport: { width: 1024, height: 500 },
  deviceScaleFactor: 1,
})

await page.setContent(`
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; }
        html, body { width: 1024px; height: 500px; margin: 0; overflow: hidden; }
        body {
          position: relative;
          background: #fbf6ea url("${background}") center / cover no-repeat;
          color: #173e2d;
          font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        main {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          width: 53%;
          padding: 54px 0 54px 70px;
        }
        img { width: 255px; height: auto; margin-bottom: 26px; }
        h1 {
          max-width: 480px;
          margin: 0;
          font-size: 47px;
          line-height: 1.04;
          letter-spacing: -1.8px;
          font-weight: 760;
        }
        p {
          max-width: 430px;
          margin: 19px 0 0;
          color: #49685a;
          font-size: 21px;
          line-height: 1.35;
          font-weight: 520;
        }
      </style>
    </head>
    <body>
      <main>
        <img src="${wordmark}" alt="Grove">
        <h1>See the pattern.<br>Support the person.</h1>
        <p>Quick family check-ins become clearer, care-ready conversations.</p>
      </main>
    </body>
  </html>
`)

await page.screenshot({
  path: path.join(storeDir, 'feature-graphic.png'),
  type: 'png',
})
await browser.close()

console.log(path.join(storeDir, 'feature-graphic.png'))
