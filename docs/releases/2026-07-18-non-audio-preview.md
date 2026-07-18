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
- 正式域名允许索引；Worker 预览域名和本地预览通过 `X-Robots-Tag: noindex, nofollow` 禁止索引。
- `robots.txt` 与 `sitemap.xml` 均指向正式域名。
- Cloudflare Web Analytics 已在正式域名真实浏览器中确认只注入一次；Turnstile 脚本和响应字段已加载。

部署版本、源代码提交、完整门禁与线上 smoke 结果在本轮部署完成后补记。

## 已知限制

- 尚未从多个中国大陆真实网络验证首页、专题、搜索和长期稳定性，不能据此宣布中国大陆正式上线。
- 尚未把 Git 与 D1 生产备份转存到独立、加密、离线介质。
- R2、原始与派生音频、媒体备份恢复和媒体撤回均未进入当前范围。
- 真人原创语音仍是正式首发的外部依赖；Issue T18 与 T19 保持开启。

维护入口：`docs/runbooks/production-operations.md`、`docs/runbooks/rights-withdrawal.md`、GitHub Issue #19 与 #20。
