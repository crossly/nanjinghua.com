# Cloudflare 中国网络 / 京东云交付可行性

访问日期：2026-07-19

## 结论

`nanjinghua.com` 可以把公开、非音频内容迁入 Cloudflare 中国网络所支持的 Workers + Assets 交付面，但当前 TanStack Start 应用不能把现有 `wrangler.jsonc` 原样启用到中国网络，也不能据此宣称完整功能可用。

决定性原因有三个：

1. Cloudflare 中国网络只向 Enterprise 客户提供独立订阅；有效 ICP 备案或许可证、首页备案号、京东云内容审核及补充条款都是启用前置条件，PoC 也不豁免 ICP 和内容审核。[Cloudflare 概览](https://developers.cloudflare.com/china-network/)；[接入步骤](https://developers.cloudflare.com/china-network/get-started/)；[FAQ](https://developers.cloudflare.com/china-network/faq/)
2. Workers、Assets、环境变量、Secrets 和 Service Bindings 在官方支持清单内；Turnstile 被明确列为中国大陆不支持。D1、Cron Triggers、Workers Observability 持久化日志、Workers Analytics Engine 和 Cloudflare Web Analytics 均不在该清单内。[产品与功能清单](https://developers.cloudflare.com/china-network/reference/available-products/)
3. 当前公开提交链路先验证 Turnstile，再写入 D1；编辑接口和定时保留任务也依赖同一 D1。因此只迁移 Worker 代码会直接破坏提交、编辑和保留任务。静态档案与专题已有预渲染基础，可以先形成不含提交功能的中国交付面。

当前建议是：**把“公开内容静态交付”作为可行方向，把“完整应用原样迁移”判定为不可行；在合同、ICP、京东云审核和产品书面确认完成前停止实施，不改 DNS、不购买服务、不部署中国环境。**

## 研究边界

- 本文只研究当前非音频站点。真人音频、播放器、转写、R2 媒体和其直接依赖均不在本次方案中。
- “Cloudflare 中国网络 / 京东云”指 Cloudflare 的独立 China Network 订阅，其中国大陆数据中心由合作伙伴京东云运营；它不是把 Wrangler 直接指向任意京东云计算产品。[Cloudflare 概览](https://developers.cloudflare.com/china-network/)
- 本文不代替监管、数据跨境、网络安全等级保护或合同法律意见；没有一手依据的能力一律视为未获支持，不用产品名称相似性补全结论。
- 本文依据当前仓库、Cloudflare 官方文档、工信部备案查询入口及现行备案规章的官方文本；没有使用第三方聚合文章作为证据。

## 官方事实

### 订阅、备案与接入

| 事项 | 官方事实 | 对本项目的直接影响 |
| --- | --- | --- |
| 订阅 | China Network 是 Cloudflare Enterprise 客户的独立订阅，不包含在普通计划中。[概览](https://developers.cloudflare.com/china-network/) | 当前免费或低用量的全球 Workers 路线不能自动获得中国网络；必须先取得报价并由负责人批准付费。 |
| 合同 | 接入顺序要求已有 Enterprise、购买 China Network package，并同意 China Service Supplemental Terms；这些步骤需联系销售团队。[接入步骤](https://developers.cloudflare.com/china-network/get-started/) | 不是自助式 `wrangler deploy` 开关，仓库无法自行完成采购或条款接受。 |
| ICP | 每个拟接入的 apex domain 都必须有有效 ICP 备案或许可证；公共站点需展示备案号。[概览](https://developers.cloudflare.com/china-network/)；[ICP 说明](https://developers.cloudflare.com/china-network/concepts/icp/) | `nanjinghua.com` 的备案主体和有效状态必须先核实；仓库目前没有备案号页脚。没有备案号不能进入 PoC。 |
| 备案类型 | Cloudflare 将非商业、非交易的信息站归入 ICP 备案，将销售商品或服务的平台归入 ICP 许可证；个人也在备案适格主体示例中。[ICP 说明](https://developers.cloudflare.com/china-network/concepts/icp/) | 南京话文化档案按当前非交易用途**可能**适用 ICP 备案而非经营许可证；这是初步分类，最终以接入商和主管机关审核为准。 |
| 官方核验 | 工信部提供 ICP/IP 地址/域名信息备案管理系统用于备案查询。[工信部备案系统](https://beian.miit.gov.cn/#/Integrated/recordQuery) | 不能因为域名归本人所有或页脚暂缺备案号就推断备案状态；上线判断必须保存官方查询结果。 |
| 页脚 | 现行规章要求非经营性互联网信息服务依法备案；主页底部标明备案编号，并在编号下链接备案管理系统。2024 年修改删除了“在指定目录放置备案电子验证标识”的要求，但没有删除备案号及链接要求。[备案管理办法官方文本](https://www.cac.gov.cn/2005-02/09/c_1112147171.htm)；[工信部第 68 号令政策解读（商务部官方转载）](https://policy.mofcom.gov.cn/claw/policyInfo.shtml?id=6052) | 中国交付版必须在首页页脚展示真实备案号并链接工信部系统；不得用占位号。无需恢复已取消的电子验证标识目录要求。 |
| 内容审核 | 京东云在启用前审核每个域名，需要客户/公司名、域名、ICP 号、内容说明和签署的自我声明；京东云可接受或拒绝域名。[接入步骤](https://developers.cloudflare.com/china-network/get-started/)；[FAQ](https://developers.cloudflare.com/china-network/faq/) | 即使技术 PoC 通过，也不能绕过域名内容审核。公开历史文化内容应按真实内容提交说明。 |
| 首次启用 | 内容审核完成后接入 zone；首次启用预计需 24–48 小时，之后可在 Cloudflare Dashboard 启停。[接入步骤](https://developers.cloudflare.com/china-network/get-started/) | 变更窗口必须把审核和网络生效时间计入，不能用一次 Wrangler 发布安排上线。 |
| 账户与配置数据 | Cloudflare 表示账户身份、密码哈希和账单信息不会存入中国网络或分享给合作方；为 zone 启用 China Service 后，zone 配置和 Developer Suite bindings 会存入合作方运营的中国网络。[FAQ](https://developers.cloudflare.com/china-network/faq/) | Secrets 虽在支持清单内，仍需在合同和安全评审中明确哪些绑定元数据进入中国网络；本文不推断 secret 明文本身的存储位置。 |

Cloudflare 的 ICP 页面给出 4–8 周的一般备案时间估计，接入步骤还要求在所有拟接入 apex domain 上出示有效记录。[ICP 说明](https://developers.cloudflare.com/china-network/concepts/icp/) 该时间只是厂商说明，不是本项目排期承诺。

### 能力矩阵

Cloudflare 将其产品页定义为“中国网络可用的产品和功能”清单。下表将“明确列出”“明确否定”和“未列出”分开；未列出不被改写成厂商明确否定，但在工程决策上必须按不受支持处理，直到客户团队提供书面确认。[产品与功能清单](https://developers.cloudflare.com/china-network/reference/available-products/)

| 当前能力 | 官方证据 | 判定 | 对现有实现的影响 |
| --- | --- | --- | --- |
| Workers | Developer Services 明确列出 Workers。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 支持产品；具体运行时特性仍需 PoC | TanStack Start SSR Worker 原则上可部署，但 `nodejs_compat`、Cron 等子能力不能因 Workers 总项存在而自动视为支持。 |
| Workers Assets | 明确列出 Assets，可随 Worker 上传 HTML、CSS、图片等静态文件并缓存交付。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 支持 | 公开预渲染 HTML、JS、CSS 和现有图片可以进入候选方案。 |
| CDN/Cache | 明确列出 CDN/Cache，但注明仅静态缓存，不支持 Cache Reserve 或 Tiered Cache。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 支持静态缓存 | 不把 SSR/API 的动态响应当作已获得同等缓存能力；静态公开内容是最稳妥的首阶段。 |
| D1 | D1 未出现在可用产品清单中。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 官方未列出；工程上按不支持原生绑定处理 | `SUBMISSIONS_DB` 不能直接随中国 Worker 复用；提交、编辑、备份、恢复和保留任务需要留在全球后端或重做存储架构。 |
| Turnstile | 官方脚注明确说 Turnstile 在中国大陆不可用；FAQ 进一步说明 China Network zone 和全球 zone 的大陆访客都可能遇到问题。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/)；[FAQ](https://developers.cloudflare.com/china-network/faq/) | 明确不支持 | 不能保留现有提交表单并把失败归咎于偶发网络；中国交付面必须禁用提交，或在另行批准后采用经验证的替代防滥用方案。 |
| 环境变量 | 明确列出 Environment variables。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 支持 | 普通非敏感 `vars` 可迁移；这不使 `TURNSTILE_SITE_KEY` 对应服务变为可用。 |
| Secrets | 明确列出 Secrets。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 支持 | 可以为中国 Worker 配置加密文本值，但不得把“支持 Secrets”解释为 Turnstile 或 D1 也受支持。 |
| Service Bindings | 明确列出 Service bindings，可让一个 Worker 不经公共 URL 调用另一个 Worker。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 支持产品，跨境目标语义未说明 | 当前配置没有 Service Binding；将来是否可借它无缝调用全球 D1 Worker 没有官方依据，不能作为既定迁移路径。 |
| Workers KV | 明确列出 Workers KV。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 支持 | 它不是 D1 的关系数据库等价物；不可只改 binding 名称来维持提交状态、事务和迁移语义。 |
| Cron Triggers | 未出现在可用产品清单中。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 官方未列出；按未支持处理 | 当前每日 D1 保留任务不能假定会在中国网络执行。即使 Cron 获书面确认，D1 仍是独立阻塞。 |
| Workers Observability 持久化日志 | 产品清单列出 Tail Workers、Instant Logs、Logpush，但没有列出 Workers Observability 的持久化日志配置。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 当前配置能力未获证明；有明确支持的日志替代面 | `observability.logs.enabled` 不应原样作为验收门槛；需要由账号团队确认，或改用已列出的 Instant Logs/Logpush/Tail Workers。 |
| Cloudflare Web Analytics | 未出现在可用产品清单中。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 中国网络可用性未获证明 | 全球 zone 已启用的自动注入不能作为中国访问统计保障；静态中国交付首先不依赖 Analytics 成功加载。 |
| Workers Analytics Engine | 未出现在可用产品清单中。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 官方未列出；按未支持处理 | 当前项目没有该 binding，不应把它作为 Web Analytics 的默认替代品。 |
| Pages | FAQ 明确说 Pages 因 `pages.dev` 证书不在中国大陆而不可用，但全球 zone 的 Pages “可能”被延伸进入中国网络。[FAQ](https://developers.cloudflare.com/china-network/faq/) | 不作为直接部署目标 | 静态方案应使用已明确支持的 Workers Assets 或经账号团队批准的源站/CDN组合，而不是新建 Pages 项目。 |
| R2 | 官方说明 R2 bucket 不能在中国大陆创建，custom domain 也不支持；可通过另购 Global Acceleration 延伸。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/) | 本次延期 | 本文不提出任何 R2 或音频方案。 |

## 当前仓库证据

以下是仓库现状，不是外部产品承诺：

- `wrangler.jsonc:3-42` 同时配置了 Worker、Assets、D1、Turnstile 变量、Workers Observability 和 Cron。故“Wrangler 配置可解析”不能证明每个 binding 都能在中国网络运行。
- `src/routes/api/submissions.ts:45-61` 的公开 POST 先调用 Turnstile，再写 `SUBMISSIONS_DB`。两项都是完整提交链路的硬依赖。
- `src/server.ts:15-20` 的每日保留任务由 Cron 调用 D1；`src/routes/api/editor/submissions/` 下的编辑 API 也直接依赖 D1。
- `vite.config.ts` 已启用链接爬取和预渲染；`readonly-static` 模式把 `/browse` 纳入预渲染，同时排除 API、提交、下载、导出文件和录音采集包路径。普通生产构建继续保留 Worker 路由语义。
- 当前 `assets.run_worker_first` 对除静态资源目录外的 `/*` 先运行 Worker；因此已有预渲染文件不等于现有生产路由已经是纯静态源站。
- `pnpm run build:readonly-static` 现可生成隔离的 `dist/readonly-static` 构建 PoC：包含公开页面、可水合的 `/browse` 和 20 条 CC0 JSON 档案导出；不暴露 `/contribute`、`/api/submissions`、`/recording-kit` 或采集包下载，并剔除采集页面的独立客户端 chunk。严格文件服务器没有 SPA fallback，未知或被排除的路径返回 404。
- `tests/static-delivery.static.spec.ts` 已在桌面和移动 Chromium 中验证查询恢复、组合筛选、无 hydration 错误、静态导出和上述 404 边界。该测试只证明本地产物行为，不证明 China Network、ICP、DNS、缓存或真实大陆网络已经可用。

### 能否直接复用 `wrangler.jsonc`

**不能原样复用。** 可以复用的是 Worker/Assets 的代码形态和部分普通变量，而不是整个资源图：

| 配置片段 | 复用判断 | 理由 |
| --- | --- | --- |
| `main`, Worker bundle | 有条件复用 | Workers 在清单内，但 compatibility flag 和运行时行为必须在账号 PoC 中验证。 |
| `assets` | 可作为候选复用 | Assets 明确支持；现有 `run_worker_first` 路由仍需为静态中国面调整。 |
| `d1_databases` | 不可按现状复用 | D1 未列入中国网络支持清单。 |
| `vars` | 普通变量可复用 | Environment variables 明确支持；Turnstile 服务本身仍不支持。 |
| Dashboard / `wrangler secret` 中的 secrets | 有条件复用 | Secrets 明确支持，但目标环境、最小权限和绑定数据处理须重新确认。 |
| `observability` | 不可假定复用 | 产品清单只明确支持另外三种日志能力。 |
| `triggers.crons` | 不可假定复用 | Cron Triggers 未列入清单。 |
| 现有 `pnpm run deploy` | 不能启用中国网络 | 它迁移全球 D1 后运行 Wrangler；合同、ICP、内容审核和 zone 的 China Network enablement 都是控制台/销售流程，且脚本会继续依赖不受支持的 D1。 |

Cloudflare 确实宣称 China Network 可以沿用同一套配置和 Dashboard 体验，并允许使用当前 Cloudflare 账户。[概览](https://developers.cloudflare.com/china-network/)；[FAQ](https://developers.cloudflare.com/china-network/faq/) 这支持“同账户管理”，却不是对任意 Wrangler 字段、现有部署脚本或所有 Developer Platform 产品的兼容保证。官方接入文档也没有提供一个可由 `wrangler.jsonc` 自助开启中国网络的字段。[接入步骤](https://developers.cloudflare.com/china-network/get-started/)

## 可行架构边界

以下全部是基于官方能力清单和仓库现状的**工程推断**，不是 Cloudflare 对本项目的方案承诺。

### A. 中国网络上的公开静态内容面：当前首选

范围：主页、专题、档案详情、政策、静态图片、JS/CSS、CC0 JSON 档案导出，以及已完成的 `/browse` 静态入口；不提供 `/contribute`、编辑 API、D1、Turnstile、定时保留任务或音频。

依据：Workers 和 Assets 明确可用，China Network CDN 明确支持静态缓存；当前 TanStack 构建已生成大部分公开页面。该方案保留 TanStack/React 前端和 Cloudflare 管理面，同时把不支持的动态依赖从中国交付面移除。[产品清单](https://developers.cloudflare.com/china-network/reference/available-products/)

边界：

- `pnpm run build:readonly-static` 是可复现的本地/构建 PoC，不是部署命令，不包含 China Network zone、DNS、证书、ICP 页脚、缓存或日志配置，也不得把 `dist/readonly-static` 手工上传成未审核的境内镜像。
- `/browse` 已产生静态可水合页面，并在浏览器内搜索已发布内容；查询恢复和组合筛选已由桌面、移动端严格静态测试覆盖。
- 所有需要 D1 或 Turnstile 的按钮和 API 已从只读产物中移除；严格静态服务器会让这些路径返回 404，而不是渲染必然失败的表单。
- Analytics 不作为页面可用性的依赖；日志先在官方已列出的 Instant Logs、Logpush 或 Tail Workers 中选择并验证。

### B. 中国 CDN / Assets + 全球动态源站：有条件可行

Cloudflare 中国数据中心会从客户源站网络获取资源，官方提供京东云数据中心源站出口 IP 清单，供源站防火墙定期更新。[基础设施](https://developers.cloudflare.com/china-network/reference/infrastructure/) 对于进入或离开中国的 API、个性化页面等动态内容，Cloudflare 另售 CDN Global Acceleration，目标是改善跨境动态连接；它要求 Enterprise 和 China Network，并由 Cloudflare 或本地合作方协助签约部署。[Global Acceleration](https://developers.cloudflare.com/china-network/concepts/global-acceleration/)

据此可以评估“静态内容在中国边缘，D1 后端留在全球 Worker”的混合结构，但边界很严格：

- Global Acceleration 改善网络路径，不会让 D1 成为中国网络原生 binding，也不会让 Turnstile 在大陆变为受支持。
- 中国 Worker 到全球后端究竟使用公开 HTTPS、Service Binding 还是账号团队提供的专用模式，官方公开文档没有给出足够语义；在书面架构确认前不能选定。
- 如果保留公众提交，必须先替换 Turnstile，并完成个人信息和跨境数据路径的专项合规评审；本文不批准该链路。
- 该模式增加独立订阅与可能的 Global Acceleration 成本，必须单独确认。

### C. 全球源站仅做静态回源：可行但不等于完整 Worker 迁移

China Network CDN 可以从全球源站取静态资产；默认权威 DNS 会让中国大陆客户端由京东云数据中心应答，境外客户端由最近的全球 Cloudflare 数据中心应答。[中国权威 DNS](https://developers.cloudflare.com/china-network/concepts/china-dns/) 这允许同一域名下继续使用全球源站，而不必先建一个新品牌域名。

边界：静态回源只解决公开文件交付，动态 Worker、D1 和 Turnstile 仍受前述限制。若超过 90% 流量来自大陆，Cloudflare 才建议考虑 In-China Nameserver；启用后连境外 DNS 查询也会进入京东云数据中心，可能增加境外延迟，且该功能要联系销售启用。[中国权威 DNS](https://developers.cloudflare.com/china-network/concepts/china-dns/)

### D. 直接迁移到一般京东云产品：未研究，不可从本文推出

公开 Cloudflare 文档证明的是“京东云运营 Cloudflare 中国网络数据中心”，不是 Wrangler 可以部署到任意京东云 Serverless、对象存储、数据库或 StarShield 产品。若负责人决定绕开 Cloudflare China Network、直接采购京东云产品，那是新的平台迁移：需要以京东云对应产品的一手文档重新核对运行时、构建、数据库、机密、日志、域名和备案接入，现有 `wrangler.jsonc` 不具有可移植性保证。

## 建议验证顺序

1. 负责人确认备案主体是个人还是组织、域名实名主体是否一致，并在[工信部备案系统](https://beian.miit.gov.cn/#/Integrated/recordQuery)保存 `nanjinghua.com` 的真实查询结果。
2. 向 Cloudflare 销售取得 Enterprise + China Network 的书面报价、补充条款和当前产品矩阵，逐项询问 Workers runtime/`nodejs_compat`、Assets、Secrets、Service Bindings、Cron、持久化日志、Web Analytics、D1 与 Turnstile。
3. 若尚无有效备案，通过实际接入服务商启动备案；只有取得真实备案号后才修改页脚，禁止使用占位号。
4. 提交京东云内容审核材料，并取得明确批准。
5. 以 `pnpm run build:readonly-static && pnpm run preview:static` 复验已完成的只读构建 PoC；它不连接生产 D1、不带生产 Secrets、不启用公众提交。取得前置批准后，再把该产物接入独立、可回滚的受审环境，确认实际 hostname 的证书、IPv6、缓存、规范 URL、搜索和错误页。
6. 如确需全球动态后端，再由账号团队给出受支持的跨境架构并单独评审数据与防滥用方案。
7. 通过已有 `pnpm ops:validate:mainland` 三网多轮门禁，并在至少三家真实终端网络完成浏览器验收；自动探针不能替代最终验收。

## 明确停止线

在以下证据全部具备前，工作停留在研究和全球非音频预览：

- [ ] 已有可购买 China Network 的 Cloudflare Enterprise 账户、书面报价和负责人付费确认。
- [ ] `nanjinghua.com` 在工信部官方系统显示有效 ICP 备案/许可证，主体与计划接入主体一致。
- [ ] 页面已使用真实备案号满足页脚展示与官方查询链接要求。
- [ ] 京东云已完成域名内容审核并书面批准。
- [ ] Cloudflare 账号团队已书面确认本项目实际需要的 Workers 子能力；未列入公开清单的 D1、Cron、Observability/Analytics 不靠猜测放行。
- [ ] 已选定不依赖 Turnstile 的大陆提交策略；在此之前中国交付面不开放提交。
- [ ] PoC 以独立、可回滚配置运行，没有生产 D1 写入或生产 secret 外泄。
- [ ] 三网自动门禁和真实终端验收都通过。

因此现在**不得**：购买或启用服务、切换 nameserver/CNAME、给现有 zone 打开 China Network、修改生产 `wrangler.jsonc`、运行中国环境部署、迁移生产数据、复制生产 secrets，或把当前全球 D1/Turnstile 链路标记为中国网络兼容。

## 来源

以下来源均于 2026-07-19 访问：

1. Cloudflare, [Cloudflare China Network overview](https://developers.cloudflare.com/china-network/).
2. Cloudflare, [Get started](https://developers.cloudflare.com/china-network/get-started/).
3. Cloudflare, [Available products and features](https://developers.cloudflare.com/china-network/reference/available-products/).
4. Cloudflare, [China Network FAQ](https://developers.cloudflare.com/china-network/faq/).
5. Cloudflare, [Internet Content Provider (ICP)](https://developers.cloudflare.com/china-network/concepts/icp/).
6. Cloudflare, [Global Acceleration](https://developers.cloudflare.com/china-network/concepts/global-acceleration/).
7. Cloudflare, [China Authoritative DNS](https://developers.cloudflare.com/china-network/concepts/china-dns/).
8. Cloudflare, [Infrastructure](https://developers.cloudflare.com/china-network/reference/infrastructure/).
9. 中华人民共和国工业和信息化部，[ICP/IP 地址/域名信息备案管理系统](https://beian.miit.gov.cn/#/Integrated/recordQuery).
10. 中央网络安全和信息化委员会办公室，[《非经营性互联网信息服务备案管理办法》官方文本](https://www.cac.gov.cn/2005-02/09/c_1112147171.htm).
11. 中华人民共和国商务部（文章来源标注为工业和信息化部网站），[《工业和信息化部关于修改部分规章的决定》解读](https://policy.mofcom.gov.cn/claw/policyInfo.shtml?id=6052).
