const params = new URLSearchParams(location.search);
const fixture = params.get('state') || '';
const screens = [...document.querySelectorAll('.screen')];
const byId = id => document.getElementById(id);
const validScreen = id => screens.some(screen => screen.id === id);
const icon = name => `<svg><use href="#i-${name}"/></svg>`;
let current = '';
let stack = [];
let dialogResolve;
let dialogTrigger;
let toastTimer;
let undoTimer;
let routeTimer;
let formMode = 'edit';
let mergeDirty = false;
let activeDuplicateCard = null;

function route(id, { push = true, hash = true, instant = false } = {}) {
  if (!validScreen(id) || id === current) return;
  const previous = byId(current);
  const routeHost = byId('device');
  clearTimeout(routeTimer);
  if (instant) routeHost.classList.add('instant-route');
  screens.forEach(screen => screen.classList.remove('active', 'behind'));
  if (previous && !instant) previous.classList.add('behind');
  byId(id).classList.add('active');
  if (push && current) stack.push(current);
  current = id;
  if (hash && location.hash !== `#${id}`) {
    history.pushState({ id }, '', `${location.pathname}${location.search}#${id}`);
  }
  if (id === 'screen-06') startUndo();
  if (instant) void routeHost.offsetWidth;
  requestAnimationFrame(() => {
    syncScrollChrome(byId(id).querySelector(':scope > .scroll'));
    if (instant) requestAnimationFrame(() => routeHost.classList.remove('instant-route'));
  });
  if (!instant) routeTimer = setTimeout(() => previous?.classList.remove('behind'), 280);
}

function goBack() {
  route(stack.pop() || 'screen-01', { push: false });
}

window.addEventListener('popstate', () => {
  route(validScreen(location.hash.slice(1)) ? location.hash.slice(1) : 'screen-01', {
    push: false,
    hash: false
  });
});

function showToast(message, action = '', callback) {
  const toast = byId('toast');
  const button = byId('toast-action');
  byId('toast-copy').textContent = message;
  button.textContent = action;
  button.classList.toggle('hidden', !action);
  button.onclick = () => {
    toast.classList.remove('show');
    callback?.();
  };
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function showDialog({ title, copy, cancel = '取消', confirm = '确定', variant = '' }) {
  dialogTrigger = document.activeElement;
  byId('dialog-overlay').dataset.variant = variant;
  byId('dialog-title').textContent = title;
  byId('dialog-copy').textContent = copy;
  byId('dialog-cancel').textContent = cancel;
  byId('dialog-confirm').textContent = confirm;
  byId('dialog-overlay').classList.add('show');
  byId('dialog-confirm').focus();
  return new Promise(resolve => {
    dialogResolve = resolve;
  });
}

function closeDialog(value) {
  byId('dialog-overlay').classList.remove('show');
  delete byId('dialog-overlay').dataset.variant;
  dialogResolve?.(value);
  dialogResolve = null;
  dialogTrigger?.focus();
  dialogTrigger = null;
}

byId('dialog-cancel').onclick = () => closeDialog(false);
byId('dialog-confirm').onclick = () => closeDialog(true);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && byId('dialog-overlay').classList.contains('show')) closeDialog(false);
});

document.addEventListener('click', event => {
  const destination = event.target.closest('[data-go]');
  if (destination) {
    if (destination.dataset.mode) setFormMode(destination.dataset.mode);
    route(destination.dataset.go, { instant: Boolean(destination.closest('.tabbar')) });
  }
  if (event.target.closest('[data-back]')) goBack();
  const feedback = event.target.closest('[data-toast]');
  if (feedback) showToast(feedback.dataset.toast);
});

async function choosePhoneNumber(action) {
  const title = action === '短信' ? '选择号码发送短信' : action === '拨号' ? '选择号码拨打电话' : `选择号码${action}`;
  const primaryNumber = activeContact.phone || '未填写号码';
  const secondaryNumber = activeContact.workPhone || primaryNumber;
  const useWorkNumber = await showDialog({
    title,
    copy: '',
    cancel: primaryNumber,
    confirm: secondaryNumber,
    variant: 'phone-picker'
  });
  const number = useWorkNumber ? secondaryNumber : primaryNumber;
  showToast(`已选择 ${number}，原型不发起真实${action}`);
}

byId('detail-call').onclick = () => choosePhoneNumber('拨号');
byId('detail-message').onclick = () => choosePhoneNumber('短信');
byId('detail-email').onclick = async () => {
  const confirmed = await showDialog({
    title: '确认邮箱',
    copy: `将使用 ${activeContact.email || '该联系人的邮箱'} 发送邮件。`,
    cancel: '取消',
    confirm: '确认'
  });
  if (confirmed) showToast('邮箱已确认，原型不打开邮件客户端');
};

