import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { cityStories } from "../src/content/city-stories.ts";
import { getCityStoryDialogue } from "../src/content/city-story-dialogues.ts";

const OUTPUT_PATH = "docs/research/nanjinghua-tts-corpus.json";

export async function buildNanjinghuaTtsCorpus(projectRoot = process.cwd()) {
	const scenes = cityStories.map((story) => {
		const dialogue = getCityStoryDialogue(story.slug);
		if (!dialogue) throw new Error(`缺少城市故事对话：${story.slug}`);

		return {
			slug: story.slug,
			scene: story.scene,
			storyTitle: story.title,
			review: dialogue.review,
			lines: dialogue.lines.map((line, index) => ({
				id: `${story.slug}-${String(index + 1).padStart(2, "0")}`,
				speaker: line.speaker,
				utterance: line.utterance,
				meaning: line.meaning,
				context: line.context,
				audioStatus: line.audio ? "generated" : "not-generated",
				audioSrc: line.audio?.src ?? null,
			})),
		};
	});
	const lines = scenes.flatMap((scene) => scene.lines);
	const generatedCount = lines.filter((line) => line.audioStatus === "generated").length;
	const corpus = {
		schemaVersion: 1,
		modelRecommendation: {
			model: "qwen3-tts-flash",
			voice: "Li",
			languageType: "Chinese",
		},
		totals: {
			scenes: scenes.length,
			lines: lines.length,
			generated: generatedCount,
			notGenerated: lines.length - generatedCount,
		},
		scenes,
	};
	const outputPath = resolve(projectRoot, OUTPUT_PATH);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, `${JSON.stringify(corpus, null, "\t")}\n`, "utf8");
	return corpus;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const corpus = await buildNanjinghuaTtsCorpus();
	console.log(
		`南京话 TTS 语料已生成：${corpus.totals.lines} 条（已有语音 ${corpus.totals.generated}，待生成 ${corpus.totals.notGenerated}）。`,
	);
}
