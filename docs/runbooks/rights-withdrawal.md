# 权利撤回与隐私删除运行手册

本手册用于处理已核实的权利、隐私或人身安全请求。它不适用于一般事实纠错。隐私与安全优先于公开版本完整性；不得只把当前页面隐藏后就宣布完成。

## 1. 决定与受限台账

1. 在 D1 线索中确认请求关联永久档案编号，核验请求人与权利或风险的关系。
2. 先把线索状态推进到“核验中”；不得在“已收到”或“待补充”阶段形成最终决定。通过受编辑凭证保护的处置接口一次性记录公开目录、本站保存副本、备份和不含多余个人信息的内部说明。写入成功会在同一事务中把线索转为“已采纳”，同一线索不得追加或覆盖第二个最终处置。
3. `目录撤回` 只在授权允许时使用；元数据文件必须改为最小目录模式，并删除对应 Markdown 正文。
4. `隐私删除` 必须删除当前内容树中的元数据与正文，只在 `content/archive-identifiers.json` 追加状态历史，永久编号不得重新激活。
5. 原件、工作副本、离线副本和云端备份逐一执行台账决定。不能用“主文件已删”代替备份处置。

## 2. 清理公开 Git 历史

公开 Git 历史不属于受限处置台账。若历史提交包含必须删除的个人信息，先在隔离工作目录列出所有受影响路径和可复验的非敏感标记，再取得仓库管理员对历史重写的明确批准。

```bash
git clone --mirror git@github.com:crossly/nanjinghua.com.git nanjinghua-purge.git
cd nanjinghua-purge.git
git filter-repo --invert-paths --paths-from-file /restricted/purge-paths.txt --force
git push --force --mirror origin
```

路径文件必须覆盖档案元数据、正文、专题中的相关描述及曾经生成的公开产物。重写后重新克隆仓库，不得继续使用旧工作副本推送。若 GitHub 的拉取请求缓存、附件、fork 或搜索缓存仍可访问相关信息，应按平台敏感数据清除流程联系 GitHub Support；不能把强制推送当作缓存已经消失的证明。

## 3. 重新发布与缓存

1. 运行完整内容校验；孤儿正文、隐私删除元数据、撤回编号复用或状态回退必须使构建失败。
   CI 比较其他基准分支时，通过 `ARCHIVE_IDENTIFIER_BASE_REF` 指定已抓取的基准 ref；编号簿的既有记录和状态历史只能追加。
2. 使用 `pnpm run deploy` 发布新 Worker 版本。档案 API 响应使用 `Cache-Control: no-store`。
3. 清除仍引用旧版本的 Cloudflare 自定义缓存规则或域名缓存；当前没有自定义缓存时也要记录检查结果。
4. 若旧 URL、令牌或签名链接曾经公开，立即撤销或轮换；仅删除页面不等于撤销访问能力。

## 4. 复验

```bash
pnpm check
pnpm run typecheck
pnpm test
pnpm run build
rg -n '非敏感复验标记' content src public dist
git log --all -S'非敏感复验标记' --oneline
curl -i https://nanjinghua.com/api/archive/NJH000000
```

复验必须确认：当前树和构建产物不含待删内容；重写后的所有公开 refs 不含对应历史；页面与 API 只返回允许的目录占位或通用隐私删除状态；原编号仍在登记簿且不能复用；D1 受限台账保留申诉与处置关系。最后把执行人、时间、发布版本、缓存检查和复验结果写入受限台账，不把个人信息复制到公开 Issue。