const defaultContact = {
  id: 'wang-xiaoming', letter: 'W', name: '王小明', phone: '138 0013 8000', workPhone: '010 6255 8899',
  company: '云启科技', title: '产品经理', email: 'wangxm@yunqi.com', address: '北京市海淀区中关村大街27号',
  birthday: '1988-06-18', note: '展会认识，关注智能硬件方向', tags: ['重点客户'], source: '本机联系人', updated: '今天 14:20', merged: '由 2 条记录合并'
};
const contacts = [
  { id: 'an-xiaodong', letter: 'A', name: '安晓东', phone: '138 2210 6658', company: '云启科技', title: '商务经理', email: 'anxd@yunqi.com', address: '北京市朝阳区望京街8号', birthday: '1990-03-12', note: '云启科技商务联系人', tags: ['重点客户'], source: '本机联系人', updated: '今天 12:30' },
  { id: 'ai-li', letter: 'A', name: '艾莉', phone: '186 0934 7710', company: '自由职业', title: '品牌顾问', email: 'aili@example.com', address: '上海市静安区南京西路', birthday: '1992-08-26', note: '品牌项目合作', tags: ['同事'], source: 'iCloud', updated: '昨天 18:10' },
  { id: 'bai-ruoyun', letter: 'B', name: '白若云', phone: '139 5577 0208', company: '远景设计', title: '设计总监', email: 'bai@vision-design.cn', address: '杭州市西湖区文三路', birthday: '1989-11-08', note: '远景设计负责人', tags: ['供应商'], source: '本机联系人', updated: '8 月 30 日' },
  { id: 'bao-guohua', letter: 'B', name: '包国华', phone: '137 8881 2436', company: '恒信物流', title: '运营负责人', email: 'bao@hengxin-logistics.cn', address: '广州市天河区体育西路', birthday: '1986-05-19', note: '物流供应商联系人', tags: ['供应商'], source: 'SIM 卡', updated: '8 月 28 日' }
];
let activeContact = defaultContact;
let hasCreatedContact = false;

function renderHome(filter = '') {
  const root = byId('home-content');
  if (fixture === 'loading') {
    root.innerHTML = Array.from(
      { length: 7 },
      () => '<div class="skeleton-row"><div class="skeleton"></div><div class="skeleton-lines"><div class="skeleton"></div><div class="skeleton"></div></div></div>'
    ).join('');
    return;
  }
  let banner = '';
  if (fixture === 'offline') {
    banner = `<div class="banner">${icon('alert')}<span>当前离线，展示上次保存在本机的联系人。</span></div>`;
  }
  if (fixture === 'permission-denied') {
    banner = `<div class="banner danger">${icon('lock')}<span>未获得通讯录权限。你仍可手动管理已保存的联系人。</span></div>`;
  }
  const list = fixture === 'empty' && !hasCreatedContact
    ? []
    : contacts.filter(contact => [contact.name, contact.phone, contact.company, contact.title].join('').toLowerCase().includes(filter.toLowerCase()));
  let html = `${banner}<div class="flat-card notice"><span class="notice-icon warn">${icon('scan')}</span><span class="notice-copy"><strong>发现 38 位可能重复联系人</strong><span>核对后合并，信息不会丢失</span></span><button class="text-button" data-go="screen-04">去处理</button></div>`;
  if (!list.length) {
    root.innerHTML = html + `<div class="state-panel"><div class="state-icon">${icon('users')}</div><h2>${filter ? '没有匹配的联系人' : '还没有联系人'}</h2><p>${filter ? '换个姓名、号码或公司试试' : '点击右上角添加第一位联系人'}</p></div>`;
    return;
  }
  let lastLetter = '';
  let groupOpen = false;
  html += '<div class="contact-groups">';
  list.forEach(contact => {
    if (contact.letter !== lastLetter) {
      if (groupOpen) html += '</div></div>';
      lastLetter = contact.letter;
      groupOpen = true;
      html += `<div class="contact-group" data-letter="${lastLetter}"><div class="letter">${lastLetter}</div><div class="contact-list">`;
    }
    html += `<button class="contact-row" data-contact-id="${contact.id}"><span class="avatar">${contact.name[0]}</span><span class="contact-main"><span class="contact-name">${contact.name}</span><span class="contact-meta">${contact.phone} · ${contact.company}</span></span><svg class="chevron"><use href="#i-chevron"/></svg></button>`;
  });
  root.innerHTML = html + (groupOpen ? '</div></div>' : '') + '</div>';
}

byId('contact-search').addEventListener('input', event => renderHome(event.target.value.trim()));
byId('home-content').addEventListener('click', event => {
  const row = event.target.closest('[data-contact-id]');
  if (!row) return;
  const contact = contacts.find(item => item.id === row.dataset.contactId);
  if (!contact) return;
  activeContact = contact;
  renderDetails(activeContact);
  route('screen-02');
});

const homeScroll = byId('screen-01').querySelector(':scope > .scroll');
byId('alpha-index').onclick = event => {
  const target = event.target.closest('[data-letter]');
  if (!target) return;
  if (target.dataset.letter === 'top') {
    homeScroll.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const group = byId('home-content').querySelector(`.contact-group[data-letter="${target.dataset.letter}"]`);
  if (!group) {
    showToast(`暂无 ${target.dataset.letter} 开头的联系人`);
    return;
  }
  const top = group.getBoundingClientRect().top - homeScroll.getBoundingClientRect().top + homeScroll.scrollTop - 60;
  homeScroll.scrollTo({ top, behavior: 'smooth' });
};

byId('compact-search').onclick = () => {
  homeScroll.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => byId('contact-search').focus(), 220);
};

byId('open-messages').onclick = () => {
  byId('message-subview').classList.add('open');
  syncScrollChrome(byId('message-subview').querySelector(':scope > .scroll'));
  byId('close-messages').focus();
};
byId('open-my-messages').onclick = () => {
  route('screen-01');
  requestAnimationFrame(() => byId('open-messages').click());
};
byId('close-messages').onclick = () => {
  byId('message-detail').classList.remove('open');
  byId('message-subview').classList.remove('open');
  syncScrollChrome(byId('screen-01').querySelector(':scope > .scroll'));
  byId('open-messages').focus();
};

function updateUnreadMessages() {
  const unread = byId('message-subview').querySelectorAll('.message-card.unread').length;
  const badge = byId('message-badge');
  badge.textContent = unread;
  badge.classList.toggle('hidden', unread === 0);
  byId('open-messages').setAttribute('aria-label', unread ? `系统消息，${unread} 条未读` : '系统消息，无未读消息');
  byId('mark-all-read').disabled = unread === 0;
}

