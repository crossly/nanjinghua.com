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

```bash
pnpm preview:worker
pnpm run deploy
```

应用使用 TanStack Start 的 Cloudflare Vite 适配器，Worker 入口和兼容日期由 `wrangler.jsonc` 管理。

## 领域与决策

- [领域词汇表](./CONTEXT.md)
- [架构决策](./docs/adr)
- [首发规格](./docs/specs/0001-public-archive-launch.md)

项目内容与实现应使用词汇表中的规范名称，并遵守相关 ADR。
