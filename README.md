# 购物冷静器 · wait.

先别急着买。把想买的东西放在这里，过几天再决定。

一个无需注册、数据保存在浏览器里的中文网页小工具。界面采用奶油纸色、可可棕、酒红、牛仔蓝和手作拼贴风格。

## 使用

打开 [购物冷静器](https://m1ine9.github.io/shopping-cooldown/)，手机和电脑都可以使用。

1. 点击「加入冷静期」，填写商品名称、价格；链接、图片、理由、冲动原因可选。
2. 选择 24 小时、3 天、7 天或自定义时间（1 分钟至 365 天）。
3. 等待期间，可在详情里记录三个轻量自问的答案，自动保存。
4. 到期后选择「不买了」「再等等」或「还是想买」。
5. 确认决定购买后，才显示商品链接；它不代表已经付款。

支持编辑正在冷静或待决定商品、移除记录、10 秒内撤销移除、历史筛选、月度统计和冲动原因汇总。首次使用为空清单，不含演示商品。

## 数据说明

- 使用 `localStorage`，键为 `shopping-cooldown:v1`。没有账号、后端数据库、分析脚本或云端同步。
- 记录只属于当前浏览器和网站域名。不同设备、浏览器、无痕会话和本地预览之间不共享数据；清除网站数据会丢失记录。
- 用户填写的图片 URL 会直接从对应网站加载，图片请求不发送来源页面地址；点击商品链接会访问对应网站。
- 倒计时依赖绝对结束时间，刷新、关闭网页再打开都不会重置。页面通常每分钟刷新显示，并在到期和回到前台时重新计算。不发送后台通知。
- 本月加入数按加入日期统计；本月没买数量和避免冲动消费金额按最终决定日期统计；冲动来源按本月加入记录统计。日期使用用户设备本地时区。
- 避免冲动消费金额是决定不买的商品标价合计，并非实际储蓄或账户余额。
- 对损坏或未知版本的数据保留原始存储并显示错误，不会用空清单覆盖。写入失败会明确提示，不会显示虚假的保存成功。
- 多标签页通过存储事件同步；每次写入前读取最新记录。极端的同时写入仍受浏览器 localStorage 最后写入规则限制。

## 本地运行

需要 Node.js 22.13+（推荐 Node.js 22 LTS）与 pnpm 11.19.0。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

打开终端中显示的本地网址。

```bash
pnpm test
pnpm typecheck
pnpm build
```

静态站点输出到 `out/`。部署在子目录时，构建前设置 `NEXT_PUBLIC_BASE_PATH=/仓库名`。不要通过双击 HTML 的 `file://` 方式运行。

## GitHub Pages

仓库包含 `.github/workflows/pages.yml`。在 Settings → Pages → Source 选择 **GitHub Actions**。后续每次更新 `main`，工作流将自动执行测试、类型检查、静态构建与发布。

工作流通过 GitHub Pages 提供的 `base_path` 配置路径，因此 Fork 后也能正确加载资源。首次发布前需启用 Pages。可以在 Actions 手动运行工作流。

## 项目结构

```text
app/page.tsx             主清单、历史、商品表单、详情与决策
app/globals.css          基础布局与交互样式
app/scrapbook.css        手作拼贴视觉系统与适配
app/layout.tsx           中文页面信息与元数据
components/ui/          shadcn/ui 对话框和确认框
lib/cooldown.ts          数据校验、状态变化、倒计时、统计
lib/use-cooldown.ts      浏览器持久化与时钟更新
tests/cooldown.test.ts   关键业务边界检查
public/                 本地图片与站点图标
```

技术栈：Next.js 静态导出、TypeScript、Tailwind CSS、shadcn/ui、Radix UI、Lucide、Sonner。UI 组件来自 shadcn/ui 的 MIT 授权组件，依赖库适用各自许可证。

在支持 WebMCP 的浏览器中，渐进增强工具 `start_cooldown_entry` 可打开添加表单；它不自动保存记录。普通浏览器无需支持此 API 即可使用全部功能。

## 视觉素材

`public/hourglass-collage.png` 使用内置 image_gen 生成，是本项目原创的沙漏、纸张与格纹布料拼贴素材；未直接复用参考品牌的名称、标志或海报。

生成提示词：Editorial handmade scrapbook collage, one sculptural cobalt blue glass hourglass with ivory sand on torn cream linen paper, blue gingham and dusty blush striped patches, subtle burgundy pencil swoosh, warm cream background, soft daylight, real paper fibers and textile weave, no text, logos or watermarks.

页面支持键盘操作、清晰焦点、弹窗焦点约束、手机底部面板，以及 `prefers-reduced-motion` 减少动效偏好。

## 字体

标题采用 [得意黑 Smiley Sans](https://github.com/atelier-anchor/smiley-sans)，正文采用 [霞鹜文楷 LXGW WenKai](https://github.com/lxgw/LxgwWenKai)。字体文件随项目自托管，采用 SIL OFL 1.1；许可证保存在 `public/fonts/`。界面字体做了子集优化并将内部名称改为 Shopping Display / Shopping Notes，文楷完整版作为动态商品名称的按需补充。
