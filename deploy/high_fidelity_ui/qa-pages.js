const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const fileUrl = (query = '', hash = '') =>
  `file://${path.resolve(__dirname, 'index.html')}${query}${hash}`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const checks = [];

  const run = async (name, task) => {
    try {
      await task();
      checks.push(name);
      console.log(`✓ ${name}`);
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
      console.error(`✗ ${name}\n  ${error.message}`);
    }
  };

  await run('深链与八页可访问', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    for (let i = 1; i <= 8; i += 1) {
      const id = `screen-${String(i).padStart(2, '0')}`;
      await page.goto(fileUrl('', `#${id}`));
      await page.waitForTimeout(30);
      assert(await page.locator(`#${id}`).evaluate(el => el.classList.contains('active')));
    }
    await page.close();
  });

  await run('底部 Tab 切换会立即隐藏上一页', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(fileUrl('', '#screen-08'));
    const state = await page.locator('#screen-08 .tab[data-go="screen-01"]').evaluate(button => {
      button.click();
      const previous = document.querySelector('#screen-08');
      const next = document.querySelector('#screen-01');
      return {
        previousActive: previous.classList.contains('active'),
        previousBehind: previous.classList.contains('behind'),
        previousVisibility: getComputedStyle(previous).visibility,
        nextActive: next.classList.contains('active')
      };
    });
    assert.deepStrictEqual(state, {
      previousActive: false,
      previousBehind: false,
      previousVisibility: 'hidden',
      nextActive: true
    });
    await page.close();
  });

  await run('所有页面状态栏与导航栏随滚动同步渐变', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    for (let i = 1; i <= 8; i += 1) {
      const id = `screen-${String(i).padStart(2, '0')}`;
      await page.goto(fileUrl('', `#${id}`));
      const scroll = page.locator(`#${id} > .scroll`);
      assert.strictEqual(await page.locator('.statusbar').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(255, 255, 255, 0)');
      await scroll.evaluate(el => {
        el.style.paddingBottom = '1200px';
        el.scrollTop = 80;
        el.dispatchEvent(new Event('scroll'));
      });
      await page.waitForTimeout(30);
      assert.strictEqual(await page.locator('.statusbar').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
      const toolbar = page.locator(`#${id} .navbar`).first();
      if (await toolbar.count()) {
        assert.strictEqual(await toolbar.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
      }
    }
    await page.close();
  });

  await run('首页搜索、详情、编辑和分享链路', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(fileUrl('', '#screen-01'));
    await page.fill('#contact-search', '白若云');
    assert.strictEqual(await page.locator('.contact-row').count(), 1);
    assert((await page.locator('.contact-row').innerText()).includes('白若云'));
    await page.locator('.contact-row').first().click();
    assert(await page.locator('#screen-02').evaluate(el => el.classList.contains('active')));
    assert.strictEqual(await page.locator('#screen-02 .profile-name').innerText(), '白若云');
    assert((await page.locator('#screen-02 .profile-role').innerText()).includes('远景设计'));
    await page.click('[data-mode="edit"]');
    await page.fill('#name-input', '');
    await page.click('#save-contact');
    assert(await page.locator('#name-error').evaluate(el => el.classList.contains('show')));
    await page.fill('#name-input', '王小明');
    await page.click('#save-contact');
    await page.waitForTimeout(750);
    assert(await page.locator('#screen-02').evaluate(el => el.classList.contains('active')));
    await page.click('#screen-02 [data-go="screen-07"]');
    assert.strictEqual(await page.locator('#visibility-list .locked').count(), 0);
    assert(!(await page.locator('#visibility-list').innerText()).includes('名片基础信息'));
    assert.strictEqual(await page.locator('#screen-07 .navbar .nav-title').evaluate(el => getComputedStyle(el).fontSize), '18px');
    assert.strictEqual(await page.locator('#screen-07 .share-preview').evaluate(el => getComputedStyle(el).paddingLeft), '16px');
    const actionWidths = await page.locator('#screen-07 .button-row .button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().width));
    assert(Math.abs(actionWidths[0] - actionWidths[1]) < 0.5);
    assert.strictEqual(await page.locator('#copy-link > svg').count(), 1);
    assert.strictEqual(await page.locator('#share-wechat > svg').count(), 1);
    const before = await page.locator('#share-preview-meta').innerText();
    await page.click('[data-field="email"]');
    const after = await page.locator('#share-preview-meta').innerText();
    assert.notStrictEqual(before, after);
    await page.close();
  });

  await run('联系人详情按列表数据渲染并支持删除', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(fileUrl('', '#screen-01'));
    await page.fill('#contact-search', '包国华');
    await page.locator('.contact-row').click();
    assert.strictEqual(await page.locator('#screen-02 .profile-name').innerText(), '包国华');
    assert((await page.locator('#detail-fields').innerText()).includes('bao@hengxin-logistics.cn'));
    await page.click('[data-mode="edit"]');
    assert(await page.locator('#delete-contact').isVisible());
    assert.strictEqual(await page.locator('#delete-contact').evaluate(el => getComputedStyle(el).color), 'rgb(245, 63, 63)');
    await page.click('#delete-contact');
    assert.strictEqual(await page.locator('#dialog-title').innerText(), '确认删除该联系人？');
    await page.click('#dialog-confirm');
    assert(await page.locator('#screen-01').evaluate(el => el.classList.contains('active')));
    assert(!(await page.locator('#home-content').innerText()).includes('包国华'));
    await page.close();
  });

  await run('详情快捷操作、滚动导航和跳过返回', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(fileUrl('', '#screen-02'));
    const navBefore = await page.locator('#screen-02 .navbar').evaluate(el => getComputedStyle(el).backgroundColor);
    await page.locator('#screen-02 .scroll').evaluate(el => {
      el.scrollTop = 80;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(40);
    const navAfter = await page.locator('#screen-02 .navbar').evaluate(el => getComputedStyle(el).backgroundColor);
    assert.notStrictEqual(navBefore, navAfter);

    await page.click('#detail-call');
    assert((await page.locator('#dialog-title').innerText()).includes('拨打电话'));
    assert((await page.locator('#dialog-confirm').innerText()).includes('010 6255 8899'));
    await page.click('#dialog-confirm');

    await page.click('#detail-message');
    assert((await page.locator('#dialog-title').innerText()).includes('短信'));
    await page.click('#dialog-cancel');

    await page.click('#detail-email');
    assert.strictEqual(await page.locator('#dialog-title').innerText(), '确认邮箱');
    await page.click('#dialog-cancel');

    await page.click('#screen-02 .notice');
    assert(await page.locator('#screen-05').evaluate(el => el.classList.contains('active')));
    await page.click('#merge-skip');
    assert((await page.locator('#dialog-title').innerText()).includes('跳过'));
    await page.click('#dialog-confirm');
    assert(await page.locator('#screen-02').evaluate(el => el.classList.contains('active')));
    assert.strictEqual(await page.locator('#screen-02 .notice').count(), 0);
    await page.close();
  });

  await run('首页字母定位、收拢搜索和系统消息', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(fileUrl('', '#screen-01'));
    await page.locator('#home-content').evaluate(el => { el.style.paddingBottom = '300px'; });
    await page.click('#alpha-index [data-letter="B"]');
    await page.waitForTimeout(350);
    assert((await page.locator('#screen-01 > .scroll').evaluate(el => el.scrollTop)) > 0);
    assert(await page.locator('#screen-01').evaluate(el => el.classList.contains('is-scrolled')));
    await page.click('#compact-search');
    await page.waitForTimeout(260);
    assert(await page.locator('#contact-search').evaluate(el => el === document.activeElement));
    await page.click('#open-messages');
    assert(await page.locator('#message-subview').evaluate(el => el.classList.contains('open')));
    assert.strictEqual(await page.locator('#screen-01').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.notStrictEqual(await page.locator('#device').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
    assert.strictEqual(await page.locator('#message-subview').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
    assert((await page.locator('#message-subview').textContent()).includes('通讯录同步完成'));
    assert.strictEqual(await page.locator('#message-badge').innerText(), '2');
    await page.click('[data-message="sync"]');
    assert.strictEqual(await page.locator('#message-badge').innerText(), '1');
    assert(await page.locator('#message-detail').evaluate(el => el.classList.contains('open')));
    assert.strictEqual(await page.locator('#message-detail-heading').textContent(), '通讯录同步完成');
    assert.strictEqual((await page.locator('#message-detail-time').textContent()).trim(), '');
    const syncMessage = page.locator('#message-subview .message-card[data-message="sync"]');
    assert.strictEqual(await syncMessage.locator('.message-card-foot').evaluate(foot => getComputedStyle(foot).borderTopWidth), '0px');
    assert.strictEqual(await syncMessage.locator('.message-card-foot').evaluate(foot => getComputedStyle(foot, '::before').left), '14px');
    assert.strictEqual(await syncMessage.locator('.message-card-foot .chevron').evaluate(icon => getComputedStyle(icon).width), '12px');
    assert.strictEqual(await page.locator('#mark-all-read').evaluate(button => getComputedStyle(button).fontSize), '14px');
    await page.click('#close-message-detail');
    assert(!(await page.locator('#message-detail').evaluate(el => el.classList.contains('open'))));
    await page.click('#mark-all-read');
    assert(await page.locator('#message-badge').evaluate(el => el.classList.contains('hidden')));
    assert.strictEqual(await page.locator('.message-card.unread').count(), 0);
    await page.waitForTimeout(320);
    await page.click('#close-messages');
    assert(!(await page.locator('#message-subview').evaluate(el => el.classList.contains('open'))));
    await page.close();
  });

  await run('新增联系人、多号码和重复确认', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(fileUrl('', '#screen-01'));
    await page.click('[data-mode="new"]');
    assert.strictEqual(await page.locator('#name-input').getAttribute('placeholder'), '输入联系人姓名');
    assert.strictEqual(await page.locator('#company-input').getAttribute('placeholder'), '输入公司名称');
    assert.strictEqual(await page.locator('.phone-input').getAttribute('placeholder'), '输入电话号码');
    assert.strictEqual(await page.locator('#delete-contact').isVisible(), false);
    assert.strictEqual(await page.locator('.phone-card-head .field-label').count(), 0);
    await page.fill('#name-input', '测试联系人');
    await page.fill('.phone-input', '13800138000');
    await page.click('#add-phone');
    assert.strictEqual(await page.locator('.phone-input').count(), 2);
    await page.locator('.remove-phone').last().click();
    assert.strictEqual(await page.locator('.phone-input').count(), 1);
    await page.click('#save-contact');
    assert(await page.locator('#dialog-overlay').evaluate(el => el.classList.contains('show')));
    assert((await page.locator('#dialog-title').innerText()).includes('相似联系人'));
    await page.click('#dialog-confirm');
    assert(await page.locator('#screen-05').evaluate(el => el.classList.contains('active')));
    await page.close();
  });

  await run('排重、字段选择、合并加载和返回链路', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(fileUrl('', '#screen-04'));
    assert.strictEqual(await page.locator('#screen-04 .navbar .nav-title').evaluate(el => getComputedStyle(el).fontSize), '18px');
    assert.strictEqual(await page.locator('#rescan img').getAttribute('src'), '../icon/刷新按钮.svg');
    assert.strictEqual(await page.locator('#screen-04 .summary-card').evaluate(el => getComputedStyle(el).height), '120px');
    assert.strictEqual(await page.locator('.dedup-checked-count').evaluate(el => getComputedStyle(el).color), 'rgb(9, 100, 252)');
    await page.click('[data-seg="similar"]');
    assert((await page.locator('#duplicate-list').innerText()).includes('陈晨'));
    await page.locator('.not-dup').first().click();
    assert.strictEqual(await page.locator('#dialog-title').innerText(), '确认标记为不重复？');
    await page.click('#dialog-cancel');
    assert.strictEqual(await page.locator('.duplicate-card').count(), 1);
    await page.click('[data-seg="exact"]');
    assert.strictEqual(await page.locator('.person-line').nth(1).evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
    assert.strictEqual(await page.locator('.duplicate-card').first().evaluate(el => getComputedStyle(el).marginBottom), '16px');
    const beforeMerge = await page.locator('.duplicate-card').count();
    await page.locator('.mini-button').first().click();
    assert.strictEqual(await page.locator('#screen-05 .merge-heading').first().evaluate(el => getComputedStyle(el).fontSize), '14px');
    assert.strictEqual(await page.locator('#screen-05 .select-mark').first().evaluate(el => getComputedStyle(el).width), '20px');
    assert.strictEqual(await page.locator('#screen-05 .reason').first().evaluate(el => getComputedStyle(el).fontWeight), '400');
    assert.strictEqual(await page.locator('#screen-05 .merge-list').evaluate(el => getComputedStyle(el).paddingBottom), '24px');
    const option = page.locator('[data-group="2"] .merge-option').last();
    await option.click();
    assert(await option.evaluate(el => el.classList.contains('on')));
    await page.click('#confirm-merge');
    assert(await page.locator('#confirm-merge').evaluate(el => el.classList.contains('loading')));
    await page.waitForTimeout(3400);
    assert(await page.locator('#screen-04').evaluate(el => el.classList.contains('active')));
    assert.strictEqual(await page.locator('.duplicate-card').count(), beforeMerge - 1);
    assert((await page.locator('#toast-copy').innerText()).includes('合并成功'));
    await page.close();
  });

  await run('未提交合并选择拦截返回', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(fileUrl('', '#screen-05'));
    await page.locator('[data-group="2"] .merge-option').last().click();
    await page.click('#merge-back');
    assert(await page.locator('#dialog-overlay').evaluate(el => el.classList.contains('show')));
    assert((await page.locator('#dialog-title').innerText()).includes('放弃'));
    await page.click('#dialog-cancel');
    assert(await page.locator('#screen-05').evaluate(el => el.classList.contains('active')));
    await page.close();
  });

  await run('我的、设置面板、权限拒绝和提醒设置', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(fileUrl('?state=permission-denied', '#screen-08'));
    const tabMetrics = await page.evaluate(() => ['screen-01', 'screen-08'].map(id => {
      const bar = getComputedStyle(document.querySelector(`#${id} .tabbar`));
      const tab = getComputedStyle(document.querySelector(`#${id} .tab`));
      return [bar.height, bar.paddingTop, bar.paddingBottom, bar.borderRadius, tab.height, tab.fontSize];
    }));
    assert.deepStrictEqual(tabMetrics[0], tabMetrics[1]);
    assert.strictEqual(await page.locator('#screen-01 .tab[data-go="screen-08"]').evaluate(el => getComputedStyle(el, '::before').width), '33px');
    const lowerEntries = await page.locator('#settings-content').innerText();
    assert(!lowerEntries.includes('合并记录'));
    assert(!lowerEntries.includes('分享管理'));
    assert(!lowerEntries.includes('回收站'));
    for (const [type, title] of [['merge', '合并记录'], ['share', '分享管理'], ['trash', '回收站']]) {
      await page.click(`[data-my-view="${type}"]`);
      assert(await page.locator('#my-feature-subview').evaluate(el => el.classList.contains('open')));
      assert.strictEqual((await page.locator('#my-feature-title').textContent()).trim(), title);
      assert.strictEqual(await page.locator('#my-feature-content .feature-card').count(), 3);
      assert.strictEqual(await page.locator('#my-feature-content .feature-card-list > .feature-card').count(), 3);
      const featureStyle = await page.locator('#my-feature-content .feature-card').first().evaluate(card => {
        const avatar = getComputedStyle(card.querySelector('.avatar'));
        const titleStyle = getComputedStyle(card.querySelector('.setting-copy strong'));
        const metaStyle = getComputedStyle(card.querySelector('.setting-copy small'));
        return {
          avatarWidth: avatar.width,
          titleSize: titleStyle.fontSize,
          titleWeight: Number(titleStyle.fontWeight),
          metaGap: metaStyle.marginTop
        };
      });
      assert.strictEqual(featureStyle.avatarWidth, type === 'trash' ? '46px' : '52px');
      assert.strictEqual(featureStyle.titleSize, '16px');
      assert(featureStyle.titleWeight >= 700);
      assert.strictEqual(featureStyle.metaGap, '4px');
      if (type === 'trash') {
        assert.strictEqual(await page.locator('#my-feature-content .trash-card').count(), 3);
        assert((await page.locator('#my-feature-content .feature-summary').evaluate(el => getComputedStyle(el).color)).includes('255'));
      }
      await page.click('#close-my-feature');
    }
    assert.strictEqual(await page.locator('#settings-content .settings-master-card').count(), 3);
    assert.strictEqual(await page.locator('#settings-content .settings-master-card > .setting-row').count(), 3);
    assert.deepStrictEqual(await page.locator('#settings-content .setting-icon img').evaluateAll(images => images.map(image => image.getAttribute('src'))), [
      '../icon/contact-sync.svg',
      '../icon/duplicate-reminder.svg',
      '../icon/settings.svg'
    ]);
    assert.strictEqual(await page.locator('#settings-content .setting-icon img').first().evaluate(el => getComputedStyle(el).width), '36px');
    assert.strictEqual(await page.locator('#sync-setting .value').evaluate(el => getComputedStyle(el).fontSize), '14px');
    assert.deepStrictEqual(await page.locator('#screen-08 .metric').first().evaluate(metric => [...metric.children].map(child => getComputedStyle(child).order)), ['2', '1', '3']);
    assert(!(await page.locator('#settings-content').innerText()).includes('数据与同步'));
    assert(!(await page.locator('#settings-content').innerText()).includes('账户与支持'));
    assert(!(await page.locator('#settings-content').innerText()).includes('通讯录权限'));
    assert(!(await page.locator('#settings-content').innerText()).includes('自动同步'));
    await page.click('#dedup-switch');
    assert.strictEqual(await page.locator('#dedup-switch').getAttribute('aria-checked'), 'false');
    await page.click('#sync-setting');
    await page.waitForURL(/login-sync\.html\?mode=enabled&sync=enabled$/);
    assert.strictEqual((await page.locator('#sync-title').innerText()).trim(), '已开启同步通讯录');
    assert.strictEqual((await page.locator('#start-scan').innerText()).trim(), '取消同步通讯录');
    await page.click('#start-scan');
    assert.strictEqual((await page.locator('#sync-title').innerText()).trim(), '通讯录同步已关闭');
    await page.click('#later');
    await page.waitForURL(/index\.html\?sync=disabled#screen-08$/);
    assert.strictEqual(await page.locator('#sync-setting .value').innerText(), '未开启');
    await page.click('#settings-entry');
    await page.waitForTimeout(280);
    assert(await page.locator('#settings-subview').evaluate(el => el.classList.contains('open')));
    assert(!(await page.locator('#settings-panel-content').innerText()).includes('通讯录权限'));
    assert.strictEqual(await page.locator('#settings-panel-content .setting-icon:visible').count(), 0);
    assert.strictEqual(await page.locator('#settings-panel-content .account-card').count(), 2);
    await page.click('#logout-account');
    assert.strictEqual(await page.locator('#dialog-title').innerText(), '确认退出账号？');
    await page.click('#dialog-cancel');
    await page.click('#delete-account');
    assert.strictEqual(await page.locator('#dialog-title').innerText(), '确认注销账号？');
    await page.click('#dialog-cancel');
    await page.click('#close-settings');
    assert(!(await page.locator('#settings-subview').evaluate(el => el.classList.contains('open'))));
    await page.close();
  });

  await run('加载、空、错误、离线和权限状态参数', async () => {
    const samples = [
      ['?state=loading', '#screen-01', '#screen-01 .skeleton-row'],
      ['?state=empty', '#screen-01', '#screen-01 .state-panel'],
      ['?state=error', '#screen-04', '#screen-04 #retry-scan'],
      ['?state=offline', '#screen-01', '#screen-01 .banner'],
      ['?state=permission-denied', '#screen-08', '#screen-08 #sync-setting']
    ];
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    for (const [query, hash, selector] of samples) {
      await page.goto(fileUrl(query, hash));
      await page.locator(selector).first().waitFor({ state: 'visible' });
    }
    await page.close();
  });

  await run('320–430px 与 640px 高度无横向溢出', async () => {
    for (const width of [320, 375, 390, 430]) {
      for (const height of [640, 812]) {
        const page = await browser.newPage({ viewport: { width, height } });
        await page.goto(fileUrl('', '#screen-01'));
        const layout = await page.evaluate(() => ({
          body: document.body.scrollWidth,
          activeScroll: document.querySelector('.screen.active .scroll')?.scrollWidth || 0,
          width: innerWidth,
          deviceWidth: document.querySelector('.device').getBoundingClientRect().width,
          deviceHeight: document.querySelector('.device').getBoundingClientRect().height
        }));
        assert(layout.body <= width, JSON.stringify(layout));
        assert(layout.activeScroll <= width, JSON.stringify(layout));
        assert.strictEqual(Math.round(layout.deviceWidth), width);
        assert.strictEqual(Math.round(layout.deviceHeight), height);
        await page.close();
      }
    }
  });

  await run('可见交互控件最小触控高度 44px', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    for (const id of ['screen-01', 'screen-02', 'screen-04', 'screen-05', 'screen-07', 'screen-08']) {
      await page.goto(fileUrl('', `#${id}`));
      const tooSmall = await page.locator(`#${id} button:visible`).evaluateAll(buttons =>
        buttons
          .map(button => ({
            text: button.getAttribute('aria-label') || button.textContent.trim(),
            width: button.getBoundingClientRect().width,
            height: button.getBoundingClientRect().height
          }))
          .filter(item => item.width < 44 || item.height < 44)
      );
      assert.deepStrictEqual(tooSmall, [], `${id}: ${JSON.stringify(tooSmall)}`);
    }
    await page.close();
  });

  await run('无控制台错误与缺失本地资源', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const errors = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(fileUrl('', '#screen-01'));
    await page.waitForTimeout(150);
    assert.deepStrictEqual(errors, []);
    await page.close();
  });

  await browser.close();
  console.log(`\n${checks.length} checks passed.`);
  if (failures.length) {
    console.error(`\n${failures.length} checks failed:\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
