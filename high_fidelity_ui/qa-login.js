const { chromium } = require('playwright');
const path = require('path');

const fileUrl = name => `file://${path.resolve(__dirname, name)}`;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chromium.executablePath() });
  const consoleErrors = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => consoleErrors.push(error.message));

  await page.goto(fileUrl('login.html'));
  await page.click('#one-click');
  assert(await page.locator('#consent-modal').isVisible(), '本机一键登录未弹出协议确认');
  await page.click('#consent-confirm');
  await page.waitForURL(/login-sync\.html\?source=local$/);

  await page.goto(fileUrl('login.html'));
  await page.click('#other-login');
  await page.waitForURL(/login-phone\.html$/);
  await page.fill('#phone', '13800138000');
  await page.fill('#code', '123456');
  await page.click('#submit');
  assert(await page.locator('#consent-modal').isVisible(), '手机号登录未在提交时弹出协议确认');
  await page.click('#consent-confirm');
  await page.waitForURL(/login-sync\.html\?source=phone$/);

  await page.click('#start-scan');
  assert(await page.locator('#permission-modal').isVisible(), '开始扫描未弹出通讯录权限确认');
  assert(await page.locator('.permission-mark').count() === 0, '通讯录权限弹窗仍包含顶部图标');
  const permissionStyle = await page.locator('.permission-card').evaluate(element => {
    const style = getComputedStyle(element);
    const buttonStyle = getComputedStyle(element.querySelector('.permission-actions button'));
    return {
      width: element.getBoundingClientRect().width,
      borderRadius: style.borderRadius,
      padding: style.padding,
      buttonHeight: buttonStyle.height,
      buttonRadius: buttonStyle.borderRadius
    };
  });
  assert(Math.round(permissionStyle.width) === 350, '通讯录权限弹窗宽度未与协议弹窗统一');
  assert(permissionStyle.borderRadius === '20px', '通讯录权限弹窗圆角未与协议弹窗统一');
  assert(permissionStyle.padding === '22px 20px 20px', '通讯录权限弹窗内边距未与协议弹窗统一');
  assert(permissionStyle.buttonHeight === '44px' && permissionStyle.buttonRadius === '22px', '通讯录权限弹窗按钮未与协议弹窗统一');
  await page.click('#deny');
  assert(await page.locator('#start-scan').textContent() === '重新开启权限', '拒绝权限后的恢复入口不正确');

  await page.click('#start-scan');
  await page.click('#allow');
  await page.waitForURL(/index\.html#screen-01$/);
  await page.locator('#toast.show').waitFor({ state: 'visible' });
  assert((await page.locator('#toast-copy').textContent()).trim() === '登录成功', '允许权限进入首页后未提示登录成功');

  await page.goto(`${fileUrl('login-sync.html')}?source=local`);
  await page.click('#later');
  await page.waitForURL(/index\.html\?state=empty#screen-01$/);
  await page.locator('#toast.show').waitFor({ state: 'visible' });
  assert((await page.locator('#toast-copy').textContent()).trim() === '登录成功', '稍后再说进入首页后未提示登录成功');

  await page.goto(`${fileUrl('login-sync.html')}?permission=error`);
  await page.click('#start-scan');
  await page.click('#allow');
  await page.waitForTimeout(1000);
  assert(await page.locator('#start-scan').textContent() === '重新扫描', '通讯录读取错误后的重试入口不正确');

  await page.goto(fileUrl('login-phone.html'));
  const phoneBackground = await page.locator('.page').evaluate(element => getComputedStyle(element).backgroundImage);
  await page.goto(`${fileUrl('login-sync.html')}?mode=enabled&sync=enabled`);
  const syncBackground = await page.locator('.device').evaluate(element => getComputedStyle(element).backgroundImage);
  assert(phoneBackground === syncBackground && syncBackground.includes('bg.png'), '同步页背景素材未与手机号登录页保持一致');
  assert(await page.locator('#start-scan').evaluate(element => getComputedStyle(element).backgroundColor) === 'rgb(255, 255, 255)', '取消同步按钮不是白色背景');
  await page.click('#start-scan');
  await page.click('#later');
  await page.waitForURL(/index\.html\?sync=disabled#screen-08$/);
  assert((await page.locator('#sync-setting .value').innerText()).trim() === '未开启', '同步关闭状态未回写到我的页面');

  for (const width of [375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(fileUrl('login-sync.html'));
    const metrics = await page.locator('.device').evaluate(element => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      scrollWidth: element.scrollWidth
    }));
    assert(Math.round(metrics.width) === width, `${width}px 视口下设备宽度错误`);
    assert(Math.round(metrics.height) === 844, `${width}px 视口下设备高度错误`);
    assert(metrics.scrollWidth <= width, `${width}px 视口存在横向溢出`);
    const trustStyle = await page.locator('.trust-item').first().evaluate(element => {
      const style = getComputedStyle(element);
      return { borderWidth: style.borderWidth, boxShadow: style.boxShadow };
    });
    assert(trustStyle.borderWidth === '0px' && trustStyle.boxShadow === 'none', `${width}px 下同步说明卡片仍有描边或投影`);
    const layout = await page.evaluate(() => ({
      introTop: getComputedStyle(document.querySelector('.intro')).top,
      listTop: getComputedStyle(document.querySelector('.trust-list')).top,
      actionsTop: getComputedStyle(document.querySelector('.actions')).top
    }));
    assert(layout.introTop === '216px' && layout.listTop === '320px' && layout.actionsTop === '540px', `${width}px 下正文未整体上移 30px`);
  }

  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto(fileUrl('login-sync.html'));
  await page.locator('#start-scan').scrollIntoViewIfNeeded();
  assert(await page.locator('#start-scan').isVisible(), '640px 高度下主操作无法滚动到可见区域');

  assert(consoleErrors.length === 0, `浏览器控制台存在错误：${consoleErrors.join(' | ')}`);
  await browser.close();
  process.stdout.write('登录与首次通讯录授权链路 QA 通过：本机登录、手机号登录、协议确认、允许、拒绝、稍后进入首页、登录成功提示、加载、错误、375px、390px。\n');
})();
