const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1
  });
  await page.goto(`file://${path.resolve(__dirname, 'index.html')}#screen-08`);
  await page.waitForTimeout(350);
  await page.screenshot({
    path: path.resolve(__dirname, 'design-qa-my-implementation.png')
  });
  const comparison = await browser.newPage({
    viewport: { width: 816, height: 898 },
    deviceScaleFactor: 1
  });
  await comparison.goto(`file://${path.resolve(__dirname, 'design-qa-my-comparison.html')}`);
  await comparison.waitForTimeout(120);
  await comparison.screenshot({
    path: path.resolve(__dirname, 'design-qa-my-comparison.png')
  });
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
