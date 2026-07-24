import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

type CorpusLine = {
	id: string;
	utterance: string;
};

type CorpusScene = {
	slug: string;
	lines: CorpusLine[];
};

type AudioEntry = {
	id?: string;
	slug: string;
	text: string;
	sha256: string;
};

type AudioReference = {
	src: string;
	type: "audio/wav";
};

const corpusPath = "docs/research/nanjinghua-tts-corpus.json";
const trialManifestPath = "public/audio/nanjinghua-trials/manifest.json";
const dialogueManifestPath = "public/audio/nanjinghua-dialogues/manifest.json";
const outputPath = "src/content/nanjinghua-audio-index.ts";

async function readJson<T>(filePath: string): Promise<T> {
	return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function validateHash(filePath: string, expected: string): Promise<void> {
	const actual = createHash("sha256")
		.update(await readFile(filePath))
		.digest("hex");
	if (actual !== expected) throw new Error(`音频哈希不匹配：${filePath}`);
}

export async function buildNanjinghuaAudioIndex(projectRoot = process.cwd()) {
	const resolve = (filePath: string) => path.resolve(projectRoot, filePath);
	const corpus = await readJson<{ scenes: CorpusScene[] }>(resolve(corpusPath));
	const trialManifest = await readJson<{ entries: AudioEntry[] }>(resolve(trialManifestPath));
	const dialogueManifest = await readJson<{ entries: AudioEntry[] }>(resolve(dialogueManifestPath));
	const trialBySlug = new Map(trialManifest.entries.map((entry) => [entry.slug, entry]));
	const dialogueById = new Map(dialogueManifest.entries.map((entry) => [entry.id, entry]));
	if (trialBySlug.size !== trialManifest.entries.length) {
		throw new Error(`旧试音清单包含重复场景：${trialManifestPath}`);
	}
	if (dialogueById.size !== dialogueManifest.entries.length) {
		throw new Error(`对话试音清单包含重复短句：${dialogueManifestPath}`);
	}
	const index: Record<string, AudioReference> = {};
	const matchedTrialSlugs = new Set<string>();
	const matchedDialogueIds = new Set<string>();

	for (const scene of corpus.scenes) {
		for (const line of scene.lines) {
			const trial = trialBySlug.get(scene.slug);
			const dialogue = dialogueById.get(line.id);
			if (trial?.text === line.utterance) {
				const src = `/audio/nanjinghua-trials/${scene.slug}.wav`;
				await validateHash(resolve(`public${src}`), trial.sha256);
				index[line.id] = { src, type: "audio/wav" };
				matchedTrialSlugs.add(scene.slug);
				continue;
			}
			if (dialogue?.text === line.utterance) {
				const src = `/audio/nanjinghua-dialogues/${line.id}.wav`;
				await validateHash(resolve(`public${src}`), dialogue.sha256);
				index[line.id] = { src, type: "audio/wav" };
				matchedDialogueIds.add(line.id);
				continue;
			}
			throw new Error(`语料没有匹配的音频：${line.id} ${line.utterance}`);
		}
	}
	if (
		matchedTrialSlugs.size !== trialManifest.entries.length ||
		matchedDialogueIds.size !== dialogueManifest.entries.length
	) {
		throw new Error("音频清单包含语料中不存在或文本不匹配的条目");
	}

	const entries = Object.entries(index)
		.map(
			([lineId, audio]) =>
				`\t${JSON.stringify(lineId)}: {\n\t\tsrc: ${JSON.stringify(audio.src)},\n\t\ttype: "audio/wav",\n\t},`,
		)
		.join("\n");
	const source =
		`export const nanjinghuaAudioByLineId: Record<string, { src: string; type: "audio/wav" }> = {\n` +
		`${entries}\n};\n`;
	await mkdir(path.dirname(resolve(outputPath)), { recursive: true });
	await writeFile(resolve(outputPath), source, "utf8");
	return index;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const index = await buildNanjinghuaAudioIndex();
	console.log(`南京话音频索引已生成：${Object.keys(index).length} 条。`);
}
