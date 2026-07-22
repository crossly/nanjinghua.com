# 2026-07-20 中国大陆固定三网恢复复验

结论：固定城市的首个三轮非音频自动门禁窗口 36/36，第二窗口只有 35/36；把 `www` 改成规范内容域后的第三窗口降至 24/36。恢复裸域后，第四窗口短暂取得 36/36，但第五窗口再次降至 24/36，上海移动对裸域四条路径的 12 次请求全部超时。标准 Cloudflare 路径未通过跨时间稳定性门槛；网站继续保持非音频预览，也不以自动探针替代三家真实终端网络的浏览器验收。

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

## 第三窗口与规范域回归

- 时间窗口：2026-07-21 15:12:24 至 15:14:37（Asia/Shanghai）。
- 线上 Worker Version：`d07ffcb4-77b2-471f-bd22-7b09a328c3e4`，Cloudflare 部署时间 `2026-07-21T03:33:23.050973Z`。
- 该版本把 `www.nanjinghua.com` 设为规范内容域，并让裸域返回 `308`。对 `www` 执行固定三网三轮门禁时，深圳电信 12/12、长沙联通 12/12、上海移动 0/12，总计 24/36。
- 上海移动的 12 次失败均为 `Request timeout.`，没有 HTTP 状态码或 `resolvedAddress`；四条路径和三轮全部失败，因此不能归因于某个 TanStack 路由或 D1 API。

测量 ID：

```text
round 1
home:    2rarxEw5ZASKeQsyf00020ng0
article: 2GVHYFwUR28zT9XcR00020ng0
search:  2qnxIHPJaeMyyZvB900020ng0
api:     2luItDX4e0PITDG8h00020ng1

round 2
home:    2HgSl2klW8iYkBt1B00020ng1
article: 27kAf0H7BcSmo9ZAv00020ng1
search:  2NXZNjPJLaQeuFbwp00020ng1
api:     2r2946cZrFqDdVpy900020ng1

round 3
home:    2x9fZkIIQLAvk7nzn00020ng1
article: 2qodElKAnXz3NXPbG00020ng2
search:  29zfeVTkHnN7BvjiZ00020ng2
api:     2FpHg8ltVljkq6HtW00020ng2
```

同一上海移动探针对照进一步定位到 hostname 路径：

- 裸域首页测量 `2GSEA9z8HgBmUKCtr00020ng3` 解析为 `104.21.10.37`，在 1,564 ms 内完成 TCP/TLS 并返回指向 `www` 的 `308`。
- 紧接着的 `www` 首页测量 `2ltyZXfwFp4yLqcHw00020ng3` 超时，`resolvedAddress` 为 `null`。
- 系统解析对照 `2P6jqGntayiNcmhss00020ng6` 与 `2iBGf5uTfApqWPqUQ00020ng6` 均返回 `104.21.10.37`、`172.67.189.230`，说明同一探针对两个 hostname 的 A 查询都成功。
- 2026-07-22 追加强制 IPv4 HTTP 测量时，Globalping 返回 `No matching IPv4 probes available.`；实时探针清单已没有上海 AS9808，未把该基础设施空缺记作站点成功或失败。

运行时证据不支持继续把 `www` 作为规范内容域。实现因此恢复 `https://nanjinghua.com` 为规范内容域，并把 `www` 改为到裸域的永久跳转；发布后必须重新运行固定三网窗口，不能把这项配置调整本身当作恢复证明。

## 恢复裸域后的第四、第五窗口

- 第四窗口：上一生产版本在 `2026-07-22T02:55:37Z` 至 `02:56:17Z` 对裸域取得 36/36。
- 第五窗口：源提交 `36ca804c34106753002f342d3052e8c2b5089308`、Worker Version `5656cbfa-9c89-4c96-8cc4-dfbce03bc0d9` 于 `2026-07-22T03:25:03.231015Z` 承载 100% 流量后，从 `03:28:23Z` 至 `03:30:42Z` 重跑同一命令。
- 第五窗口中深圳电信 AS4134 为 12/12，成功请求总耗时 656–1,870 ms、首字节 217–461 ms；长沙联通 AS4837 为 12/12，总耗时 536–991 ms、首字节 195–631 ms。
- 上海移动 AS9808 为 0/12，首页、专题、搜索和线索 API 在全部三轮均返回 `Request timeout.`，没有 HTTP 状态码。总计 24/36，命令以状态码 1 拒绝验收。

