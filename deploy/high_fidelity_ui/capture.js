const { chromium } = require('playwright');
const path = require('path');

const fileUrl = (name, query = '', hash = '') =>
  `file://${path.resolve(__dirname, name)}${query}${hash}`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const names = [
    '联系人首页',
    '联系人详情',
    '新增编辑联系人',
    '重复联系人扫描结果',
    '字段级合并确认',
    '合并完成与撤销',
    '分享名片设置',
    '个人中心设置'
  ];

  const captureBusiness = async (hash, fileName, query = '', action) => {
    const page = await browser.newPage({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 2
    });
    await page.goto(fileUrl('index.html', query, hash));
    await page.waitForTimeout(320);
    if (action) await action(page);
    await page.locator('.device').screenshot({
      path: path.resolve(__dirname, fileName)
    });
    const metrics = await page.locator('.device').evaluate(element => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      activeScrollWidth: element.querySelector('.screen.active .scroll')?.scrollWidth || 0
    }));
    if (Math.round(metrics.width) !== 375 || Math.round(metrics.height) !== 812 || metrics.activeScrollWidth > 375) {
      throw new Error(`Unexpected business layout: ${JSON.stringify(metrics)}`);
    }
    await page.close();
  };

  for (let i = 1; i <= 8; i += 1) {
    const number = String(i).padStart(2, '0');
    await captureBusiness(
      `#screen-${number}`,
      `${number}_${names[i - 1]}.png`
    );
  }

  await captureBusiness('#screen-01', '10_联系人空状态.png', '?state=empty');
  await captureBusiness('#screen-04', '10_排重扫描加载状态.png', '?state=loading');
  await captureBusiness('#screen-04', '10_排重错误状态.png', '?state=error');
  await captureBusiness('#screen-08', '10_权限拒绝状态.png', '?state=permission-denied');
  await captureBusiness('#screen-08', '11_我的设置.png', '', async page => {
    await page.click('#settings-entry');
    await page.waitForTimeout(260);
  });
  await captureBusiness('#screen-08', '15_账号设置.png', '', async page => {
    await page.click('#settings-entry');
    await page.waitForTimeout(260);
    await page.locator('#delete-account').scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
  });
  for (const [type, fileName] of [
    ['merge', '12_合并记录.png'],
    ['share', '13_分享管理.png'],
    ['trash', '14_回收站.png']
  ]) {
    await captureBusiness('#screen-08', fileName, '', async page => {
      await page.click(`[data-my-view="${type}"]`);
      await page.waitForTimeout(260);
    });
  }
  await captureBusiness('#screen-06', '10_合并撤销状态.png');
  await captureBusiness('#screen-01', '名络_高保真UI_总览.png');

  const captureLoginSync = async (width, fileName, query = '') => {
    const page = await browser.newPage({
      viewport: { width, height: 844 },
      deviceScaleFactor: 2
    });
    await page.goto(fileUrl('login-sync.html', query));
    await page.locator('.device').screenshot({
      path: path.resolve(__dirname, fileName)
    });
    await page.close();
  };

  await captureLoginSync(390, '09_首次登录通讯录同步.png');
  await captureLoginSync(375, '09_首次登录通讯录同步_375.png');
  await captureLoginSync(390, '09_通讯录权限加载状态.png', '?permission=loading');
  await captureLoginSync(390, '09_通讯录权限拒绝状态.png', '?permission=denied');
  await captureLoginSync(390, '09_通讯录权限错误状态.png', '?permission=error');

  const permission = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  await permission.goto(fileUrl('login-sync.html'));
  await permission.click('#start-scan');
  await permission.locator('.device').screenshot({
    path: path.resolve(__dirname, '09_通讯录权限确认状态.png')
  });
  await permission.close();
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
