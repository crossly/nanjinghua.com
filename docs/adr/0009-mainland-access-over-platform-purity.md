# 中国大陆可用性优先于单一平台

Cloudflare 是首选部署平台，但中国大陆多个网络能够稳定加载页面、搜索和音频是首发硬门槛。上线前必须实测并避免依赖不稳定的境外资源；若标准 Cloudflare 交付持续不达标，将采用符合备案要求的国内镜像或替代路径，而不以保持单一平台为更高优先级。

2026-07-19 的三网验收已证明标准全球网络在上海移动居民线路持续超时。Cloudflare 官方资料同时表明，China Network 不是当前账户可以直接开启的普通区域开关：它只作为 Enterprise 套餐上的独立订阅提供，每个 apex 域名必须先有有效 ICP 备案或许可证，并通过 JD Cloud 内容审查。正式接入前必须由账户负责人完成合同与合规前置，不得用未备案的境内节点或未审查镜像绕过该流程。

当前应用也不能原样假设全部能力会随 China Network 下沉。官方支持清单包含 CDN/Cache、Workers、Assets、Secrets 等能力，但没有列出 D1、Cron Triggers、Workers Observability 持久化日志或 Cloudflare Web Analytics；官方 FAQ 明确 Turnstile 在中国大陆不受支持，并提醒全球 zone 的中国访问者同样可能遇到问题。Global Acceleration 可以改善进出中国的动态内容和 API 路径，但需要 China Network、Enterprise 权益及账户团队协助部署。

因此后续境内交付先以“预渲染公开内容和静态资产进入 China Network，动态请求是否经 Global Acceleration 返回全球 Worker”作为待账户团队确认的候选，而不是已经批准的实现。当前 `/browse` 仍由 Worker 按查询参数渲染，静态 PoC 必须保留可验证的搜索行为；中国交付面在批准新的防滥用方案前不得开放 `/contribute`。D1 线索模型、联系方式分离、保留周期和 Turnstile 防滥用边界不得在没有新 ADR、隐私评估及端到端测试时改写成 KV、弱验证或第三方表单。任何获批的境内配置仍必须纳入唯一发布入口 `pnpm run deploy`，并重新执行三网自动门禁与三个真实终端网络的浏览器验收。

完整能力矩阵、仓库对照和停止线见[Cloudflare 中国网络 / 京东云交付可行性研究](../research/cloudflare-china-network-delivery.md)。

官方依据：

- [Cloudflare China Network 概览](https://developers.cloudflare.com/china-network/)
- [China Network 接入步骤](https://developers.cloudflare.com/china-network/get-started/)
- [ICP 要求](https://developers.cloudflare.com/china-network/concepts/icp/)
- [可用产品与功能](https://developers.cloudflare.com/china-network/reference/available-products/)
- [China Network FAQ](https://developers.cloudflare.com/china-network/faq/)
- [Global Acceleration](https://developers.cloudflare.com/china-network/concepts/global-acceleration/)
