# 使用 TanStack Start 并部署到 Cloudflare

网站采用 TanStack Start、React、TypeScript 与 TanStack Router，档案和专题内容尽量预渲染，动态表单与接口运行在 Cloudflare Workers。TanStack Query、Form 和 Table 仅在出现对应需求时引入；这一选择以统一的 TanStack 开发模型和 Cloudflare 部署为优先，接受其相对静态站点生成器更高的运行与升级复杂度。
