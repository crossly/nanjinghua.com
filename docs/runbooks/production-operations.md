# Cloudflare 生产运行手册

日期：2026-07-18

## 当前边界

生产服务由 Cloudflare Worker `nanjinghua-com`、D1 `nanjinghua-submissions`、Turnstile 和 GitHub 仓库组成。Git 是正式档案与专题的权威来源，D1 只保存公众线索、联系方式与处理状态。

R2、真人音频、播放器、转写和媒体派生文件尚未进入当前发布范围。本手册不宣称已具备这些对象的生产绑定、独立备份、恢复或撤回能力；加入媒体前必须另做演练。

## 固定环境

```bash
NODE24="$(npx -y node@24.18.0 -p 'process.execPath')"
export PATH="$(dirname "$NODE24"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
```

配置标识：

- Worker：`nanjinghua-com`
- D1 binding：`SUBMISSIONS_DB`
- D1 database：`nanjinghua-submissions`
- 公开变量：`TURNSTILE_MODE`、`TURNSTILE_SITE_KEY`
- Worker secrets：`TURNSTILE_SECRET_KEY`、`EDITOR_API_KEY`
- Cron：每日 UTC 02:00 执行线索保留周期任务

`pnpm run validate:cloudflare` 检查本地声明，`pnpm run validate:cloudflare:remote` 再读取 Cloudflare D1 元数据并逐项比对生产名称与 ID。持久化应用日志已开启，但关闭自动 invocation logs，避免把公开搜索查询字符串作为日志长期保存。

Turnstile 组件需在 Dashboard 逐项核对：组件名 `nanjinghua-submissions`、site key 与 `wrangler.jsonc` 一致、模式为 Managed，hostname 同时包含 `nanjinghua.com` 和 `nanjinghua-com.xflash.workers.dev`。上述项目已于 2026-07-18 核对。`pnpm run validate:secrets` 只能证明 Worker 中存在 `TURNSTILE_SECRET_KEY`，不能读取其值并证明它与组件配对；轮换或迁移后必须在允许的 hostname 完成一次真实验证提交，并立即按测试线索处置。

## 部署与验收

1. 确认工作区干净、`main` 已推送，记录当前 Worker 版本：`pnpm exec wrangler deployments status --json`。
2. 执行完整测试：`pnpm check && pnpm run typecheck && pnpm run test:unit && pnpm exec playwright test`。
3. 只使用 `pnpm run deploy` 发布。命令会构建内容、检查性能预算与生产配置、验证 secrets、应用远端 D1 迁移，再部署 Worker。
4. 记录输出的 Worker Version ID，并检查首页、检索、制度页、线索配置接口和 `sitemap.xml`。
5. 检查正式域名不含 `X-Robots-Tag: noindex`、Worker 预览域名包含该响应头，并核对规范 URL、尾斜杠重定向与 Analytics 只注入一次。

`nanjinghua.com` 已于 2026-07-18 作为 Worker custom domain 绑定并完成 HTTPS 验证。域名可达不等于中国大陆正式上线；在多个中国大陆真实网络完成稳定性验收前，仍只发布为非音频预览。

部署不会自动回滚 D1。迁移必须保持向前兼容；删除或重命名列前先完成独立导出和恢复演练。

## 回滚

```bash
pnpm exec wrangler deployments list
pnpm exec wrangler rollback PREVIOUS_VERSION_ID --message "incident reason" --yes
```

回滚后复验首页、检索、`/api/submissions` 配置响应和受编辑凭证保护的线索读取。若新版本已经写入旧版本不理解的数据，先停止写入并评估 D1；不要用 Worker 回滚假装数据库也已回滚。

D1 误写优先使用 Time Travel 查询恢复点：

```bash
pnpm exec wrangler d1 time-travel info nanjinghua-submissions --timestamp ISO_TIMESTAMP
pnpm exec wrangler d1 time-travel restore nanjinghua-submissions --timestamp ISO_TIMESTAMP
```

执行远端恢复前必须再导出当前状态、记录 incident、确认恢复时间点并安排提交入口维护窗口。

## 密钥轮换

