# Cloudflare 生产运行手册

日期：2026-07-18；最近复验：2026-07-22

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

Turnstile 组件需在 Dashboard 逐项核对：组件名 `nanjinghua-submissions`、site key 与 `wrangler.jsonc` 一致、模式为 Managed，hostname 同时包含 `www.nanjinghua.com`、`nanjinghua.com` 和 `nanjinghua-com.xflash.workers.dev`。上述项目已于 2026-07-21 核对。`pnpm run validate:secrets` 只能证明 Worker 中存在 `TURNSTILE_SECRET_KEY`，不能读取其值并证明它与组件配对；轮换或迁移后必须在允许的 hostname 完成一次真实验证提交，并立即按测试线索处置。

## 部署与验收

1. 确认工作区干净、`main` 已推送，记录当前 Worker 版本：`pnpm exec wrangler deployments status --json`。
2. 执行完整测试：`pnpm check && pnpm run typecheck && pnpm run test:unit && pnpm exec playwright test`。
3. 只使用 `pnpm run deploy` 发布。命令会构建内容、检查性能预算与生产配置、验证 secrets、应用远端 D1 迁移，再部署 Worker。
4. 记录输出的 Worker Version ID，并检查首页、检索、制度页、线索配置接口和 `sitemap.xml`。
5. 检查正式域名不含 `X-Robots-Tag: noindex`、Worker 预览域名包含该响应头，并核对规范 URL、尾斜杠重定向与 Analytics 只注入一次。

`nanjinghua.com` 与 `www.nanjinghua.com` 已作为 Worker custom domain 绑定并完成 HTTPS 验证。`www` 以 `308` 永久跳转至 `https://nanjinghua.com` 并保留路径和查询参数；每次发布都必须在线复验，不能仅凭仓库配置宣称生效。AI Crawl Control / Signals 下的 Managed `robots.txt` 必须保持关闭，否则 Cloudflare 会直接接管两个 hostname 的 `/robots.txt`，导致 `www/robots.txt` 绕过 Worker 重定向。2026-07-19 的[中国大陆三网访问验收](../releases/2026-07-19-mainland-access-check.md)发现上海移动居民线路可以连续复现请求超时，因此仍只发布为非音频预览；不得用其他网络成功掩盖该失败。

当前生产源提交为 `36ca804c34106753002f342d3052e8c2b5089308`；Worker Version `5656cbfa-9c89-4c96-8cc4-dfbce03bc0d9`（版本 28）由 Deployment `cdd0510e-dbe4-4c5e-b032-b5649fc77fb0` 自 `2026-07-22T03:25:03.231015Z` 起承载 100% 流量。最终线上矩阵、Managed `robots.txt` 修复和大陆探针复发证据见[非语音只读交付验证记录](../releases/2026-07-20-readonly-delivery-proof.md)。

`pnpm run ops:verify` 会先执行普通生产构建，再检查 Cloudflare 资源、secret、远端迁移、Wrangler dry-run 和性能预算。这样即使之前运行过治理夹具或只读静态测试，门禁也不会复用测试模式的 `dist` 或 Wrangler 暂存配置。

### 中国大陆访问门禁

`pnpm ops:validate:mainland` 使用 Globalping 的固定中国大陆居民网络探针，对深圳电信 AS4134、长沙联通 AS4837、上海移动 AS9808 分别检查首页、专题、搜索和非音频线索 API。默认执行 3 轮；每次响应都必须通过国家、城市、ASN、居民网络标签、TLS、HTTP 200 和正文签名检查。同一运营商的其他城市不能替代固定回归点。该命令是独立验收入口，不属于 `pnpm run deploy` 或 `pnpm run ops:verify`，避免当前失败状态阻止发布用于修复交付路径的版本。

```bash
pnpm ops:validate:mainland

# 国内镜像或替代 hostname 复验
NANJINGHUA_MAINLAND_TARGET=mirror.nanjinghua.com pnpm ops:validate:mainland
```

