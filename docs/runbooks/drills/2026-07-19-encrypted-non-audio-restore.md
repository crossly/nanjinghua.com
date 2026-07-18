# 2026-07-19 加密非音频生产恢复演练

结论：通过。演练覆盖生产 Git 内容与远端 D1 线索的 v2 加密备份和隔离恢复，不覆盖 R2、真人音频、播放器、转写或媒体派生文件。

## 执行边界

演练在 Node.js 24.18.0 环境中执行。32-byte 随机备份密钥只在同一个 shell 的 `NANJINGHUA_BACKUP_KEY` 环境变量中存在，命令结束后销毁；密钥值、密钥指纹、初始化向量、认证标签和 Wrangler 临时下载地址均未写入本记录。

```bash
pnpm ops:backup -- .ops/backups/2026-07-19-v2-encrypted
pnpm ops:restore-drill -- .ops/backups/2026-07-19-v2-encrypted
```

临时密钥没有进入持久保管，所以本次产物只用于证明 v2 流程可重放，不构成可长期恢复的备份。提取非秘密证据后，本机演练副本已删除。

## 验证结果

- 清单版本：2；清单认证：HMAC-SHA256；载荷加密：AES-256-GCM
- 备份创建时间：`2026-07-18T18:56:29.108Z`（UTC）
- Git HEAD：`6174f086a66e0fc6fb79ff6be6076b2d3910d479`
- Bundle refs：同一提交上的 `HEAD` 与 `refs/heads/main`
- 内容数量：20 条档案、7 篇专题
- D1：`nanjinghua-submissions`
- D1 行数：`submission_leads=1`、`submission_status_events=2`、`submission_contacts=0`、`submission_disposition_events=0`
- `content.git.bundle.enc`：2,279,662 bytes，SHA-256 `56ae7c516f95dd81fcd420f89ce5f3e7fc0f57a68339ee4529773845096300b4`
- `submissions.sql.enc`：5,320 bytes，SHA-256 `4c276caf7e3fbd89b33f4346d05c69bb32c6ed30a7b88023d6d82401a4522698`

目标目录只出现 `content.git.bundle.enc`、`submissions.sql.enc` 和 `manifest.json`，三项权限均为 `0600`。备份明文工作目录、D1 验证状态和恢复演练目录均位于权限受限的系统临时目录，并在命令结束后删除。恢复过程没有写入远端 D1。

## 自动化负向验证

运维测试同时确认：缺少密钥会失败；清单篡改、密文篡改、路径越界和符号链接会被拒绝；错误或缺失载荷不能恢复；v1 历史备份仍可读取；备份子进程不会继承密钥；加密阶段失败时目标目录中的半成品会被清理。

## 尚未满足的边界

本机没有已挂载的独立外接介质，本次也没有把持久密钥与备份分别交给独立保管人。因此“独立加密离线备份”仍未完成，不能关闭 Issue #19。按 2026-07-19 的产品范围决定，R2、真人音频及媒体恢复演练继续延期。