1. 在 Turnstile 控制台生成或确认新 secret 与当前 site key 属于同一组件，模式为 Managed，并允许 `nanjinghua.com` 和 Worker 预览域名；不得把 secret 写入操作记录。
2. 依次运行 `pnpm exec wrangler secret put TURNSTILE_SECRET_KEY` 和 `pnpm exec wrangler secret put EDITOR_API_KEY`；不要把值写入 Issue、日志、shell history 或仓库。
3. 每次只轮换一个值，运行 `pnpm run validate:secrets`，再从允许的 hostname 完成一次真实 Turnstile 测试线索与编辑读取；仅看到 secret 名称不能证明新值与 site key 配对。
4. 确认新值工作后撤销旧值，并把日期、责任人和验证结果写入受限运维台账。

## Git 与 D1 备份

目标目录必须位于加密、访问受限且不自动同步到公开云盘的存储中。脚本使用 `0700` 目录和 `0600` 文件权限，并拒绝脏工作区与非空目标目录。

```bash
pnpm ops:backup -- /encrypted-backup/nanjinghua/2026-07-18T180000Z
```

输出包含 Git bundle、D1 SQL、逐表行数和 SHA-256 清单。脚本会先把导出的 D1 SQL 导入隔离的本地状态并记录其中四张业务表的行数；D1 导出可能含联系方式，不得进入 Git。完成后把一份副本移到平时断开的加密介质，另一份保留在独立受限存储，并记录保管人与销毁周期。

每次正式发布前做 Git bundle；D1 至少每周导出一次，并在重大迁移、批量处置和密钥轮换前额外导出。Cloudflare D1 Time Travel 只作为平台内恢复层，不代替独立导出。

## 隔离恢复演练

```bash
pnpm ops:restore-drill -- /encrypted-backup/nanjinghua/2026-07-18T180000Z
```

脚本先核对清单，再把 Git 克隆和 D1 导入系统临时目录；它不会写远端 D1。通过条件是 Git HEAD、内容数量和 D1 四张业务表的逐表行数都与备份清单一致。演练临时目录在结束时删除，备份原件不修改。

已完成的非音频演练见 [2026-07-18 恢复记录](./drills/2026-07-18-non-audio-restore.md)。该记录中的 `.ops/` 副本只证明恢复流程可执行，不替代独立离线备份。

## 性能与统计

`pnpm run performance:check` 限制入口 JavaScript、CSS 和首页图片体积，并拒绝 Google Fonts 或远程 CSS `@import`。正文使用系统字体，公开页面可在脚本加载较慢时先呈现预渲染内容。

Cloudflare Web Analytics 已于 2026-07-18 在 Dashboard 为 `nanjinghua.com` 启用自动注入和 Real User Measurements，只允许无 Cookie 聚合统计，不加入广告、跨站追踪、用户画像、会话回放或表单事件。统计控制台属于人工配置，站点 token 只记入受限运维台账。

正式域名前台已于 2026-07-18 用真实浏览器确认 `beacon.min.js` 只注入一次，且隐私政策披露与实际配置一致。后续发布仍需检查 History API 导航和 Core Web Vitals；`workers.dev` 预览域名不属于这个统计站点。不要在公开记录、日志或仓库中输出 beacon token。

## 撤回与故障排查

内容撤回遵循 `docs/runbooks/rights-withdrawal.md`。D1 最终处置不会自动改写 Git；必须完成内容变更、发布和公网复验。

常用只读检查：

```bash
pnpm exec wrangler deployments status --json
pnpm exec wrangler versions list
pnpm exec wrangler d1 migrations list nanjinghua-submissions --remote
pnpm exec wrangler tail nanjinghua-com --status error
```

- 5xx：先确认当前版本和 D1 binding，再查看不含个人内容的错误日志；必要时回滚 Worker。
- 表单不可用：检查 `/api/submissions`、Turnstile hostname 与 secret 配对、D1 binding 和迁移状态。
- 内容错误：修正 Git 内容并走完整发布，不直接改构建产物。
- Cron 异常：用本地 `cdn-cgi/handler/scheduled` 复现；生产只记录线索编号和汇总，不记录联系方式。
- 自定义域名异常：分别检查 DNS 代理、Worker custom domain、Universal SSL 状态和证书；`workers.dev` 正常不能证明正式域名可用。