- 状态码 0：全部路径、轮次和运营商通过。
- 状态码 1：站点验收失败；保留 JSON 报告中的测量 ID 和失败原因，不得宣布正式上线。
- 状态码 2：参数错误、Globalping API 故障或测量超时；不能据此判定站点通过或失败。

可通过 `GLOBALPING_TOKEN` 提高 API 配额；脚本不会把 token 写入报告，并会在创建客户端后从进程环境删除。`NANJINGHUA_MAINLAND_ROUNDS` 和 `NANJINGHUA_MAINLAND_DELAY_MS` 只用于受控复验，不得通过减少轮数掩盖稳定性问题。自动社区探针用于可重复筛查，不替代正式上线前至少三个真实终端网络上的手动浏览器验收。

2026-07-20 起的[固定三网恢复复验](../releases/2026-07-20-mainland-recovery-recheck.md)首个窗口三轮 36/36，第二窗口 35/36；把 `www` 设为规范内容域后的第三窗口只有 24/36，上海移动对 `www` 的 12 次请求全部超时。恢复裸域后，`2026-07-22T02:55:37Z` 至 `02:56:17Z` 的第四窗口短暂取得 36/36；当前版本部署后的第五窗口于 `03:28:23Z` 至 `03:30:42Z` 再次降为 24/36，上海移动对裸域四条路径的 12 次请求全部超时。原因未定的 Globalping 调用 `fetch failed` 或当前无匹配探针均按基础设施错误与站点结果分开记录。标准路径未通过跨时间稳定性和真实终端体验门槛，继续保持非音频预览。

### 真实终端浏览器验收

自动社区探针通过后，仍需在直接连接中国电信、联通、移动的三个真实终端上分别执行：

```bash
pnpm ops:validate:terminal -- telecom
pnpm ops:validate:terminal -- unicom
pnpm ops:validate:terminal -- mobile
```

执行前关闭 VPN、代理、iCloud Private Relay 和会改变浏览器出口的安全网关。命令会打开可见 Chromium，默认执行三轮首页、专题、搜索和尾斜杠规范 URL 检查，实际提交一次搜索表单，记录同源脚本、样式、图片、API、控制台错误与耗时，并模拟离线后重新联网。可选的 Cloudflare Web Analytics `ping /cdn-cgi/rum` 失败不计为页面资源失败；其他同源网络失败和 HTTP `>=400` 响应仍会阻断验收。首轮四个页面和恢复页面会一直保留为浏览器标签页；操作者逐项复核后，必须返回终端分别输入 `YES` 确认页面可读和交互正常，并输入 `DIRECT` 声明终端直接连接所选运营商且上述出口改写服务均已关闭。关闭复核标签页后，工具会重新汇总期间出现的延迟资源、控制台和页面错误，再计算最终结果。两项声明互不替代；headless 模式只能冒烟，两项均不能成立。

命令通过目标域名的 `/cdn-cgi/trace` 取得该 Chromium 的实际出口 IP，并只用它向 Team Cymru 查询 ASN。报告不保存或输出客户端 IP，只保存 ASN、AS 名称、聚合前缀、注册国家、Cloudflare 识别国家和 PoP。当前固定验收身份为电信 AS4134、联通 AS4837、移动 AS9808；错误 ASN、非 CN 位置、验收期间网络切换、不是恰好三轮、缺少任一轮页面、资源失败、恢复失败、缺少可见页面确认或缺少直连声明都会以状态码 1 退出。ASN 与 CN 检查只能证明所观察出口，不能单独排除代理；因此直连声明也是正式通过条件。若真实运营商终端使用其他 ASN，不得手工改报告或仅凭运营商名称放行；先保存失败报告并以注册信息和运营商材料单独审查是否扩展允许身份。

每次证据写入被 Git 忽略的 `test-results/mainland-terminal/<UTC 时间>/`，包含安全化 JSON 报告和首轮页面/恢复截图。若目录创建后的浏览器、网络身份或截图基础设施失败，命令仍写入 `outcome: infrastructure-error`、`passed: null` 的最小化报告；无法创建目录或写入文件时会明确输出错误。提交发布证据前先复核报告不含个人信息，并保留三份通过报告各自的时间、ASN、浏览器版本和截图校验值。状态码 2 表示参数、Cloudflare trace、Team Cymru DNS 或浏览器基础设施错误，不能计作站点通过或失败。

