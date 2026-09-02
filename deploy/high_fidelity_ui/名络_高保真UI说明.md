# 名络 · 智能通讯录｜高保真移动端 UI 说明

## 全局视觉与交互约束

- 画布：iPhone 390 × 844pt，顶部 44pt 状态区，底部 34pt Home Indicator 安全区。
- 页面左右边距 20pt；大模块圆角 16pt、普通卡片 12pt、输入 8pt、标签与主 CTA 使用胶囊形态。
- 主色 `#246BFA`；按压色 `#1557E5`；页面底色 `#F5F6FA`；卡片 `#FFFFFF`；顶部呼吸渐变 `#EDF4FF → #F8FBFF`。
- 页面标题 28/34、700；模块标题 18/26、600；Cell 主信息 16/22、600；正文 14–15；辅助信息 11–13。
- 点击反馈：按钮按压 120ms，缩放至 0.97 并切换 pressed 色；卡片按压降低阴影并轻微下沉 1pt。
- 页面转场：列表到详情、排重列表到字段确认使用 iOS push；编辑页使用全屏 modal；号码选择、字段选择使用 Bottom Sheet；删除、停止分享、覆盖撤销使用 Modal。
- 动效：仅 transform 与 opacity，标准进入 220ms ease-out；Toast/Undo Bar 180ms；支持 Reduce Motion。

## 01 联系人首页

- 页面布局：浅蓝头图区包含品牌、消息、新增、页面标题和搜索；内容区先展示唯一高优先级排重任务卡，再进入白色连续联系人列表；固定三栏 Tab。
- 组件结构：Header Tools、Search、Task Card、Contact Cell、A–Z Index、Bottom Tab。
- 主视觉层级：联系人标题 → 搜索 → 12 组重复提醒 → 连续联系人列表。
- CTA 位置：新增位于右上 44pt 点击区；“去核对”位于任务卡右侧；电话快捷操作位于 Cell 右侧。
- 状态层：loading 使用头像与两行文字骨架；empty 展示“还没有联系人”并提供“导入通讯录/新增联系人”；error 使用浅蓝权限 Banner 与“去设置”。
- 滚动逻辑：头图随列表上滑，搜索吸顶；A–Z 索引固定；下拉同步联系人。
- 安全区域：顶部工具不侵入状态栏；底部内容预留 82pt Tab + Home Indicator。
- 底部操作区：默认 Tab；长按进入多选后替换为批量操作栏。

## 02 联系人详情页

- 页面布局：原生导航 → 浅色名片头部 → 四宫格高频操作 → 相似联系人提示 → 联系信息分组。
- 组件结构：Avatar、Identity Header、Action Grid、Warning Banner、Info Group、Contact Rows。
- 主视觉层级：姓名与公司职位 → 拨号/短信 → 电话号码 → 其他字段。
- CTA 位置：拨号、短信、邮件、分享位于首屏拇指可达区域；编辑位于右上。
- 状态层：loading 为头像与字段骨架；empty 字段不展示空行；error 触达失败时 Toast 并提供复制号码。
- 滚动逻辑：身份头部上滑收起，导航标题切换为联系人姓名；长备注折叠三行后展开。
- 安全区域：顶部导航 44pt；底部无固定条，内容保留 34pt 安全距离。
- 底部操作区：无常驻 CTA；多号码点击后从底部弹出 Action Sheet。

## 03 新增 / 编辑联系人页

- 页面布局：取消/标题导航 → 头像 → 多个白色 Form Group → 固定保存 CTA。
- 组件结构：Photo Picker、Form Group、Dynamic Phone Row、Tag Chip、Toggle、Primary Button。
- 主视觉层级：姓名与主号码 → 公司职位 → 扩展字段 → 同步设置。
- CTA 位置：保存联系人固定在底部；动态添加字段位于对应表单组尾部。
- 状态层：loading 仅编辑回填时使用骨架；empty 保留最少姓名与联系方式；error 字段内联标红并定位首个错误。
- 滚动逻辑：键盘弹起时保存按钮贴键盘上沿；当前输入自动滚入可视区。
- 安全区域：底部固定区含 29pt 下边距；键盘态改用键盘安全区。
- 底部操作区：仅一个蓝色胶囊保存按钮；无有效联系方式时 disabled。

## 04 重复联系人扫描结果页

