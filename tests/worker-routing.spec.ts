import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

type BuiltWorker = {
	fetch: (
		request: Request,
		environment: { ASSETS: { fetch: (request: Request) => Promise<Response> } },
	) => Promise<Response>;
};

async function loadBuiltWorker(): Promise<BuiltWorker> {
	const builtWorkerPath = "../dist/server/index.js";
	const module = (await import(builtWorkerPath)) as { default: BuiltWorker };
	return module.default;
}

function assetEnvironment(requestedPaths: string[]) {
	return {
		ASSETS: {
			async fetch(request: Request) {
				requestedPaths.push(new URL(request.url).pathname);
				return new Response("asset", { status: 200 });
			},
		},
	};
}

test("构建后的 Worker 对 www 静态路径执行裸域永久跳转", async () => {
	const worker = await loadBuiltWorker();
	const requestedPaths: string[] = [];
	const response = await worker.fetch(
		new Request("https://www.nanjinghua.com/robots.txt?source=worker-test"),
		assetEnvironment(requestedPaths),
	);

	expect(response.status).toBe(308);
	expect(response.headers.get("location")).toBe(
		"https://nanjinghua.com/robots.txt?source=worker-test",
	);
	expect(requestedPaths).toEqual([]);
});

test("构建后的 Worker 为静态发现文件和实际哈希资源执行索引策略", async () => {
	const worker = await loadBuiltWorker();
	const hashedAsset = readdirSync("dist/client/assets").find((file) => file.endsWith(".js"));
	expect(hashedAsset).toBeTruthy();
	const paths = [
		"/robots.txt",
		"/sitemap.xml",
		`/assets/${hashedAsset}`,
		"/audio/nanjinghua-trials/breakfast.wav",
	];

	for (const pathname of paths) {
		const previewRequests: string[] = [];
		const previewResponse = await worker.fetch(
			new Request(`https://nanjinghua-com.xflash.workers.dev${pathname}`),
			assetEnvironment(previewRequests),
		);
		expect(previewResponse.status).toBe(200);
		expect(previewResponse.headers.get("x-robots-tag")).toBe("noindex, nofollow");
		expect(previewRequests).toEqual([pathname]);

		const canonicalRequests: string[] = [];
		const canonicalResponse = await worker.fetch(
			new Request(`https://nanjinghua.com${pathname}`),
			assetEnvironment(canonicalRequests),
		);
		expect(canonicalResponse.status).toBe(200);
		expect(canonicalResponse.headers.get("x-robots-tag")).toBeNull();
		expect(canonicalRequests).toEqual([pathname]);
	}
});
