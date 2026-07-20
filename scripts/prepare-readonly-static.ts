import { cp, readdir, readFile, rm, stat } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const excludedDirectories = new Set(["downloads", "recording-kit"]);
const unavailableRoutePrefixes = ["/api/", "/contribute", "/downloads/", "/recording-kit"];

function includeInReadonlyArtifact(sourceRoot: string, sourcePath: string): boolean {
	const path = relative(sourceRoot, sourcePath);
	if (!path) return true;
	const segments = path.split(sep);
	if (segments.some((segment) => excludedDirectories.has(segment))) return false;
	const fileName = basename(path);
	return !/^contribute-.*\.js$/.test(fileName) && !/^recording-kit-.*\.js$/.test(fileName);
}

async function artifactFiles(directory: string): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await artifactFiles(path)));
		else if (entry.isFile()) files.push(path);
	}
	return files;
}

async function isFile(path: string): Promise<boolean> {
	try {
		return (await stat(path)).isFile();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
		throw error;
	}
}

async function validateHtmlReferences(root: string, files: string[]): Promise<void> {
	for (const htmlPath of files.filter((file) => file.endsWith(".html"))) {
		const html = await readFile(htmlPath, "utf8");
		for (const match of html.matchAll(/\b(?:href|src|action)="([^"]+)"/g)) {
			const reference = match[1];
			if (!reference || reference.startsWith("#")) continue;
			const url = new URL(reference, "https://readonly-static.invalid/");
			if (url.origin !== "https://readonly-static.invalid") continue;

			const pathname = decodeURIComponent(url.pathname);
			if (unavailableRoutePrefixes.some((prefix) => pathname.startsWith(prefix))) {
				throw new Error(`只读静态页面 ${relative(root, htmlPath)} 引用了不可用路径：${reference}`);
			}

			const localPath = pathname.replace(/^\/+/, "");
			const candidates = pathname.endsWith("/")
				? [resolve(root, localPath, "index.html")]
				: [resolve(root, localPath), resolve(root, localPath, "index.html")];
			let resolved = false;
			for (const candidate of candidates) {
				if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) continue;
				if (await isFile(candidate)) {
					resolved = true;
					break;
				}
			}
			if (!resolved) {
				throw new Error(`只读静态页面 ${relative(root, htmlPath)} 存在悬空引用：${reference}`);
			}
		}
	}
}

export async function prepareReadonlyStatic(
	projectRoot = process.cwd(),
	sourceDirectory = join(projectRoot, "dist", "client"),
	targetDirectory = join(projectRoot, "dist", "readonly-static"),
) {
	const source = resolve(sourceDirectory);
	const target = resolve(targetDirectory);
	await rm(target, { recursive: true, force: true });
	await cp(source, target, {
		recursive: true,
		filter: (sourcePath) => includeInReadonlyArtifact(source, sourcePath),
	});
	const files = await artifactFiles(target);
	await validateHtmlReferences(target, files);

	const requiredFiles = [
		"index.html",
		join("browse", "index.html"),
		join("archive", "NJH000001", "index.html"),
		join("exports", "NJH000001.json"),
	];
	for (const file of requiredFiles) {
		if (!(await stat(join(target, file))).isFile()) {
			throw new Error(`只读静态产物缺少文件：${file}`);
		}
	}

	const exportCount = (await readdir(join(target, "exports"))).filter((file) =>
		file.endsWith(".json"),
	).length;
	if (exportCount === 0) throw new Error("只读静态产物没有档案导出");
	return { target, exportCount };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const result = await prepareReadonlyStatic();
	console.log(`只读静态产物已生成：${result.target}（${result.exportCount} 条档案导出）。`);
}
