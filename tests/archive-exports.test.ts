import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildArchiveExports } from "../scripts/build-archive-exports.ts";

test("静态导出与公开 API 使用同一份 CC0 Dublin Core 映射", async () => {
	const temporaryDirectory = await mkdtemp(join(tmpdir(), "nanjinghua-exports-"));
	try {
		const output = join(temporaryDirectory, "exports");
		const entries = await buildArchiveExports(process.cwd(), output);
		assert.equal(entries.length, 20);
		const exported = JSON.parse(await readFile(join(output, "NJH000015.json"), "utf8"));
		assert.equal(exported["dc:identifier"], "NJH000015");
		assert.equal(exported["dc:rights"], "CC0 1.0 Universal");
		assert.deepEqual(exported["nanjinghua:searchAliases"], [
			{ term: "南京白局", mandarinPinyin: "nanjing baiju" },
		]);
	} finally {
		await rm(temporaryDirectory, { recursive: true, force: true });
	}
});
