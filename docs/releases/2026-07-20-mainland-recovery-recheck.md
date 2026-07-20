# 2026-07-20 中国大陆固定三网恢复复验

结论：固定城市的首个三轮非音频自动门禁窗口 36/36 通过，但分开的第二窗口只有 35/36 通过，上海移动访问非音频线索配置 API 再次超时。标准 Cloudflare 路径尚未通过跨时间稳定性门槛；网站继续保持非音频预览，也不以自动探针替代三家真实终端网络的浏览器验收。

## 为什么加固门禁

原命令分别请求 `China+AS4134+eyeball`、`China+AS4837+eyeball` 和 `China+AS9808+eyeball`。电信与联通当时实际稳定落在深圳和长沙，但移动探针会在上海、昆明、台山、北京之间轮换。2026-07-19 的已知失败点是上海移动；若后续测量恰好轮换到其他城市，命令可能在没有复验原故障点的情况下变绿。

本次将正式门禁固定为：

- 深圳中国电信 AS4134 `Shenzhen+AS4134+eyeball`
- 长沙中国联通 AS4837 `Changsha+AS4837+eyeball`
- 上海中国移动 AS9808 `Shanghai+AS9808+eyeball`

门禁除国家、ASN 和 `eyeball-network` 标签外，现在还核对返回城市。Globalping 即使返回同一运营商的其他城市，也会以站点验收状态码 1 失败，不能替代固定回归点。

## 方法

- 时间窗口：2026-07-20 13:14:11 至 13:15:04（Asia/Shanghai）。
- 命令：`pnpm ops:validate:mainland`，默认 3 轮。
- 路径：首页 `/`、专题 `/articles/what-is-nanjinghua`、搜索 `/browse?q=白局`、非音频线索配置 `/api/submissions`。
- 每次必须同时满足固定探针身份、TLS 授权、HTTP 200 和响应正文签名。
- 本次验收的是当时线上 Worker Version `b8cce75c-799c-4cc9-a219-64a63c301906`；门禁脚本改动不改变线上网站响应。

## 首个窗口结果

| 固定网络 | 结果 | 成功请求总耗时 | 成功请求首字节 |
| --- | ---: | ---: | ---: |
| 深圳电信 AS4134 | 12/12 | 704–1,679 ms | 241–650 ms |
| 长沙联通 AS4837 | 12/12 | 527–903 ms | 176–420 ms |
| 上海移动 AS9808 | 12/12 | 716–1,991 ms | 228–640 ms |

按路径：首页 3/3、专题 3/3、搜索 3/3、API 3/3。共 36 个探针响应，全部通过 TLS、HTTP 和正文签名检查。

测量 ID：

```text
round 1
home:    2R2KIAVmhmz7Fnpeu00020nGs
article: 2CFG1wHwaIymVg1H800020nGs
search:  2PgKGvhhHLFqbCgvw00020nGs
api:     2ERCg0MgrjEC9HEtb00020nGs

round 2
home:    25RrcsP5u6cd5891800020nGs
article: 265MDlTbNZAddcGlW00020nGs
search:  2rdIwxgVNLITYWgq700020nGs
api:     2U4S6Zae35y7QREIw00020nGs

round 3
home:    2Gw3eMq4hphTnQPNj00020nGs
article: 2QpBc5RoJVQNWhjlu00020nGs
search:  2jM7OfWPLRAYFrQBC00020nGs
api:     2kZO4kPMtP2bIj6sv00020nGs
```

在加固正式门禁前，同一时段还单独固定上海移动，对首页和专题各执行 5 轮，10/10 均通过。正式记录以上述覆盖四条路径且城市身份受代码约束的三轮结果为准。

## 第二窗口结果

- 时间窗口：2026-07-20 13:25:35 至 13:26:53（Asia/Shanghai）。
- 首次启动时 Globalping 调用出现原因未定的 `fetch failed`，命令按约定以状态码 2 退出；随后 `/v1/probes` 连通检查返回 HTTP 200，再重试完整三轮。该次调用失败没有被计为站点成功或失败。
- 有效重试中，深圳电信 12/12、长沙联通 12/12、上海移动 11/12；首页、专题和搜索各 3/3，API 2/3，共 35/36。
- 唯一失败发生在第 3 轮 `/api/submissions`：上海移动探针返回 `Request timeout.`，无 HTTP 状态码，测量 `2Fq6FPl6wBjJSEIKH00020nH4`。同次测量的深圳电信和长沙联通均为 HTTP 200。

测量 ID：

```text
round 1
home:    2UxjRbd7zHeNQklEW00020nH3
article: 2UudEP96HkYDZiS0700020nH3
search:  2atVlaPlXKMGvKXW000020nH3
api:     2kaH2Hy5iCFyTOuJk00020nH3

round 2
home:    2TI8pGf4seqoSBcqg00020nH4
article: 2zoN2mpThMn1BSfGF00020nH4
search:  2HNmi91JK5qoT6hnB00020nH4
api:     2k7hFafWu5M1EdXxx00020nH4

round 3
home:    2GXIQ7ca6dUdtcK7E00020nH4
article: 2QMyiJuzVn725QQJL00020nH4
search:  2Ldkfi2mHXmytULXC00020nH4
api:     2Fq6FPl6wBjJSEIKH00020nH4
```

## 发布判断

首个窗口推翻的是“上海移动当前仍然连续 0/10 超时”这一过强的运行时判断，不删除或改写 2026-07-19 的失败证据。第二窗口又复现一次上海移动超时，证明成功窗口不能外推为跨时间稳定。同日较早从当前工作网络直接访问搜索页，四次仍出现两次 20 秒连接超时，而且该网络身份没有独立确认。自动社区探针也不能称为真实终端验收。

后续判断顺序：

1. 在分开的时间窗口重复固定三网门禁；任何失败都继续保持预览。
2. 从中国电信、联通、移动至少三个真实终端网络，用浏览器检查首页、专题、搜索、规范 URL、静态资源和失败恢复。
3. 只有标准 Cloudflare 路径持续不达标时，才进入需要 ICP、Enterprise + China Network、JD Cloud 审核和账户团队确认的替代交付；本次恢复窗口不构成采购或启用批准。
4. 语音采集、真人音频、播放器、转写、R2 媒体及其直接依赖继续延期，不进入本次验收。