以下命令只验证工具执行路径，不构成真实终端验收：

```bash
NANJINGHUA_TERMINAL_HEADLESS=1 NANJINGHUA_TERMINAL_ROUNDS=1 \
  pnpm ops:validate:terminal -- telecom
```

### 境内替代交付前置

不要把当前 `wrangler.jsonc` 直接复制为所谓境内环境。Cloudflare China Network 需要 Enterprise 套餐上的独立订阅、有效 ICP 备案或许可证、China Service 补充条款和 JD Cloud 内容审查；首次启用还需账户团队协助。项目负责人必须先提供或确认：

1. `nanjinghua.com` 的备案主体、ICP 备案号与当前有效状态，并准备在页脚展示备案号。
2. Cloudflare Enterprise、China Network 和必要时 Global Acceleration 的合同权益，以及负责接入的账户团队联系人。
3. JD Cloud 内容审查所需的主体、域名、备案号、网站说明和签署材料。
4. 账户团队对 TanStack Start Worker、静态 Assets、全球 Worker/D1 动态源站与 China Network 之间实际路由的书面确认。

截至 2026-07-19，Cloudflare 官方清单列出 Workers、Assets、Secrets 等 China Network 能力，但没有列出 D1、Cron Triggers、Workers Observability 持久化日志或 Cloudflare Web Analytics；FAQ 明确 Turnstile 在中国大陆不受支持。不得在没有新 ADR、数据保护评估和外部行为测试的情况下把 D1 改成 KV、取消防滥用校验或接入第三方表单。候选方案是让预渲染公开内容与静态资产在境内交付，并由 Global Acceleration 处理需要返回全球 Worker 的动态请求；它仍需账户团队验证，不能仅凭文档推定可用。

只读静态构建 PoC 已提供独立入口：

```bash
pnpm run build:readonly-static
pnpm run preview:static
pnpm run test:static
```

产物位于 `dist/readonly-static`，包含预渲染公开页面、可水合的 `/browse` 和 20 条 CC0 JSON 档案导出。它不暴露 `/contribute`、`/api/submissions`、`/recording-kit` 或采集包下载，并剔除采集页面的独立客户端 chunk；严格静态预览不会用 SPA fallback 掩盖缺失路径。桌面和移动 Chromium 测试会验证查询恢复、组合筛选、无 hydration 错误、导出内容及这些路径的 404 响应。

该命令只生成并验证本地产物：构建期间会暂存并在结束或失败后恢复原有 `dist` 与 `.wrangler/deploy`，只替换 `dist/readonly-static`。它不得复制生产 secret、连接生产 D1，不会创建 China Network zone，也不会处理 DNS、证书、ICP 页脚、缓存或日志。它不是中国网络部署命令，不得把 `dist/readonly-static` 手工上传成未备案或未审核的境内镜像。完整依据和停止线见[Cloudflare 中国网络 / 京东云交付可行性研究](../research/cloudflare-china-network-delivery.md)。

当前 `pnpm run deploy` 只发布既有全球 Worker，并仍是全球生产的唯一发布入口；`build:readonly-static` 没有部署权限，不得替代它。未来如获批中国网络交付，必须先把独立、可回滚且经过审查的目标配置纳入正式发布入口，再用 `NANJINGHUA_MAINLAND_TARGET` 对实际 hostname 执行三轮自动门禁，并从中国电信、联通、移动至少三个真实终端网络检查首页、专题、搜索、规范 URL 和失败恢复状态。中国只读面应确认线索入口确实不存在；若另行批准大陆提交，则必须验收真实提交行为，不能用 API GET 200 代替。

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

