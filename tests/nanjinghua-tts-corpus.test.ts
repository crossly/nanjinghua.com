import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildNanjinghuaTtsCorpus } from "../scripts/build-nanjinghua-tts-corpus.ts";

test("TTS 语料区分已有语音与待生成短句", async () => {
	const projectRoot = await mkdtemp(path.join(tmpdir(), "nanjinghua-tts-corpus-"));
	const corpus = await buildNanjinghuaTtsCorpus(projectRoot);

	assert.deepEqual(corpus.totals, {
		scenes: 15,
		lines: 60,
		generated: 15,
		notGenerated: 45,
	});
	for (const scene of corpus.scenes) {
		assert.equal(scene.lines.length, 4);
		assert.equal(scene.lines.filter((line) => line.audioStatus === "generated").length, 1);
	}

	const saved = JSON.parse(
		await readFile(path.join(projectRoot, "docs/research/nanjinghua-tts-corpus.json"), "utf8"),
	);
	assert.deepEqual(saved.totals, corpus.totals);
	const committed = JSON.parse(await readFile("docs/research/nanjinghua-tts-corpus.json", "utf8"));
	assert.deepEqual(committed, corpus);
});

test("重点场景使用审核后的南京话表达", async () => {
	const projectRoot = await mkdtemp(path.join(tmpdir(), "nanjinghua-tts-phrases-"));
	const corpus = await buildNanjinghuaTtsCorpus(projectRoot);
	const lines = new Map(
		corpus.scenes.flatMap((scene) => scene.lines.map((line) => [line.id, line] as const)),
	);

	assert.equal(lines.get("breakfast-03")?.utterance, "少搁一得儿。");
	assert.equal(lines.get("new-estate-03")?.utterance, "帮我按一哈八楼。");
	assert.equal(lines.get("festival-street-02")?.utterance, "跟紧点诶，莫走散了。");
	assert.equal(lines.get("lane-04")?.utterance, "有空来家里头坐坐啊。");
});

test("已有语音文本与生成清单保持一致", async () => {
	const projectRoot = await mkdtemp(path.join(tmpdir(), "nanjinghua-tts-manifest-"));
	const corpus = await buildNanjinghuaTtsCorpus(projectRoot);
	const manifest = JSON.parse(
		await readFile("public/audio/nanjinghua-trials/manifest.json", "utf8"),
	) as { entries: Array<{ slug: string; text: string }> };
	const manifestText = new Map(manifest.entries.map((entry) => [entry.slug, entry.text]));

	for (const scene of corpus.scenes) {
		const generated = scene.lines.find((line) => line.audioStatus === "generated");
		assert.equal(generated?.utterance, manifestText.get(scene.slug));
	}
});
