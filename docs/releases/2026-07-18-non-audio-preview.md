# 2026-07-18 非音频预览发布记录

## 发布定位

本次把 `https://nanjinghua.com` 作为规范 HTTPS 地址接入 Cloudflare Worker，但只发布为**非音频预览**，不称为正式首发。语音采集、真人音频、播放器、转写、R2 媒体及其直接依赖均按产品决定延期；没有用合成音、静音或未授权音频填补数量。

## 内容范围

- 1 个完整专题集合“南京话是什么？”，包含 6 篇署名专题。
- 1 篇集合外的证据方法辅助专题。
- 20 条正式档案条目，永久编号为 `NJH000001` 至 `NJH000020`。
- 8 个公开制度页面，以及浏览、搜索、筛选、单条结构化导出和线索提交入口。
- 0 个真人语音样本。

## 域名与运行验证

- `nanjinghua.com` 已绑定为 Worker custom domain，HTTPS 首页返回 200。
- 规范 URL 使用 `https://nanjinghua.com`，公开内容统一为无尾斜杠路径。
- 正式域名内容页面允许索引；Worker 预览域名和本地预览的内容页面通过 `X-Robots-Tag: noindex, nofollow` 禁止索引。
- `robots.txt` 与 `sitemap.xml` 均指向正式域名。
- Cloudflare Web Analytics 已在正式域名真实浏览器中确认只注入一次；Turnstile 脚本和响应字段已加载。

## 部署与验收证据

- 部署源代码提交：`782339a`，通过唯一发布入口 `pnpm run deploy` 部署。
- Cloudflare Worker Version ID：`76cd1e8e-2d45-4c11-a863-d92e506495d8`，100% 流量。
- `pnpm check` 与 `pnpm run typecheck` 通过；Biome 仅报告 48 条既有 CSS specificity 警告，本轮没有修改 CSS。
- 56 个单元测试通过；70 个真实 Worker 浏览器测试通过，2 个依赖条件的用例跳过。
- `pnpm run ops:verify` 通过：远端 D1 名称与 ID、2 个 Worker secret、无待执行迁移、部署 dry-run 和性能预算均通过。
- 部署构建性能：入口 JavaScript 545,669 bytes / gzip 175,343 bytes，CSS gzip 7,758 bytes，首页图片 1,760,591 bytes。
- 正式域名 smoke：`/`、专题、搜索、隐私政策、`/api/submissions`、`sitemap.xml`、`robots.txt` 和关键静态资源均返回 200；HTTP 请求以 308 保留路径与查询跳转 HTTPS，尾斜杠内容路径以 307 跳转无尾斜杠地址。
- 正式域名响应不含 `X-Robots-Tag: noindex`，Worker 预览内容响应包含 `noindex, nofollow`。
- 生产浏览器确认首页 title、H1、canonical、0 个音频元素和 0 横向溢出；Analytics 只注入一次，Turnstile 脚本与响应字段已加载。没有代做 CAPTCHA，也没有为验收写入生产线索；线索 POST 201 由本地 Worker 浏览器套件验证。

## 已知限制

- 尚未从多个中国大陆真实网络验证首页、专题、搜索和长期稳定性，不能据此宣布中国大陆正式上线。
- 当前香港出口的并行 smoke 中，`/api/submissions` 曾有 1 次 20 秒连接超时，随后两次立即重试均返回 200；这不能替代多网络长期稳定性验收。
- 尚未把 Git 与 D1 生产备份转存到独立、加密、离线介质。
- R2、原始与派生音频、媒体备份恢复和媒体撤回均未进入当前范围。
- 真人原创语音仍是正式首发的外部依赖；Issue T18 与 T19 保持开启。

维护入口：`docs/runbooks/production-operations.md`、`docs/runbooks/rights-withdrawal.md`、GitHub Issue #19 与 #20。
