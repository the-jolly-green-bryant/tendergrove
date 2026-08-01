import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const source = path.join(
  root,
  'pwa',
  'store',
  'google-play',
  'source',
  'grove-live-dashboard.jpg',
)
const output = path.join(
  root,
  'pwa',
  'store',
  'google-play',
  'phone-screenshots',
  '01-household-live.png',
)

const imageUrl = `data:image/png;base64,${fs.readFileSync(source).toString('base64')}`
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
})

await page.setContent(`
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; }
        html, body {
          width: 1080px;
          height: 1920px;
          margin: 0;
          overflow: hidden;
        }
        body {
          position: relative;
          background: #fbf8f0;
          color: #174434;
          font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .accent {
          position: absolute;
          border-radius: 999px;
          background: #d8e9df;
        }
        .accent.top { width: 330px; height: 330px; right: -105px; top: -84px; }
        .accent.bottom { width: 310px; height: 310px; left: -180px; bottom: -92px; }
        .eyebrow {
          position: absolute;
          left: 72px;
          top: 72px;
          width: 112px;
          height: 20px;
          border-radius: 20px;
          background: #638d76;
        }
        h1 {
          position: absolute;
          left: 72px;
          top: 130px;
          width: 780px;
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 72px;
          line-height: .94;
          letter-spacing: -2px;
          font-weight: 700;
        }
        p {
          position: absolute;
          left: 74px;
          top: 304px;
          margin: 0;
          color: #587064;
          font-size: 31px;
          line-height: 1.25;
          font-weight: 700;
        }
        .device {
          position: absolute;
          left: 100px;
          top: 500px;
          width: 880px;
          height: 1070px;
          padding: 20px;
          overflow: hidden;
          border-radius: 50px;
          background: #f2eff7;
          box-shadow: 0 28px 70px rgba(31, 60, 47, .17);
        }
        .screen {
          position: relative;
          width: 840px;
          height: 1030px;
          overflow: hidden;
          border-radius: 36px;
          background: white;
        }
        .screen img {
          position: absolute;
          width: 951px;
          height: 2059px;
          max-width: none;
          left: -37px;
          top: -402px;
        }
        .authentic {
          position: absolute;
          left: 100px;
          top: 1600px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #557065;
          font-size: 21px;
          font-weight: 650;
        }
        .authentic span {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #5b8d72;
          box-shadow: 0 0 0 6px #e2efe8;
        }
      </style>
    </head>
    <body>
      <div class="accent top"></div>
      <div class="accent bottom"></div>
      <div class="eyebrow"></div>
      <h1>A clearer view of<br>the whole household</h1>
      <p>See today's wellbeing at a glance.</p>
      <div class="device">
        <div class="screen">
          <img src="${imageUrl}" alt="Grove household wellbeing dashboard">
        </div>
      </div>
      <div class="authentic"><span></span>Real household view from the Grove app</div>
    </body>
  </html>
`)

await page.screenshot({ path: output, type: 'png' })
await browser.close()
console.log(output)
