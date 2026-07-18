# 2026-07-19 中国大陆三网访问验收

结论：未通过稳定性硬门槛。`nanjinghua.com` 继续保持“非音频预览”，不能据此宣布中国大陆正式上线，也不启动音频或 R2 验收。

## 方法

- 工具：Globalping CLI v1.5.2；发布包 SHA-256 已与官方 `checksums.txt` 比对。
- 探针条件：只选择中国大陆 `eyeball-network`，分别限定中国电信 AS4134、中国联通 AS4837、中国移动 AS9808；不把数据中心探针当作居民网络。
- 路径：首页 `/`、专题 `/articles/what-is-nanjinghua`、搜索 `/browse?q=白局`、非音频线索配置 `/api/submissions`。
- 每条路径执行 3 轮 HTTPS GET；通过条件是 TLS 证书有效、HTTP 200 且响应正文包含该路径的预期内容。
- 时间窗口：2026-07-19 03:03 至 03:11（Asia/Shanghai）。

Globalping 是外部社区探针服务，测量结果会过期。本记录保留测量 ID、探针网络、状态和关键延迟，不把自动探针等同于长期真实用户监测。

## 可重复门禁

仓库新增 `pnpm ops:validate:mainland`，通过 Globalping HTTP API 重复上述三网、四路径、TLS、HTTP 与正文签名检查。命令输出包含逐次测量 ID、探针身份、失败原因、延迟和逐路径/逐网络汇总；站点失败使用状态码 1，API 或配置故障使用状态码 2，避免把测量基础设施故障伪装成站点失败。该命令保持独立，不接入部署流程；当前预览仍需能够发布交付路径修复。

自动门禁的一轮真实复验再次未通过：首页的上海移动探针返回 `Request timeout`，其余 11 个运营商/路径组合通过。逐网络汇总为中国电信 4/4、中国联通 4/4、中国移动 3/4，证明门禁会保留当前失败，而不是为了发布被做成全绿。

```text
home:    2HX7bCWiiukzfVHXN00020mk8
article: 2wbjBQUIKrgpGIap300020mk8
search:  27YLQNEOBNPM7pmdv00020mk8
api:     2Fi41DTzg4TWG4LEH00020mk8
```

## 三网矩阵

| 网络 | 结果 | 成功请求总耗时 | 成功请求首字节 | 观察 |
| --- | ---: | ---: | ---: | --- |
| 中国电信 AS4134，深圳居民网络 | 12/12 | 685–992 ms | 227–541 ms | 四条路径三轮均为 200，TLS 与正文签名通过 |
| 中国联通 AS4837，长沙居民网络 | 12/12 | 489–1,208 ms | 173–506 ms | 四条路径三轮均为 200，TLS 与正文签名通过 |
| 中国移动 AS9808，大陆居民网络 | 10/12 | 491–2,357 ms | 55–500 ms | 上海移动在首页第 3 轮、专题第 1 轮各出现一次 `Request timeout` |

按路径计数：首页 8/9、专题 8/9、搜索 9/9、API 9/9。所有成功响应都通过 TLS 和正文内容验证，不只是端口连通。

基础矩阵测量 ID：

```text
home:    2nIlwWvqoYIO93My500020mjn 28ZV5DPOdaHlNlNDt00020mjo 2Vlw1DjwE3flgmg9t00020mjo
article: 2eAJbnqyGY635AGn500020mjp 2ZWMeynu3Q91RHyic00020mjp 2GVxs1bcvR36ywnbG00020mjp
search:  22rcCjRbERoKpL5dV00020mjp 2SH0F31KSsjzWXq5S00020mjq 2o2Sld06qufvvSSdN00020mjq
api:     27vobBeNseevNRHuc00020mjq 2kwJCxZeI4wBCXaek00020mjq 2mJSaosWBkaA0442O00020mjq
```

## 上海移动复现

固定 `Shanghai+AS9808+eyeball` 后，首页连续 5/5 超时，专题连续 5/5 超时：

```text
home:    2HGQrm5kisHkHa3Ng00020mjr 2iDs8LN1EeKGAujXh00020mjr 2Ab5ncfSCNx8Oghl700020mjr
         2xIpbJjXBaDU5celC00020mjs 2jzoWUxmO3W3dOM7n00020mjs
article: 2n5x3LmgsOfVrnpb100020mjs 2eGqauJdflUXJtQ9500020mjs 2qk88aGMv0spFcILE00020mjt
         2dMKsBpj3i7v5Xvb300020mjt 2LM9j1lfZTZrId3Gj00020mjt
```

同一探针的窄诊断：

- `www.gov.cn`：HTTP 200，436 ms；测量 `2b0LjguQpOf9CgSmC00020mjr`。
- `www.cloudflare.com/cdn-cgi/trace`：HTTP 200，705 ms；测量 `2WSnR4SK72SKlVrzd00020mju`。
- `nanjinghua.com` DNS：NOERROR，506 ms，返回 `104.21.10.37` 与 `172.67.189.230`；测量 `2P0k8SlmezvEt6VRQ00020mju`。
- `104.21.10.37`：ICMP 0% 丢包、平均 195 ms，MTR 可达 AS13335；测量 `2k7t6aXQdopGBnb2D00020mju`、`2m3auRczjdk7e5gab00020mju`。
- `172.67.189.230`：ICMP 100% 丢包；测量 `2jRD0bPcq6YzlI7Mv00020mju`。ICMP 丢包本身不等于 HTTP 不可用，但与双地址路径差异一致。
- Worker 预览域名同样超时；测量 `2JruieeZ2vSEhuixM00020mju`。
- `http://nanjinghua.com/` 端口 80 也超时；测量 `2ZvHHHgoBH0QnhjdH00020mjv`。

这些对照说明探针、DNS 和全部 Cloudflare 访问并未整体失效；问题集中在该上海移动线路到当前 Cloudflare 交付路径，且可以连续复现。

## 发布决策

1. 保持当前 Cloudflare 版本在线作为非音频预览，不回滚已通过的其他网络路径。
2. 不把 34/36 的基础矩阵成功率解释成“稳定”；上海移动固定复现 0/10 已否决正式上线结论。
3. 不在没有备案主体、ICP备案和境内云/CDN配置的情况下临时拼接所谓“国内镜像”。
4. 下一步由项目负责人确认备案主体、域名备案状态和可用的境内云/CDN账户，再按 `docs/adr/0009-mainland-access-over-platform-purity.md` 建立合规替代交付并重复同一矩阵。
5. 即使后续自动探针全部通过，正式上线前仍需在至少三个真实终端网络完成手动浏览器验收。

本记录不改变语音范围决定：R2、真人音频、播放器、转写和媒体派生文件继续延期。