function markMessageRead(card) {
  if (!card?.classList.contains('unread')) return;
  card.classList.remove('unread');
  updateUnreadMessages();
}

byId('mark-all-read').onclick = () => {
  byId('message-subview').querySelectorAll('.message-card.unread').forEach(card => card.classList.remove('unread'));
  updateUnreadMessages();
  showToast('所有消息已标记为已读');
};

const systemMessages = {
  sync: {
    title: '通讯录同步完成',
    time: '刚刚',
    copy: '本机通讯录已完成同步，本次共更新 1,286 位联系人。同步过程仅在本机完成。',
    tone: '',
    icon: 'check',
    meta: [['同步范围', '本机通讯录'], ['更新数量', '1,286 位联系人'], ['数据处理', '仅在本机']]
  },
  duplicate: {
    title: '发现可合并联系人',
    time: '10 分钟前',
    copy: '发现 38 位可能重复联系人。核对并合并后会保留完整信息，原始记录可在 90 天内恢复。',
    tone: 'warn',
    icon: 'users',
    meta: [['待核对', '12 组'], ['确定重复', '8 组'], ['疑似重复', '4 组']],
    action: '去核对'
  },
  privacy: {
    title: '数据保护正常',
    time: '今天',
    copy: '联系人数据仅保存在本机，未上传原始通讯录。当前访问权限与保护状态均正常。',
    tone: 'success',
    icon: 'lock',
    meta: [['存储位置', '仅本机'], ['通讯录权限', '已允许'], ['保护状态', '正常']]
  }
};

function closeMessageDetail() {
  byId('message-detail').classList.remove('open');
  syncScrollChrome(byId('message-subview').querySelector(':scope > .scroll'));
  byId('message-subview').querySelector(`[data-message="${byId('message-detail').dataset.message}"]`)?.focus();
}

function openMessageDetail(key) {
  const message = systemMessages[key];
  if (!message) return;
  const detail = byId('message-detail');
  const detailIcon = byId('message-detail-icon');
  detail.dataset.message = key;
  detailIcon.className = `message-detail-icon ${message.tone}`.trim();
  detailIcon.innerHTML = icon(message.icon);
  byId('message-detail-time').textContent = '';
  byId('message-detail-heading').textContent = message.title;
  byId('message-detail-copy').textContent = message.copy;
  byId('message-detail-meta').innerHTML = message.meta.map(([label, value]) => `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`).join('');
  const action = byId('message-detail-action');
  action.textContent = message.action || '';
  action.classList.toggle('hidden', !message.action);
  action.onclick = message.action ? () => {
    detail.classList.remove('open');
    byId('message-subview').classList.remove('open');
    route('screen-04');
  } : null;
  detail.classList.add('open');
  const detailScroll = detail.querySelector(':scope > .scroll');
  detailScroll.scrollTop = 0;
  syncScrollChrome(detailScroll);
  byId('close-message-detail').focus();
}

byId('message-subview').querySelector('.message-list').onclick = event => {
  const card = event.target.closest('[data-message]');
  if (card) {
    markMessageRead(card);
    openMessageDetail(card.dataset.message);
  }
};
byId('close-message-detail').onclick = closeMessageDetail;

function renderDetails(contact = activeContact) {
  const detail = byId('screen-02');
  detail.querySelector('.hero-profile .avatar').textContent = contact.name[0];
  detail.querySelector('.profile-name').textContent = contact.name;
  detail.querySelector('.profile-role').textContent = [contact.company, contact.title].filter(Boolean).join(' · ');
  detail.querySelector('.chips').innerHTML = `${(contact.tags || []).map(tag => `<span class="chip">${tag}</span>`).join('')}<span class="chip">${contact.source || '本机联系人'}</span>`;
  const groups = [
    ['更多信息', [
      ...(contact.workPhone ? [['工作', contact.workPhone]] : []),
      ['邮箱', contact.email || '未填写'], ['地址', contact.address || '未填写'], ['生日', contact.birthday || '未填写'],
      ['备注', contact.note || '未填写'], ['标签', (contact.tags || []).join('、') || '未添加'], ['来源', contact.source || '本机联系人'],
      ['更新时间', contact.updated || '刚刚'], ...(contact.merged ? [['合并历史', contact.merged]] : [])
    ]]
  ];
  byId('detail-fields').innerHTML = groups.map(group => `
    <section class="field-group">
      <div class="field-heading">${group[0]}</div>
      ${group[1].map(row => `<button class="detail-row" style="width:100%;text-align:left" data-toast="${row[0]}信息已复制"><span class="detail-label">${row[0]}</span><span class="detail-value">${row[1]}</span>${row[0] === '电话' ? icon('phone') : ''}</button>`).join('')}
    </section>`).join('');
}

function setFormMode(mode) {
  formMode = mode;
  const isNew = mode === 'new';
  const contact = activeContact || defaultContact;
  byId('form-title').textContent = isNew ? '新增联系人' : '编辑联系人';
  const values = {
    'name-input': isNew ? '' : contact.name,
    'company-input': isNew ? '' : contact.company,
    'title-input': isNew ? '' : contact.title,
    'email-input': isNew ? '' : contact.email,
    'address-input': isNew ? '' : contact.address,
    'birthday-input': isNew ? '' : contact.birthday,
    'note-input': isNew ? '' : contact.note
  };
  const placeholders = {
    'name-input': '输入联系人姓名',
    'company-input': '输入公司名称',
    'title-input': '输入职位',
    'email-input': '输入邮箱地址',
    'address-input': '输入联系地址',
    'birthday-input': '选择出生日期',
    'note-input': '输入备注'
  };
  Object.entries(values).forEach(([id, value]) => {
    byId(id).value = value;
    byId(id).placeholder = placeholders[id];
  });
  byId('form-avatar').innerHTML = isNew ? icon('user') : contact.name[0];
  renderPhones(isNew ? [''] : [contact.phone, contact.workPhone].filter(Boolean));
  byId('delete-contact-card').classList.toggle('hidden', isNew);
}