第五窗口测量 ID：

```text
round 1
home:    2RE6lbzKWO3mngNsA00020nzc
article: 2k6oxWeO7YEPHUlpN00020nzc
search:  297rYYh41z1meeDKZ00020nzc
api:     2n5gsJOrP5h5x2QJY00020nzd

round 2
home:    2uvD0Cx5jLDfQtihR00020nzd
article: 28M6EvmiWAZRlnSmz00020nzd
search:  2oop0QVENevTxTADk00020nzd
api:     2zg5JxkhfFquMlKTu00020nzd

round 3
home:    2z9W4CUT6cwp4uRKt00020nze
article: 2XEUbqAtwL3hzguB300020nze
search:  2r0kPtA6BFbqY9JqF00020nze
api:     2Vl6g46yVDmD3LyTX00020nze
```

第四窗口说明裸域配置可以在该时段从三个固定探针完成请求，第五窗口则证明恢复并不稳定。由于移动失败覆盖静态页面和动态 API，现有证据不能把问题缩小到单个 TanStack 路由或 D1。最近成功窗口不能覆盖随后失败窗口，发布状态继续保持不变。

## 发布判断

首个窗口推翻的是“上海移动当前仍然连续 0/10 超时”这一过强的运行时判断，不删除或改写 2026-07-19 的失败证据。第二窗口又复现一次上海移动超时，第三窗口则证明把 `www` 设为规范域会稳定扩大上海移动失败面。成功窗口不能外推为跨时间稳定，配置改动也必须在相同固定回归点复验。同日较早从当前工作网络直接访问搜索页，四次仍出现两次 20 秒连接超时，而且该网络身份没有独立确认。自动社区探针也不能称为真实终端验收。

后续判断顺序：

1. 在分开的时间窗口重复固定三网门禁；任何失败都继续保持预览。
2. 从中国电信、联通、移动至少三个真实终端网络，用浏览器检查首页、专题、搜索、规范 URL、静态资源和失败恢复。
3. 只有标准 Cloudflare 路径持续不达标时，才进入需要 ICP、Enterprise + China Network、JD Cloud 审核和账户团队确认的替代交付；本次恢复窗口不构成采购或启用批准。
4. 语音采集、真人音频、播放器、转写、R2 媒体及其直接依赖继续延期，不进入本次验收。

## 真实终端证据入口

仓库随后新增 `pnpm ops:validate:terminal -- <telecom|unicom|mobile>`，让每个真实终端在可见 Chromium 中执行三轮非音频页面、同源静态资源、搜索表单交互、规范 URL 和离线恢复检查。首轮四个页面与恢复页面会保留为浏览器标签页，直到操作者逐项复核并返回终端确认。命令从目标域名的 Cloudflare trace 获取实际浏览器出口，并用 Team Cymru 校验固定运营商 ASN；报告不保存客户端 IP。正式通过还要求操作者分别确认页面可见可读，并声明终端直连目标运营商且 VPN、代理、iCloud Private Relay 与出口改写安全网关均已关闭；headless 两项都不能成立。

2026-07-20 15:48（Asia/Shanghai）从当前工作连接执行默认三轮 headless 冒烟：12/12 页面测量、脚本、样式、图片、规范 URL 和离线恢复全部通过，三轮搜索均保留 `q=白局` 且取得 7 项结果，5 张截图均记录 SHA-256，报告没有客户端 `ip` 字段，并保留 Team Cymru 返回的 `/23` 聚合前缀。但出口为 AS41378、Cloudflare 识别位置为 HK，不是电信 AS4134/CN；headless 也无法完成可见页面确认和直连声明。因此命令按预期以状态码 1 拒绝该报告。该结果只证明验收器能够拒绝代理、错误网络或非人工运行，不能计入三家真实终端完成数。

同日另用不存在的 Chromium 路径模拟浏览器基础设施故障：命令以状态码 2 退出，并在已创建目录中写入 schema v2、`outcome: infrastructure-error`、`passed: null` 且无客户端 `ip` 的最小化报告；该报告只证明故障证据路径工作，不计作站点通过或失败。
