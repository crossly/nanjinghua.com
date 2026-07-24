import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildNanjinghuaAudioIndex } from "../scripts/build-nanjinghua-audio-index.ts";
import { buildNanjinghuaTtsCorpus } from "../scripts/build-nanjinghua-tts-corpus.ts";

test("TTS 语料为十五个场景的全部短句提供语音", async () => {
	const projectRoot = await mkdtemp(path.join(tmpdir(), "nanjinghua-tts-corpus-"));
	const corpus = await buildNanjinghuaTtsCorpus(projectRoot);

	assert.deepEqual(corpus.totals, {
		scenes: 15,
		lines: 60,
		generated: 60,
		notGenerated: 0,
	});
	for (const scene of corpus.scenes) {
		assert.equal(scene.lines.length, 4);
		assert.equal(scene.lines.filter((line) => line.audioStatus === "generated").length, 4);
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

test("全部语音文本与两个生成清单保持一致", async () => {
	const projectRoot = await mkdtemp(path.join(tmpdir(), "nanjinghua-tts-manifest-"));
	const corpus = await buildNanjinghuaTtsCorpus(projectRoot);
	const trialManifest = JSON.parse(
		await readFile("public/audio/nanjinghua-trials/manifest.json", "utf8"),
	) as { entries: Array<{ slug: string; text: string }> };
	const dialogueManifest = JSON.parse(
		await readFile("public/audio/nanjinghua-dialogues/manifest.json", "utf8"),
	) as { entries: Array<{ id: string; text: string }> };
	const manifestText = new Map(dialogueManifest.entries.map((entry) => [entry.id, entry.text]));

	for (const scene of corpus.scenes) {
		const trial = trialManifest.entries.find((entry) => entry.slug === scene.slug);
		for (const line of scene.lines) {
			assert.equal(line.utterance, manifestText.get(line.id) ?? trial?.text);
		}
	}
	assert.equal(trialManifest.entries.length + dialogueManifest.entries.length, 60);
	const productionIndex = await buildNanjinghuaAudioIndex();
	assert.equal(Object.keys(productionIndex).length, 60);
});

test("音频索引只接受文本和哈希都匹配的清单", async () => {
	const projectRoot = await mkdtemp(path.join(tmpdir(), "nanjinghua-audio-index-"));
	const trialAudio = Buffer.from("accepted trial audio");
	const dialogueAudio = Buffer.from("accepted dialogue audio");
	const sha256 = (contents: Buffer) => createHash("sha256").update(contents).digest("hex");
	await Promise.all([
		mkdir(path.join(projectRoot, "docs/research"), { recursive: true }),
		mkdir(path.join(projectRoot, "public/audio/nanjinghua-trials"), { recursive: true }),
		mkdir(path.join(projectRoot, "public/audio/nanjinghua-dialogues"), { recursive: true }),
	]);
	await Promise.all([
		writeFile(
			path.join(projectRoot, "docs/research/nanjinghua-tts-corpus.json"),
			JSON.stringify({
				scenes: [
					{
						slug: "breakfast",
						lines: [
							{ id: "breakfast-01", utterance: "来一两馄饨。" },
							{ id: "breakfast-02", utterance: "阿要辣油啊？" },
						],
					},
				],
			}),
		),
		writeFile(
			path.join(projectRoot, "public/audio/nanjinghua-trials/manifest.json"),
			JSON.stringify({
				entries: [{ slug: "breakfast", text: "阿要辣油啊？", sha256: sha256(trialAudio) }],
			}),
		),
		writeFile(
			path.join(projectRoot, "public/audio/nanjinghua-dialogues/manifest.json"),
			JSON.stringify({
				entries: [
					{
						id: "breakfast-01",
						slug: "breakfast",
						text: "来一两馄饨。",
						sha256: sha256(dialogueAudio),
					},
				],
			}),
		),
		writeFile(path.join(projectRoot, "public/audio/nanjinghua-trials/breakfast.wav"), trialAudio),
		writeFile(
			path.join(projectRoot, "public/audio/nanjinghua-dialogues/breakfast-01.wav"),
			dialogueAudio,
		),
	]);

	const index = await buildNanjinghuaAudioIndex(projectRoot);
	assert.deepEqual(index, {
		"breakfast-01": {
			src: "/audio/nanjinghua-dialogues/breakfast-01.wav",
			type: "audio/wav",
		},
		"breakfast-02": { src: "/audio/nanjinghua-trials/breakfast.wav", type: "audio/wav" },
	});
	assert.match(
		await readFile(path.join(projectRoot, "src/content/nanjinghua-audio-index.ts"), "utf8"),
		/nanjinghuaAudioByLineId/,
	);
});
