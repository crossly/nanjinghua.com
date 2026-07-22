# 2026-07-20 非语音只读交付验证记录

## 发布定位

本次已将 `https://nanjinghua.com` 恢复为全球非音频预览的规范地址，并让 `https://www.nanjinghua.com` 以 `308` 永久跳转到裸域且保留路径与查询。网站不称为正式首发或中国大陆正式上线。语音采集、真人音频、播放器、转写、R2 媒体及其直接依赖按产品决定停止后续实施与验收；没有使用合成音、静音或未授权音频替代。全球预览仍保留此前已交付的 `/recording-kit`、采集包下载和“录音意愿”线索类型，但当前不据此开展真人材料采集，也不把这些既有入口计入本轮完成范围。

本次部署保持全球 Worker 的既有动态能力，同时新增一个与生产配置隔离的只读静态构建 PoC，为后续获批的中国网络交付验证公开内容边界。PoC 不是部署命令，也没有进入当前全球生产路由。

## 内容与部署版本

- 1 个完整专题集合“南京话是什么？”，包含 6 篇署名专题。
- 1 篇集合外的证据方法辅助专题。
- 20 条正式档案条目，永久编号为 `NJH000001` 至 `NJH000020`。
- 8 个公开制度页面，以及浏览、搜索、筛选、单条结构化导出和线索提交入口。
- 0 个真人语音样本。
- 已部署源代码提交：`36ca804c34106753002f342d3052e8c2b5089308`。
- Cloudflare Worker Version ID：`5656cbfa-9c89-4c96-8cc4-dfbce03bc0d9`（版本 28），创建于 `2026-07-22T03:25:00.99416Z`。
- Cloudflare Deployment ID：`cdd0510e-dbe4-4c5e-b032-b5649fc77fb0`，自 `2026-07-22T03:25:03.231015Z` 起承载 100% 流量。

## 只读静态 PoC

`pnpm run build:readonly-static` 生成隔离的 `dist/readonly-static`：

- 预渲染首页、专题、档案详情、政策页与可水合的 `/browse`。
- 提供 20 条 CC0 Dublin Core JSON 档案导出。
- 排除 `/contribute`、`/api/submissions`、`/recording-kit`、采集包下载和采集页独立客户端 chunk。
- 严格静态服务器不提供 SPA fallback；未知路径和被排除路径返回 404。
- 构建会在成功或失败后恢复原有 `dist` 与 `.wrangler/deploy`，不会污染普通生产构建。

全球生产契约没有改变：档案页面继续使用 `/api/archive/*`，`wrangler.jsonc` 没有增加 `/exports/*`。部署后 `https://nanjinghua.com/exports/NJH000015.json` 返回 404，证明静态 PoC 未被误发布到全球 Worker。

## 验收证据

