# 南京话

“南京话的历史”是一个面向公众、证据优先的南京话数字档案。当前仓库正在按 [首发规格](./docs/specs/0001-public-archive-launch.md) 分阶段建设。

## 已部署预览

[https://nanjinghua-com.xflash.workers.dev](https://nanjinghua-com.xflash.workers.dev)

该 Cloudflare Worker 预览于 2026-07-17 完成公网与真实浏览器验证。正式域名将在首发验收阶段接入。

## 环境

- Node.js 24.18.0（见 `.node-version`）
- pnpm 10.32.0（由 `packageManager` 固定）
- 已登录的 Cloudflare Wrangler（仅部署时需要）

## 开发

```bash
pnpm install
pnpm dev
```

本地地址为 `http://localhost:3000`。

## 验证

```bash
pnpm typecheck
pnpm check
pnpm test
pnpm build
```

`pnpm test` 会启动本地 TanStack Start 服务，并在桌面与移动 Chromium 视口运行首页浏览器验收。

## Cloudflare

首次配置提交服务时，先创建 D1 数据库和 Turnstile Managed 组件，将公开 site key 写入
`wrangler.jsonc`。Turnstile 组件需允许正式域名和 Worker 预览域名。两个私密值使用 Wrangler
secret 保存，不写入仓库：

```bash
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put EDITOR_API_KEY
pnpm run db:migrate:remote
pnpm run validate:secrets
pnpm run validate:cloudflare
pnpm preview:worker
pnpm run deploy
```

也可以把两个键写入被 Git 忽略、权限为 `0600` 的 `.env.production.local`，再执行
`wrangler secret bulk .env.production.local`。`pnpm run deploy` 会先检查远端 secret 名称并应用 D1
迁移，缺少配置时不会继续部署。

应用使用 TanStack Start 的 Cloudflare Vite 适配器，Worker 入口、D1 绑定、Cron 和兼容日期由
`wrangler.jsonc` 管理。每日 Cron 会执行联系方式保留与无处理提醒；提醒线索编号同时写入状态事件和
Worker 日志。

生产备份、隔离恢复演练、回滚、密钥轮换、性能预算和故障排查见
[Cloudflare 生产运行手册](./docs/runbooks/production-operations.md)。当前只覆盖 Git、D1、Worker 与
Turnstile；R2、真人音频和媒体恢复按产品决定暂缓。

## 领域与决策

- [领域词汇表](./CONTEXT.md)
- [架构决策](./docs/adr)
- [首发规格](./docs/specs/0001-public-archive-launch.md)

项目内容与实现应使用词汇表中的规范名称，并遵守相关 ADR。