function renderPhones(values) {
  byId('phone-list').innerHTML = values.map((value, index) => `
    <div class="phone-entry-group">
      <div class="phone-card-head"><select class="phone-type" aria-label="电话号码类型 ${index + 1}">
        <option value="mobile"${index ? '' : ' selected'}>手机</option>
        <option value="work"${index ? ' selected' : ''}>工作</option>
      </select><button type="button" class="remove-phone" aria-label="删除电话号码 ${index + 1}">${icon('trash')}</button></div>
      <section class="form-section phone-entry-card">
        <div class="phone-line">
          <input class="input phone-input" inputmode="tel" aria-label="电话号码 ${index + 1}" placeholder="输入电话号码" value="${value}">
        </div>
      </section>
    </div>`).join('');
}

byId('contact-form').insertAdjacentHTML('beforeend', `
  <section class="form-section delete-contact-card" id="delete-contact-card">
    <button type="button" class="delete-contact-button" id="delete-contact">删除该联系人</button>
  </section>`);

byId('delete-contact').onclick = async () => {
  const confirmed = await showDialog({
    title: '确认删除该联系人？',
    copy: `${activeContact.name} 将移入回收站，可在 30 天内恢复。`,
    cancel: '取消',
    confirm: '确认删除',
    variant: 'danger-confirm'
  });
  if (!confirmed) return;
  const index = contacts.findIndex(contact => contact.id === activeContact.id);
  if (index >= 0) contacts.splice(index, 1);
  activeContact = defaultContact;
  renderHome();
  renderDetails(activeContact);
  route('screen-01');
  showToast('联系人已移入回收站');
};

byId('add-phone').onclick = () => {
  const values = [...document.querySelectorAll('.phone-input')].map(input => input.value);
  values.push('');
  renderPhones(values);
  document.querySelectorAll('.phone-input')[values.length - 1].focus();
};

byId('phone-list').onclick = event => {
  const remove = event.target.closest('.remove-phone');
  if (!remove) return;
  const rows = [...document.querySelectorAll('.phone-entry-group')];
  if (rows.length === 1) {
    showToast('至少保留一个电话号码');
    return;
  }
  remove.closest('.phone-entry-group').remove();
};

document.querySelectorAll('.tag-choice').forEach(button => {
  button.onclick = () => button.classList.toggle('on');
});

function validateForm() {
  const name = byId('name-input');
  const phones = [...document.querySelectorAll('.phone-input')];
  const nameValid = Boolean(name.value.trim());
  const phoneValid = phones.some(input => /^[-+\d\s]{7,20}$/.test(input.value.trim()));
  name.classList.toggle('error', !nameValid);
  byId('name-error').classList.toggle('show', !nameValid);
  byId('phone-error').classList.toggle('show', !phoneValid);
  phones.forEach(input => {
    input.classList.toggle('error', Boolean(input.value) && !/^[-+\d\s]{7,20}$/.test(input.value));
  });
  return nameValid && phoneValid;
}

byId('name-input').addEventListener('blur', validateForm);
byId('phone-list').addEventListener('focusout', validateForm);
byId('form-cancel').onclick = async () => {
  const discard = await showDialog({
    title: '放弃本次编辑？',
    copy: '未保存的联系人信息将不会保留。',
    cancel: '继续编辑',
    confirm: '放弃'
  });
  if (discard) goBack();
};

