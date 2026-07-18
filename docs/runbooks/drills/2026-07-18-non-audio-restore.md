# 2026-07-18 非音频生产恢复演练

结论：通过。演练只覆盖 Git 内容与 D1 线索，不覆盖 R2、真人音频、播放器、转写或媒体派生文件。

格式说明：本记录使用历史 v1 明文载荷格式；此后生产备份已升级为 v2 AES-256-GCM 认证加密格式。本记录只保留当时事实，不应作为当前备份命令模板。

## 重放命令

```bash
NODE24="$(npx -y node@24.18.0 -p 'process.execPath')"
export PATH="$(dirname "$NODE24"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
pnpm ops:backup -- .ops/backups/2026-07-18-t18
pnpm ops:restore-drill -- .ops/backups/2026-07-18-t18
```

备份创建时间为 `2026-07-18T17:18:23.187Z`。备份目录权限为 `0700`，Git bundle、D1 SQL 和清单权限均为 `0600`。`.ops/` 已被 Git 忽略。

## 验证结果

- Git HEAD：`72bb7e8f826f58bcc346a6207bbd51861cbf5ccd`
- Bundle refs：同一提交上的 `HEAD` 与 `refs/heads/main`，不包含远端跟踪分支或 Codex 内部引用
- 内容数量：20 条档案、7 篇专题
- D1：`nanjinghua-submissions`
- D1 行数：`submission_leads=1`、`submission_status_events=2`、`submission_contacts=0`、`submission_disposition_events=0`
- Git bundle：2,253,335 bytes，SHA-256 `5fd6fd9ec38e9231496f94538d10c643fe31c84d739ccd8ffdbd33cd327ca5d7`
- D1 SQL：5,320 bytes，SHA-256 `e867dd2d6c5d97d4f678c1f37f841bcb839653c2492fcd111efc9d7c03e53ba4`

恢复脚本先验证文件校验值，再把 bundle 克隆到系统临时目录，把 D1 SQL 导入独立的本地 Wrangler 状态；恢复出的 HEAD、内容数量和四张业务表行数均与清单一致。演练结束后临时恢复目录已删除，未写远端 D1。

## 演练中发现的问题

1. `pnpm ops:backup -- 目录` 会把字面量 `--` 传给 Node。初版脚本误把它当成目标目录；误放副本已删除，两个运维入口现在统一忽略参数分隔符，并有回归测试。
2. 首次重新导出遇到 Cloudflare API 超时；不完整目录按失败产物删除，保持输入不变后重试成功。
3. 仅使用 `--branches --tags` 创建的 bundle 没有默认 `HEAD`，克隆后无法检出。最终参数为 `HEAD --branches --tags`，既可直接恢复 `main`，也不带入工具内部 refs。

## 尚未满足的边界

当前 `.ops/` 副本位于本机，仅用于验证工具和恢复流程，不能替代加密、访问受限且与工作机独立的离线备份。生产责任人仍需按运行手册把生成物复制到独立受限存储，并登记保管人与销毁周期。

根据 2026-07-18 的产品范围决定，R2、真人音频及媒体恢复演练延期；本记录不得用于宣称这些能力已经完成。