1. 在 Turnstile 控制台生成或确认新 secret 与当前 site key 属于同一组件，模式为 Managed，并允许 `www.nanjinghua.com`、`nanjinghua.com` 和 Worker 预览域名；不得把 secret 写入操作记录。
2. 依次运行 `pnpm exec wrangler secret put TURNSTILE_SECRET_KEY` 和 `pnpm exec wrangler secret put EDITOR_API_KEY`；不要把值写入 Issue、日志、shell history 或仓库。
3. 每次只轮换一个值，运行 `pnpm run validate:secrets`，再从允许的 hostname 完成一次真实 Turnstile 测试线索与编辑读取；仅看到 secret 名称不能证明新值与 site key 配对。
4. 确认新值工作后撤销旧值，并把日期、责任人和验证结果写入受限运维台账。

## Git 与 D1 备份

备份格式 v2 使用 AES-256-GCM 分别认证加密 Git bundle 与 D1 SQL。`NANJINGHUA_BACKUP_KEY` 必须是 32 个随机 bytes 的 Base64 表示；密钥存入受限密码管理器或另一件加密介质，不得与备份目录放在一起，也不得写入 Git、Issue、操作日志或 shell history。

目标目录必须位于访问受限、不自动同步到公开云盘且最终会转存到独立介质的存储中。脚本使用 `0700` 目录和 `0600` 文件权限，拒绝脏工作区与非空目标目录。备份和演练前在当前 shell 中静默读入已有密钥，结束后立即移除环境变量：

```bash
read -r -s NANJINGHUA_BACKUP_KEY
export NANJINGHUA_BACKUP_KEY
pnpm ops:backup -- /独立介质/nanjinghua/2026-07-19T180000Z
pnpm ops:restore-drill -- /独立介质/nanjinghua/2026-07-19T180000Z
unset NANJINGHUA_BACKUP_KEY
```

目标目录只包含 `content.git.bundle.enc`、`submissions.sql.enc` 和 `manifest.json`。清单记录密文与明文的大小、SHA-256、随机初始化向量、GCM 认证标签和非秘密密钥指纹，并以从备份密钥派生的 HMAC-SHA256 认证完整清单，防止跨备份拼接；清单不包含密钥。脚本先把导出的 D1 SQL 导入隔离的本地状态，记录四张业务表的行数，再从权限受限的系统临时目录加密到目标目录；成功或失败后都会删除临时明文，失败时也会清理目标目录中的半成品。

D1 导出可能含联系方式。即使已经加密，备份也不得进入 Git；必须把一份副本移到平时断开的独立介质，另一份保留在独立受限存储，并记录保管人、密钥保管人和销毁周期。工作机上的 `.ops/` 副本只能用于演练，不能算作独立离线备份。

每次正式发布前做 Git bundle；D1 至少每周导出一次，并在重大迁移、批量处置和密钥轮换前额外导出。Cloudflare D1 Time Travel 只作为平台内恢复层，不代替独立导出。

## 隔离恢复演练

```bash
read -r -s NANJINGHUA_BACKUP_KEY
export NANJINGHUA_BACKUP_KEY
pnpm ops:restore-drill -- /独立介质/nanjinghua/2026-07-19T180000Z
unset NANJINGHUA_BACKUP_KEY
```

脚本先拒绝越界路径、符号链接和非普通文件，再验证密文大小与 SHA-256、密钥指纹、清单 HMAC 和 GCM 认证标签，最后核对解密后文件的大小与 SHA-256。随后把 Git 克隆和 D1 导入系统临时目录；它不会写远端 D1。通过条件是 Git HEAD、内容数量和 D1 四张业务表的逐表行数都与备份清单一致。演练临时目录在结束时删除，备份原件不修改。恢复工具仍可读取历史 v1 明文备份，但新备份必须使用 v2 加密格式。

当前 v2 演练见 [2026-07-19 加密恢复记录](./drills/2026-07-19-encrypted-non-audio-restore.md)，历史 v1 演练见 [2026-07-18 恢复记录](./drills/2026-07-18-non-audio-restore.md)。两次本机演练都只证明恢复流程可执行，不替代独立离线备份。

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