byId('save-contact').onclick = async () => {
  if (!validateForm()) {
    document.querySelector('.input.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const phone = [...document.querySelectorAll('.phone-input')]
    .map(input => input.value.replace(/\s/g, ''))
    .find(Boolean);
  if (formMode === 'new' && phone === '13800138000') {
    const review = await showDialog({
      title: '发现相似联系人',
      copy: '通讯录中已有同号码的“王小明”，是否先核对重复信息？',
      cancel: '仍然保存',
      confirm: '去核对'
    });
    if (review) {
      route('screen-05');
      return;
    }
  }
  const button = byId('save-contact');
  button.classList.add('loading');
  button.textContent = '保存中';
  button.disabled = true;
  setTimeout(() => {
    button.classList.remove('loading');
    button.textContent = '保存联系人';
    button.disabled = false;
    if (formMode === 'new') {
      const name = byId('name-input').value.trim();
      const company = byId('company-input').value.trim() || '未填写公司';
      const phoneText = [...document.querySelectorAll('.phone-input')].map(input => input.value.trim()).find(Boolean) || '未填写电话';
      contacts.push({
        id: `contact-${Date.now()}`, letter: name[0].toUpperCase(), name, phone: phoneText, company,
        title: byId('title-input').value.trim(), email: byId('email-input').value.trim(), address: byId('address-input').value.trim(),
        birthday: byId('birthday-input').value, note: byId('note-input').value.trim(), tags: [], source: '本机联系人', updated: '刚刚'
      });
      hasCreatedContact = true;
      renderHome();
      route('screen-01');
      showToast('创建成功');
    } else {
      const phones = [...document.querySelectorAll('.phone-input')].map(input => input.value.trim()).filter(Boolean);
      const updatedName = byId('name-input').value.trim();
      Object.assign(activeContact, {
        name: updatedName, letter: updatedName[0].toUpperCase(), company: byId('company-input').value.trim(), title: byId('title-input').value.trim(),
        phone: phones[0] || '', workPhone: phones[1] || '', email: byId('email-input').value.trim(), address: byId('address-input').value.trim(),
        birthday: byId('birthday-input').value, note: byId('note-input').value.trim(), updated: '刚刚'
      });
      renderDetails(activeContact);
      renderHome();
      route('screen-02');
      showToast('联系人已更新');
    }
  }, 650);
};

const duplicateData = {
  exact: [
    ['电话号码相同', '王小明', '138 0013 8000 · 本机', '王小明（公司）', '138 0013 8000 · iCloud', '将保留全部 2 个号码', true],
    ['姓名与公司相同', '李娜', '186 9018 6277 · 本机', '李娜', '未填写电话 · SIM 卡', '合并后补全公司与职位', false]
  ],
  similar: [
    ['姓名与邮箱相近', '陈晨', 'chenchen@minglu.cn · 本机', '陈辰', 'chen.chen@minglu.cn · iCloud', '建议人工确认邮箱']
  ]
};

function duplicateCard(item) {
  return `<article class="duplicate-card">
    <div class="dup-head"><span class="reason">${item[0]}</span><span class="confidence">2 条记录</span></div>
    <div class="person-line"><span class="avatar">${item[1][0]}</span><span class="person-copy"><strong>${item[1]}</strong><span>${item[2]}</span></span><span class="recommend">推荐主记录</span></div>
    <div class="person-line"><span class="avatar">${item[3][0]}</span><span class="person-copy"><strong>${item[3]}</strong><span>${item[4]}</span></span>${item[6] ? '<span class="recommend">推荐主记录</span>' : ''}</div>
    <div class="dup-foot"><small>${item[5]}</small><span class="dup-actions"><button class="ghost-button not-dup">不重复</button><button class="mini-button" data-go="screen-05">核对并合并</button></span></div>
  </article>`;
}

function renderDedup(type = 'exact') {
  const state = byId('dedup-state');
  const content = byId('dedup-default');
  state.innerHTML = '';
  content.classList.remove('hidden');
  if (['loading', 'error', 'empty'].includes(fixture)) {
    content.classList.add('hidden');
    const states = {
      loading: ['正在扫描通讯录', '正在本机比对姓名、号码和公司信息'],
      error: ['扫描未完成', '读取联系人时发生错误，请稍后重试'],
      empty: ['没有发现重复联系人', '通讯录很干净，暂时无需处理']
    };
    const copy = states[fixture];
    state.innerHTML = `<div class="state-panel">${fixture === 'loading' ? '<div class="spinner"></div>' : `<div class="state-icon">${icon(fixture === 'error' ? 'alert' : 'check')}</div>`}<h2>${copy[0]}</h2><p>${copy[1]}</p>${fixture === 'error' ? '<button class="button primary" id="retry-scan">重新扫描</button>' : ''}</div>`;
    byId('retry-scan')?.addEventListener('click', () => {
      state.innerHTML = '<div class="state-panel"><div class="spinner"></div><h2>正在重新扫描</h2><p>请保持页面开启</p></div>';
    });
    return;
  }
  byId('duplicate-list').innerHTML = duplicateData[type].map(duplicateCard).join('');
}

byId('duplicate-list').onclick = async event => {
  const notDuplicate = event.target.closest('.not-dup');
  if (notDuplicate) {
    const card = notDuplicate.closest('.duplicate-card');
    const names = [...card.querySelectorAll('.person-copy strong')].map(item => item.textContent).join('、');
    const confirmed = await showDialog({
      title: '确认标记为不重复？',
      copy: `${names} 将不再出现在重复联系人建议中。`,
      cancel: '继续核对',
      confirm: '确认不重复'
    });
    if (!confirmed) return;
    const markup = card.outerHTML;
    card.remove();
    showToast('已标记为不重复', '撤销', () => {
      byId('duplicate-list').insertAdjacentHTML('afterbegin', markup);
    });
    return;
  }
  const mergeButton = event.target.closest('.mini-button');
  if (mergeButton) activeDuplicateCard = mergeButton.closest('.duplicate-card');
  if (event.target.closest('#batch-merge')) {
    const confirmed = await showDialog({
      title: '合并 8 组确定重复联系人？',
      copy: '电话号码将全部保留，其他字段按信息完整度合并；90 天内可撤销。',
      cancel: '再核对一下',
      confirm: '确认合并'
    });
    if (confirmed) route('screen-06');
  }
};

document.querySelectorAll('[data-seg]').forEach(button => {
  button.onclick = () => {
    document.querySelectorAll('[data-seg]').forEach(item => item.classList.toggle('on', item === button));
    renderDedup(button.dataset.seg);
  };
});

byId('rescan').innerHTML = '<img src="../icon/刷新按钮.svg" alt="">';
document.querySelector('.dedup-summary-note').innerHTML = '已检查 <span class="dedup-checked-count">1,286</span> 位联系人，原始数据未上传';

byId('rescan').onclick = () => {
  byId('dedup-default').classList.add('hidden');
  byId('dedup-state').innerHTML = '<div class="state-panel"><div class="spinner"></div><h2>正在重新扫描</h2><p>联系人数据仅在本机处理</p></div>';
  setTimeout(() => {
    byId('dedup-state').innerHTML = '';
    byId('dedup-default').classList.remove('hidden');
    showToast('扫描完成，发现 12 组待核对');
  }, 900);
};

const mergeGroups = [
  { name: '主记录', single: true, options: [['王小明', '8 个完整字段', '本机'], ['王小明（公司）', '5 个完整字段', 'iCloud']] },
  { name: '电话号码', single: false, options: [['138 0013 8000', '手机', '本机'], ['010 6255 8899', '工作', 'iCloud']] },
  { name: '公司与职位', single: true, options: [['云启科技 · 产品经理', '信息更完整', '本机'], ['云启科技', '未填写职位', 'iCloud']] },
  { name: '标签', single: false, options: [['重点客户', '本机标签', '本机'], ['合作伙伴', 'iCloud 标签', 'iCloud']] }
];

function renderMerge() {
  byId('merge-list').innerHTML = mergeGroups.map((group, groupIndex) => `
    <section class="merge-group" data-single="${group.single}" data-group="${groupIndex}">
      <div class="merge-heading"><span>${group.name}</span><span class="reason">${group.single ? '选择一项' : '可保留多项'}</span></div>
      ${group.options.map((option, index) => `<button class="merge-option ${index === 0 || !group.single ? 'on' : ''}" data-option="${index}"><span class="merge-copy"><span class="merge-title-line"><b>${option[0]}</b><span class="source-pill">${option[2]}</span></span><small>${option[1]}</small></span><span class="select-mark">✓</span></button>`).join('')}
    </section>`).join('');
  updateMergePreview();
}

function updateMergePreview() {
  const count = document.querySelectorAll('.merge-option.on').length;
  byId('confirm-merge').textContent = `确认合并（保留 ${count} 项）`;
}

byId('merge-list').onclick = event => {
  const option = event.target.closest('.merge-option');
  if (!option) return;
  const group = option.closest('.merge-group');
  if (group.dataset.single === 'true') {
    group.querySelectorAll('.merge-option').forEach(item => item.classList.toggle('on', item === option));
  } else {
    const selected = group.querySelectorAll('.merge-option.on').length;
    if (option.classList.contains('on') && selected === 1) {
      showToast('该字段至少保留一项');
      return;
    }
    option.classList.toggle('on');
  }
  mergeDirty = true;
  updateMergePreview();
};

async function leaveMerge(target) {
  if (mergeDirty) {
    const discard = await showDialog({
      title: '放弃未提交的合并选择？',
      copy: '返回后本次字段选择不会保留。',
      cancel: '继续核对',
      confirm: '放弃'
    });
    if (!discard) return;
  }
  mergeDirty = false;
  goBack();
}

byId('merge-back').onclick = () => leaveMerge('back');
byId('merge-skip').onclick = async () => {
  const confirmed = await showDialog({
    title: '跳过该组联系人？',
    copy: '确认后会从当前待核对列表中移除该条记录。',
    cancel: '继续核对',
    confirm: '确认跳过'
  });
  if (!confirmed) return;
  activeDuplicateCard?.remove();
  byId('screen-02').querySelector('.notice')?.remove();
  activeDuplicateCard = null;
  mergeDirty = false;
  goBack();
  showToast('已跳过该组联系人');
};
byId('confirm-merge').onclick = () => {
  const button = byId('confirm-merge');
  button.classList.add('loading');
  button.textContent = '正在安全合并';
  button.disabled = true;
  setTimeout(() => {
    button.classList.remove('loading');
    button.disabled = false;
    renderMerge();
    mergeDirty = false;
    activeDuplicateCard?.remove();
    activeDuplicateCard = null;
    goBack();
    showToast('合并成功');
  }, 3200);
};

function startUndo() {
  clearInterval(undoTimer);
  let left = 10;
  byId('undo-count').textContent = left;
  byId('undo-toast').classList.add('show');
  undoTimer = setInterval(() => {
    left -= 1;
    byId('undo-count').textContent = left;
    if (left <= 0) {
      clearInterval(undoTimer);
      byId('undo-toast').classList.remove('show');
    }
  }, 1000);
}

byId('undo-merge').onclick = () => {
  clearInterval(undoTimer);
  route('screen-04');
  showToast('合并已撤销，原重复组已恢复');
};

const shareFields = [
  ['company', '公司与职位', '云启科技 · 产品经理', true],
  ['phone', '手机号码', '138 0013 8000', true],
  ['email', '邮箱', 'wangxm@yunqi.com', true],
  ['address', '地址', '北京市海淀区中关村大街27号', false]
];

function renderShare() {
  byId('visibility-list').innerHTML = shareFields.map(field => `<button class="option-row ${field[3] ? 'on' : ''}" data-field="${field[0]}"><span class="checkbox">${icon('check')}</span><span class="option-copy">${field[1]}<small>${field[2]}</small></span></button>`).join('');
  updateSharePreview();
}

function updateSharePreview() {
  const visible = [...document.querySelectorAll('#visibility-list [data-field].on')].map(item => item.dataset.field);
  document.querySelector('[data-preview="company"]').classList.toggle('hidden', !visible.includes('company'));
  byId('share-preview-meta').innerHTML = shareFields
    .filter(field => visible.includes(field[0]) && field[0] !== 'company')
    .map(field => `${field[1]}　${field[2]}`)
    .join('<br>') || '仅分享姓名与头像';
}

byId('visibility-list').onclick = event => {
  const row = event.target.closest('[data-field]');
  if (!row) return;
  row.classList.toggle('on');
  updateSharePreview();
};

document.querySelectorAll('[data-expiry]').forEach(button => {
  button.onclick = () => {
    document.querySelectorAll('[data-expiry]').forEach(item => item.classList.toggle('on', item === button));
  };
});

byId('copy-link').onclick = () => showToast(fixture === 'error' ? '链接生成失败，请检查网络' : '名片链接已复制');
byId('share-wechat').onclick = () => {
  const button = byId('share-wechat');
  const label = button.querySelector('span');
  button.classList.add('loading');
  label.textContent = '准备分享';
  setTimeout(() => {
    button.classList.remove('loading');
    label.textContent = '分享到微信';
    showToast(fixture === 'error' ? '分享失败，请稍后重试' : '分享准备完成（原型不调用微信）');
  }, 650);
};

function settingIcon(source) {
  return source.endsWith('.svg') ? `<img src="../icon/${source}" alt="">` : icon(source);
}

function settingRow(iconName, title, sub, value, extra = '') {
  return `<button class="setting-row" style="width:100%;text-align:left" ${extra}><span class="setting-icon">${settingIcon(iconName)}</span><span class="setting-copy">${title}<small>${sub}</small></span>${value ? `<span class="value">${value}</span>` : ''}<svg class="chevron"><use href="#i-chevron"/></svg></button>`;
}

function renderSettings() {
  const denied = fixture === 'permission-denied';
  const syncEnabled = params.get('sync') !== 'disabled';
  byId('settings-content').innerHTML = `
    ${fixture === 'offline' ? `<div class="banner">${icon('alert')}<span>当前离线，设置变更将在恢复网络后同步。</span></div>` : ''}
    <section class="field-group settings-master-card">
      ${settingRow('contact-sync.svg', '通讯录同步', syncEnabled ? '刚刚完成本地同步' : '同步已关闭', syncEnabled ? '已开启' : '未开启', 'id="sync-setting"')}
    </section>
    <section class="field-group settings-master-card">
      <div class="setting-row"><span class="setting-icon">${settingIcon('duplicate-reminder.svg')}</span><span class="setting-copy">排重提醒<small>发现高置信重复时提醒</small></span><button class="switch on" id="dedup-switch" role="switch" aria-checked="true" aria-label="排重提醒"></button></div>
    </section>
    <section class="field-group settings-master-card">
      ${settingRow('settings.svg', '隐私与帮助', '隐私设置、帮助与反馈', '', 'id="settings-entry"')}
    </section>`;

  byId('settings-panel-content').innerHTML = `
    ${fixture === 'offline' ? `<div class="banner">${icon('alert')}<span>当前离线，设置将保存在本机。</span></div>` : ''}
    <section class="field-group settings-panel-card">
      ${settingRow('lock', '数据与隐私', '本地存储与数据保护说明', '', 'id="privacy-setting"')}
      ${settingRow('msg', '帮助与反馈', '查看帮助或提交建议', '', 'data-toast="反馈入口已打开（原型）"')}
      ${settingRow('more', '关于名络', '轻商务智能通讯录', 'v1.1', 'data-toast="当前已是最新版本"')}
    </section>
    <section class="account-card-list">
      <button class="account-card" id="logout-account">退出账号</button>
      <button class="account-card danger" id="delete-account">注销账号</button>
    </section>`;

  const wireSwitch = (id, onCopy, offCopy) => {
    byId(id).onclick = event => {
    const toggle = event.currentTarget;
    toggle.classList.toggle('on');
    toggle.setAttribute('aria-checked', toggle.classList.contains('on'));
      showToast(toggle.classList.contains('on') ? onCopy : offCopy);
    };
  };
  wireSwitch('dedup-switch', '已开启排重提醒', '已关闭排重提醒');

  byId('sync-setting').onclick = () => { location.href = `login-sync.html?mode=enabled&sync=${syncEnabled ? 'enabled' : 'disabled'}`; };

  byId('privacy-setting').onclick = () => showDialog({
    title: '数据与隐私',
    copy: '联系人数据仅保存在本机；未经授权不会读取通讯录，排重与合并过程不会上传原始联系人。',
    cancel: '关闭',
    confirm: '我知道了'
  });

  byId('settings-entry').onclick = openSettings;

  byId('logout-account').onclick = async () => {
    const confirmed = await showDialog({
      title: '确认退出账号？',
      copy: '退出后本机联系人不会被删除，你可以随时重新登录。',
      cancel: '取消',
      confirm: '退出账号'
    });
    if (confirmed) location.href = 'login.html';
  };

  byId('delete-account').onclick = async () => {
    const confirmed = await showDialog({
      title: '确认注销账号？',
      copy: '注销后将清除名络中的本机数据、合并记录和分享链接，此操作不可恢复。',
      cancel: '暂不注销',
      confirm: '确认注销',
      variant: 'danger-confirm'
    });
    if (!confirmed) return;
    showToast('账号已注销（原型）');
    setTimeout(() => {
      location.href = 'login.html';
    }, 900);
  };
}

function openSettings() {
  byId('settings-subview').classList.add('open');
  byId('close-settings').focus();
}

function closeSettings() {
  byId('settings-subview').classList.remove('open');
  byId('settings-entry').focus();
}

byId('close-settings').onclick = closeSettings;

const myFeatureViews = {
  merge: {
    title: '合并记录',
    summary: '共 18 条合并记录，最近 90 天内的记录可恢复。',
    rows: [
      ['王小明', '今天 12:18 · 由 2 条记录合并', '恢复'],
      ['李娜', '昨天 18:42 · 由 2 条记录合并', '恢复'],
      ['陈晨', '8 月 28 日 · 由 3 条记录合并', '恢复']
    ]
  },
  share: {
    title: '分享管理',
    summary: '当前有 6 个有效名片链接，可查看或停止分享。',
    rows: [
      ['王小明的名片', '还有 26 天失效 · 浏览 8 次', '管理'],
      ['商务联系名片', '长期有效 · 浏览 21 次', '管理'],
      ['展会临时名片', '还有 3 天失效 · 浏览 4 次', '管理']
    ]
  },
  trash: {
    title: '回收站',
    summary: '已删除联系人保留 30 天，到期后将自动清除。',
    rows: [
      ['周航', '剩余 29 天 · 本机联系人', '恢复'],
      ['许婧', '剩余 18 天 · 本机联系人', '恢复'],
      ['赵先生', '剩余 6 天 · SIM 卡', '恢复']
    ]
  }
};

function openMyFeature(type) {
  const view = myFeatureViews[type];
  if (!view) return;
  byId('my-feature-title').textContent = view.title;
  const rows = type === 'trash'
    ? view.rows.map(row => {
      const [countdown, source = ''] = row[1].split(' · ');
      return `<div class="feature-row feature-card trash-card"><div class="trash-card-head"><span class="avatar">${row[0][0]}</span><span class="setting-copy"><strong>${row[0]}</strong><small>${source}</small></span></div><div class="trash-card-foot"><span class="trash-countdown">${countdown}</span><button class="feature-action" data-feature-action="${type}">${row[2]}</button></div></div>`;
    }).join('')
    : view.rows.map(row => `<div class="setting-row feature-row feature-card"><span class="avatar">${row[0][0]}</span><span class="setting-copy"><strong>${row[0]}</strong><small>${row[1]}</small></span><button class="feature-action" data-feature-action="${type}">${row[2]}</button></div>`).join('');
  byId('my-feature-content').className = `page-content feature-${type}`;
  byId('my-feature-content').innerHTML = `
    <div class="feature-summary">${view.summary}</div>
    <section class="feature-card-list">
      ${rows}
    </section>`;
  byId('my-feature-subview').classList.add('open');
  const featureScroll = byId('my-feature-subview').querySelector(':scope > .scroll');
  featureScroll.scrollTop = 0;
  syncScrollChrome(featureScroll);
  byId('close-my-feature').focus();
}

function closeMyFeature() {
  byId('my-feature-subview').classList.remove('open');
  syncScrollChrome(byId('screen-08').querySelector(':scope > .scroll'));
  document.querySelector('[data-my-view]')?.focus();
}

document.querySelectorAll('[data-my-view]').forEach(button => {
  button.onclick = () => openMyFeature(button.dataset.myView);
});
byId('close-my-feature').onclick = closeMyFeature;
byId('my-feature-content').onclick = async event => {
  const action = event.target.closest('[data-feature-action]');
  if (!action) return;
  const type = action.dataset.featureAction;
  if (type === 'share') {
    const manage = await showDialog({
      title: '管理分享链接',
      copy: '你可以打开名片预览，或停止当前链接的分享。',
      cancel: '停止分享',
      confirm: '查看名片'
    });
    if (manage) route('screen-07');
    else {
      action.closest('.feature-row').remove();
      showToast('分享链接已停止');
    }
    return;
  }
  const confirmed = await showDialog({
    title: type === 'merge' ? '恢复合并前的联系人？' : '恢复这位联系人？',
    copy: type === 'merge' ? '恢复后将重新生成原来的联系人记录。' : '联系人将回到原来的分组和位置。',
    cancel: '取消',
    confirm: '确认恢复'
  });
  if (confirmed) {
    action.closest('.feature-row').remove();
    showToast(type === 'merge' ? '已恢复合并前的联系人' : '联系人已恢复');
  }
};

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && byId('settings-subview').classList.contains('open')) closeSettings();
  else if (event.key === 'Escape' && byId('my-feature-subview').classList.contains('open')) closeMyFeature();
  else if (event.key === 'Escape' && byId('message-detail').classList.contains('open')) closeMessageDetail();
  else if (event.key === 'Escape' && byId('message-subview').classList.contains('open')) byId('close-messages').click();
});