- 页面布局：原生导航 → 扫描摘要大卡 → 确定/疑似分段控件 → 重复组列表 → 固定 Tab。
- 组件结构：Stats Card、Progress、Segmented Control、Duplicate Group Card、Reason Chip、Mini CTA。
- 主视觉层级：12 组待核对 → 确定重复 8 → 第一组推荐记录 → 核对并合并。
- CTA 位置：每组卡片右下；记录入口位于右上。
- 状态层：loading 显示实时扫描进度与取消；empty 展示“通讯录很干净”；error 展示“扫描中断，已保留结果”与继续扫描。
- 滚动逻辑：摘要卡上滑，分段控件吸顶；切换 Tab 保留各自滚动位置。
- 安全区域：列表底部预留 Tab 高度；角标不进入 Home Indicator。
- 底部操作区：默认 Tab；多选批量合并时替换为固定确认 CTA。

## 05 字段级合并确认页

- 页面布局：导航 → 来源说明 → 变更摘要 → 主记录/号码/公司职位字段组 → 固定确认 CTA。
- 组件结构：Source Banner、Merge Field Group、Radio/Checkbox、Recommendation Chip、Summary、Primary Button。
- 主视觉层级：合并影响说明 → 主记录 → 默认全选电话号码 → 确认合并。
- CTA 位置：底部固定“确认合并（保留 6 项）”；跳过位于右上。
- 状态层：loading 在执行阶段锁定字段并显示按钮进度；empty 不可能进入；error 事务回滚并提示“数据未受影响”。
- 滚动逻辑：字段组纵向滚动；确认前显示即时保留项计数；超上限弹字段取舍 Bottom Sheet。
- 安全区域：底部内容预留 108pt，避免被操作区遮挡。
- 底部操作区：唯一强 CTA；字段不合法时 disabled，返回有改动时弹放弃确认 Modal。

## 06 合并完成与撤销反馈页

- 页面布局：成功图标 → 结果标题 → 双数据统计 → 本地恢复说明 → 后续操作 → 底部 Undo Bar。
- 组件结构：Success Result、Stats Strip、Trust Note、Primary/Secondary Buttons、Undo Snackbar。
- 主视觉层级：合并完成 → 8 组/24 项结果 → 继续处理 → 10 秒撤销。
- CTA 位置：主按钮位于结果区下方；撤销固定在深色 Undo Bar 右侧。
- 状态层：loading 为执行合并的确定性进度；empty 不适用；error 显示回滚结果与“重新尝试”。
- 滚动逻辑：短内容不滚动；小屏时结果区可滚动，Undo Bar 始终固定。
- 安全区域：Undo Bar 距底部 33pt；Home Indicator 在深色条下方清晰可见。
- 底部操作区：Undo Bar 最高层级，10 秒后自动退场；仍可在 90 天合并记录中恢复。

## 07 分享名片设置页

- 页面布局：导航 → 名片预览 → 可见字段组 → 敏感字段提示 → 有效期 → 固定微信分享 CTA。
- 组件结构：Business Card Preview、Checkbox Rows、Warning Note、Radio Rows、Primary Button。
- 主视觉层级：对外名片预览 → 可见字段 → 有效期 → 分享到微信。
- CTA 位置：底部固定；至少保留姓名和一项联系方式后可用。
- 状态层：loading 为生成链接进度；empty 无联系方式时提示返回补充；error 保留选择并提供重试/复制链接。
- 滚动逻辑：设置区滚动，名片预览可随滚动收起；字段修改实时更新预览。
- 安全区域：底部固定区含 29pt 安全下边距。
- 底部操作区：只显示一个主分享 CTA；分享渠道列表在点击后用系统 Share Sheet。

## 08 个人中心 / 设置页

- 页面布局：浅蓝个人头部 → 三项工具数据 → 数据与安全模块 → 偏好设置 → 固定 Tab。
- 组件结构：Profile Header、Stats Strip、Settings Group、Setting Row、Toggle、Status Chip。
- 主视觉层级：本地数据承诺 → 合并/分享/回收站状态 → 同步与记录 → 偏好设置。
- CTA 位置：设置项整行可点；危险操作进入详情页后使用红色明确 CTA。
- 状态层：loading 使用整组骨架；empty 数据统计显示 0；error 同步失败在行内显示红色状态和“重试”。
- 滚动逻辑：头部正常滚动，Tab 固定；进入二级页使用原生 push。
- 安全区域：底部内容预留 82pt；Tab 含 Home Indicator。
- 底部操作区：固定三栏 Tab，当前“我的”以深色文字和蓝色图标标识。
