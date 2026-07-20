# 2026-07-20 非语音只读交付验证记录

## 发布定位

本次继续把 `https://nanjinghua.com` 作为全球非音频预览，不称为正式首发或中国大陆正式上线。语音采集、真人音频、播放器、转写、R2 媒体及其直接依赖按产品决定停止后续实施与验收；没有使用合成音、静音或未授权音频替代。全球预览仍保留此前已交付的 `/recording-kit`、采集包下载和“录音意愿”线索类型，但当前不据此开展真人材料采集，也不把这些既有入口计入本轮完成范围。

本次部署保持全球 Worker 的既有动态能力，同时新增一个与生产配置隔离的只读静态构建 PoC，为后续获批的中国网络交付验证公开内容边界。PoC 不是部署命令，也没有进入当前全球生产路由。

## 内容与部署版本

- 1 个完整专题集合“南京话是什么？”，包含 6 篇署名专题。
- 1 篇集合外的证据方法辅助专题。
- 20 条正式档案条目，永久编号为 `NJH000001` 至 `NJH000020`。
- 8 个公开制度页面，以及浏览、搜索、筛选、单条结构化导出和线索提交入口。
- 0 个真人语音样本。
- 部署源代码提交：`ddf026e6002a7e4782f411817391c210fddfb8b6`。
- Cloudflare Worker Version ID：`b8cce75c-799c-4cc9-a219-64a63c301906`，100% 流量；Cloudflare 记录的部署时间为 `2026-07-20T04:37:37.979Z`。

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
- 62 个单元测试通过。
- 70 个 Worker 浏览器测试通过，2 个条件性用例跳过。
- 4 个严格静态桌面/移动浏览器测试通过。
- `pnpm run ops:verify` 通过：远端 D1 名称与 ID、2 个 Worker secret、无待执行迁移、生产 dry-run 和性能预算均正常。
- 发布后 `/`、`/browse?q=nanjing%20baiju`、`/api/archive/NJH000015`、`/api/submissions` 与 `/sitemap.xml` 均取得过 200 响应；搜索正文包含“南京白局”。
- 正式域名响应不含 `X-Robots-Tag`；Workers 预览域名保持 `noindex, nofollow`。

## 已知限制与停止线

- 2026-07-20 从当前工作网络再次复验时，首页与档案 API 返回 200，但 `/browse?q=nanjing%20baiju` 在四次请求中出现两次 20 秒连接超时；另两次返回 200 且正文签名正确。当前网络身份未被独立验证，不能把这组结果归因到具体运营商，但它再次证明单次 smoke 不能替代稳定性验收。
- 既有三网自动探针验收仍可在上海移动居民线路稳定复现超时，标准 Cloudflare 交付尚未通过中国大陆稳定性硬门槛。
- 继续中国网络实施前仍需真实 ICP 状态、Cloudflare Enterprise + China Network 权益和付费批准、JD Cloud 内容审核、账户团队书面拓扑确认，以及不依赖 Turnstile 的大陆提交决策。
- 还需在中国电信、联通、移动至少三个真实终端网络完成浏览器验收。
- Git 与 D1 的加密备份和隔离恢复流程已经验证，但当前没有独立外接介质，也没有将持久密钥与备份交由不同保管人，因此独立离线备份仍未完成。
- R2、真人音频、播放器、转写、原始/派生媒体、媒体备份恢复及媒体撤回继续延期。
- 全球预览中的既有采集包和“录音意愿”入口仍可访问，但当前不开展后续采集；只读中国交付候选会继续排除这些入口。

维护入口：

- `docs/runbooks/production-operations.md`
- `docs/runbooks/rights-withdrawal.md`
- `docs/releases/2026-07-19-mainland-access-check.md`
- `docs/research/cloudflare-china-network-delivery.md`
- GitHub Issue #19 与 #20