renderHome();
updateUnreadMessages();
renderDetails();
setFormMode('edit');
renderDedup();
renderMerge();
renderShare();
renderSettings();
const dedupBackPlaceholder = document.querySelector('#screen-04 .navbar > span:first-child');
if (dedupBackPlaceholder) {
  dedupBackPlaceholder.outerHTML = '<button class="nav-side" data-back aria-label="返回"><svg><use href="#i-back"></use></svg></button>';
}
const device = byId('device');
function syncScrollChrome(scroll) {
  const progress = Math.min((scroll?.scrollTop || 0) / 80, 1);
  device.style.setProperty('--scroll-progress', progress.toFixed(3));
  device.classList.toggle('is-scrolled', (scroll?.scrollTop || 0) > 0);
  scroll?.closest('.screen')?.classList.toggle('is-scrolled', (scroll?.scrollTop || 0) > 0);
}
document.querySelectorAll('.scroll').forEach(scroll => {
  scroll.addEventListener('scroll', () => {
    const isCurrentScroll = scroll.closest('.screen.active') || scroll.closest('.settings-subview.open') || scroll.closest('.my-feature-subview.open');
    if (!isCurrentScroll) return;
    syncScrollChrome(scroll);
  }, { passive: true });
});
document.querySelectorAll('.tab').forEach(tab => {
  const use = tab.querySelector('use');
  if (!use) return;
      const target = tab.dataset.go === 'screen-01' ? '#i-tab-contacts' : tab.dataset.go === 'screen-03' ? '#i-plus' : tab.dataset.go === 'screen-04' ? '#i-tab-dedup' : '#i-tab-me';
  use.setAttribute('href', target);
});
if (fixture === 'error') {
  byId('form-banner').innerHTML = `<div class="banner danger">${icon('alert')}<span>部分信息保存失败，请检查标红字段后重试。</span></div>`;
}
const start = validScreen(location.hash.slice(1)) ? location.hash.slice(1) : 'screen-01';
route(start, { push: false, hash: false });
if (params.get('login') === 'success') {
  window.setTimeout(() => showToast('登录成功'), 80);
  const cleanUrl = new URL(location.href);
  cleanUrl.searchParams.delete('login');
  history.replaceState(history.state, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
}
const now = new Date();
byId('clock').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
