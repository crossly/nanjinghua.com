import assert from "node:assert/strict";
import test from "node:test";

import { redirectCanonicalRequest } from "../src/indexing-policy.ts";

test("www HTTPS 永久跳转到裸域并保留路径和查询参数", () => {
	const response = redirectCanonicalRequest(
		new Request("https://www.nanjinghua.com/browse?q=%E7%99%BD%E5%B1%80"),
	);

	assert.equal(response?.status, 308);
	assert.equal(
		response?.headers.get("location"),
		"https://nanjinghua.com/browse?q=%E7%99%BD%E5%B1%80",
	);
});

test("裸域 HTTPS 已是规范地址，不发生跳转", () => {
	assert.equal(redirectCanonicalRequest(new Request("https://nanjinghua.com/")), null);
});

test("裸域 HTTP 永久跳转到裸域 HTTPS", () => {
	const response = redirectCanonicalRequest(new Request("http://nanjinghua.com/archive/NJH000001"));

	assert.equal(response?.status, 308);
	assert.equal(response?.headers.get("location"), "https://nanjinghua.com/archive/NJH000001");
});

test("Worker 预览域名不跳转，由索引策略处理", () => {
	assert.equal(
		redirectCanonicalRequest(new Request("https://nanjinghua-com.xflash.workers.dev/")),
		null,
	);
});