- `pnpm check`、`pnpm run typecheck` 与 `git diff --check` 通过；Biome 只有 48 条既有 CSS specificity warning。
- 80 个单元测试通过。
- 76 个 Worker 浏览器测试通过，2 个条件性用例跳过。
- 4 个严格静态桌面/移动浏览器测试通过。
- `pnpm run ops:verify` 通过：远端 D1 名称与 ID、2 个 Worker secret、无待执行迁移、生产 dry-run 和性能预算均正常。
- 部署后的 `/`、专题、`/browse?q=nanjing%20baiju`、`/api/archive/NJH000015`、`/api/submissions`、`/sitemap.xml`、`/robots.txt`、manifest、哈希资源和首页图片均为 200；`2026-07-22T03:28Z` 后再以真实 Chromium 读取渲染结果，首页可见“南京话的历史”，专题可见“南京话是什么？”及对象边界说明，搜索保留 `nanjing baiju` 并可见“南京白局”。三个页面的 canonical 分别指向裸域首页、专题地址和不带查询的 `/browse`。
- `www` 的普通页面、哈希资源和 `robots.txt` 均以 308 保留路径与查询跳到裸域；HTTP 裸域和 HTTP `www` 也直接以 308 跳到裸域 HTTPS。隔离 PoC 的 `/exports/NJH000015.json` 在线上保持 404。
- 正式域名不含 `X-Robots-Tag`，Workers 预览域名的首页和 `robots.txt` 均包含 `noindex, nofollow`。
- 上一版本部署后约一分钟的全球传播期曾观察到新旧版本混合，随后普通路径稳定到新版本。Cloudflare Managed `robots.txt` 另行绕过 Worker；于 `2026-07-22T02:52Z` 在 AI Crawl Control / Signals 关闭后，连续 5 轮验证裸域返回仓库规则且 `www/robots.txt` 正确 308；当前版本部署后的线上矩阵仍保持该行为。
- 上一生产版本的 `pnpm ops:validate:mainland` 在 `2026-07-22T02:55:37Z` 至 `02:56:17Z` 曾取得 36/36。当前版本部署后于 `2026-07-22T03:28:23Z` 至 `03:30:42Z` 重跑同一门禁，深圳电信 AS4134 与长沙联通 AS4837 各 12/12，上海移动 AS9808 对首页、专题、搜索和线索 API 的 12 次请求全部超时，总计 24/36；命令以状态码 1 正确拒绝验收。
- 新增地址级诊断命令后，于 `2026-07-22T03:49:17Z` 至 `03:49:35Z` 从同一上海移动探针复验：系统递归 DNS 正常返回两个 Cloudflare A 地址；`104.21.10.37` 的保留 Host/SNI HTTPS 为 200，`172.67.189.230` 的同等请求超时且 TCP MTR 未到达目标。四个测量 ID 与安全化路径摘要见[固定三网恢复复验](./2026-07-20-mainland-recovery-recheck.md)。失败发生在 Worker 之前，不能通过 TanStack 路由或 D1 改动修复。
- Headless 终端工具冒烟完成首页、专题、搜索表单真实提交、规范 URL 和离线恢复；4 个页面检查全部通过，搜索返回 7 条结果。报告因当前出口 AS41378、HK/TW 位置、仅 1 轮及缺少两项人工声明而以状态码 1 正确拒绝，不计入真实三网。工具只忽略可选的同源 `ping /cdn-cgi/rum` 统计信标失败；其他同源网络失败或 HTTP `>=400` 响应（包括 API），以及人工复核期间出现的延迟资源、控制台和页面错误，仍会在关闭复核标签页后重新汇总并阻断验收。

## 已知限制与停止线

- 2026-07-20 从当前工作网络再次复验时，首页与档案 API 返回 200，但 `/browse?q=nanjing%20baiju` 在四次请求中出现两次 20 秒连接超时；另两次返回 200 且正文签名正确。当前网络身份未被独立验证，不能把这组结果归因到具体运营商，但它再次证明单次 smoke 不能替代稳定性验收。
- 历史三网自动探针曾在上海移动居民线路稳定复现超时；单次恢复不能抹去该回归证据。
- [固定三网恢复复验](./2026-07-20-mainland-recovery-recheck.md)已将移动回归点固定到上海：首个窗口 36/36，第二窗口 35/36；把 `www` 设为规范内容域后的第三窗口只有 24/36。恢复裸域后的第四窗口短暂取得 36/36，但第五窗口再次降为 24/36，上海移动对裸域四条路径的 12 次请求全部超时。标准 Cloudflare 路径未通过跨时间稳定性和真实终端验收。
- 继续中国网络实施前仍需真实 ICP 状态、Cloudflare Enterprise + China Network 权益和付费批准、JD Cloud 内容审核、账户团队书面拓扑确认，以及不依赖 Turnstile 的大陆提交决策。
- 还需在中国电信、联通、移动至少三个真实终端网络完成浏览器验收。
- `pnpm ops:validate:terminal -- <telecom|unicom|mobile>` 已把真实终端验收收敛为可审计命令：固定校验 ASN 和 CN 位置，执行三轮非音频页面、资源、规范 URL 和离线恢复，分别要求可见页面确认与目标运营商直连声明，并从报告中排除客户端 IP。当前工作连接的 headless 冒烟证明页面路径可执行，但因出口身份不符、仅一轮且缺少两项声明被正确拒绝，不计入三网结果。
- Git 与 D1 的加密备份和隔离恢复流程已经验证，但当前没有独立外接介质，也没有将持久密钥与备份交由不同保管人，因此独立离线备份仍未完成。
- R2、真人音频、播放器、转写、原始/派生媒体、媒体备份恢复及媒体撤回继续延期。
- 全球预览中的既有采集包和“录音意愿”入口仍可访问，但当前不开展后续采集；只读中国交付候选会继续排除这些入口。

维护入口：

- `docs/runbooks/production-operations.md`
- `docs/runbooks/rights-withdrawal.md`
- `docs/releases/2026-07-19-mainland-access-check.md`
- `docs/research/cloudflare-china-network-delivery.md`
- GitHub Issue #19 与 #20
