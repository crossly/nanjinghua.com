import assert from "node:assert/strict";
import test from "node:test";
import { applyIndexingPolicy } from "../src/indexing-policy.ts";

test("只有正式域名允许索引，Worker 预览和本地域名明确 noindex", () => {
	const production = applyIndexingPolicy(
		new Request("https://nanjinghua.com/"),
		new Response("production"),
	);
	assert.equal(production.headers.get("X-Robots-Tag"), null);

	for (const url of ["https://nanjinghua-com.xflash.workers.dev/", "http://127.0.0.1:4173/"]) {
		const preview = applyIndexingPolicy(new Request(url), new Response("preview"));
		assert.equal(preview.headers.get("X-Robots-Tag"), "noindex, nofollow");
	}
});
