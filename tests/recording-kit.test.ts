import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const root = path.resolve("docs/recording-kit");
const run = promisify(execFile);

async function readKitFile(relativePath: string) {
	return readFile(path.join(root, relativePath), "utf8");
}

test("采集说明覆盖自然提示、技术质量和最小必要背景", async () => {
	const [prompts, technical, background] = await Promise.all([
		readKitFile("prompts.md"),
		readKitFile("technical-guide.md"),
		readKitFile("speaker-background-template.md"),
	]);

	for (const heading of ["共同词句", "自然讲述", "访谈提示"]) {
		assert.match(prompts, new RegExp(`## ${heading}`));
	}
	assert.match(prompts, /不要示范读音/);
	assert.match(prompts, /不要.*“最正宗”/);

	for (const detail of ["WAV", "48 kHz", "24 bit", "15 至 20 厘米", "原始文件"]) {
		assert.match(technical, new RegExp(detail));
	}
	assert.match(technical, /NJH-S01_20260717_01\.wav/);

	for (const field of ["出生年代", "成长片区", "长期居住", "家庭语言", "普通话使用"]) {
		assert.ok(background.includes(`| ${field} |`));
	}
	for (const excludedField of ["真实姓名", "身份证号", "精确出生日期", "联系方式", "精确住址"]) {
		assert.equal(background.includes(`| ${excludedField} |`), false);
	}
});

test("授权书逐项控制传播范围并说明成年人限制和撤回", async () => {
	const consent = await readKitFile("consent-form.md");

	assert.match(consent, /只接受年满 18 周岁的参与者/);
	for (const scope of ["公开播放", "公开下载", "研究复用"]) {
		assert.match(consent, new RegExp(`### .*${scope}`));
	}
	assert.equal((consent.match(/□ 同意　□ 不同意/g) ?? []).length, 3);
	assert.match(consent, /## 撤回或变更授权/);
	assert.match(consent, /不会自动撤销.*已经取得的副本/);
});

test("演练将受限身份、授权凭证和公开元数据分开并验证校验值", async () => {
	const publicMetadata = JSON.parse(
		await readKitFile("rehearsal/public/SIM-0001-metadata.json"),
	) as Record<string, unknown>;
	assert.equal(publicMetadata.pseudonym, "演练甲");
	for (const forbiddenKey of ["realName", "contact", "exactAddress", "consentEvidence"]) {
		assert.equal(forbiddenKey in publicMetadata, false);
	}

	const manifest = await readKitFile("rehearsal/manifest.sha256");
	const entries = manifest
		.trim()
		.split("\n")
		.map((line) => line.match(/^([a-f0-9]{64}) {2}(.+)$/))
		.filter((match): match is RegExpMatchArray => match !== null);
	assert.equal(entries.length, 5);

	for (const [, expectedHash, relativePath] of entries) {
		const bytes = await readFile(path.join(root, "rehearsal", relativePath));
		assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedHash);
	}
});

test("安全交接覆盖空派生目录并要求身份与授权离线分区", async () => {
	const checklist = await readKitFile("secure-handoff-checklist.md");
	assert.match(
		checklist,
		/find 01-originals 02-consent 03-identity 04-public-metadata 05-derivatives/,
	);
	assert.match(checklist, /find.*会跳过空目录/);
	assert.match(checklist, /身份与授权的离线备份/);
	assert.match(checklist, /删除在线传送区、下载目录及解压临时目录/);

	const command = checklist
		.match(/```bash\n(find 01-originals[\s\S]+?> manifest\.sha256)\n```/)?.[1]
		.replace(/\\\n\s*/g, " ");
	assert.ok(command);
	const rehearsalDirectory = await mkdtemp(path.join(tmpdir(), "nanjinghua-handoff-"));
	try {
		const directories = [
			"01-originals",
			"02-consent",
			"03-identity",
			"04-public-metadata",
			"05-derivatives",
		];
		await Promise.all(
			directories.map((directory) => mkdir(path.join(rehearsalDirectory, directory))),
		);
		await Promise.all(
			directories
				.slice(0, 4)
				.map((directory) =>
					writeFile(path.join(rehearsalDirectory, directory, "example.txt"), directory),
				),
		);

		await run("sh", ["-c", command], { cwd: rehearsalDirectory });
		const generatedManifest = await readFile(
			path.join(rehearsalDirectory, "manifest.sha256"),
			"utf8",
		);
		assert.equal(generatedManifest.trim().split("\n").length, 4);
		assert.doesNotMatch(generatedManifest, /05-derivatives/);
	} finally {
		await rm(rehearsalDirectory, { force: true, recursive: true });
	}
});
