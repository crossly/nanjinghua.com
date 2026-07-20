import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const root = resolve(process.env.NANJINGHUA_STATIC_ROOT || "dist/client");
const host = process.env.NANJINGHUA_STATIC_HOST || "127.0.0.1";
const port = Number(process.env.NANJINGHUA_STATIC_PORT || "4174");

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
	throw new Error("NANJINGHUA_STATIC_PORT 必须是有效端口");
}

const contentTypes: Record<string, string> = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".jpg": "image/jpeg",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml",
	".webp": "image/webp",
	".xml": "application/xml; charset=utf-8",
};

async function publicFile(pathname: string): Promise<string | null> {
	let decoded: string;
	try {
		decoded = decodeURIComponent(pathname);
	} catch {
		return null;
	}

	const relative = decoded.replace(/^\/+/, "");
	const candidates = decoded.endsWith("/")
		? [resolve(root, relative, "index.html")]
		: [resolve(root, relative), resolve(root, relative, "index.html")];

	for (const candidate of candidates) {
		if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) continue;
		try {
			if ((await stat(candidate)).isFile()) return candidate;
		} catch {
			// Try the next exact static-file candidate.
		}
	}
	return null;
}

const server = createServer(async (request, response) => {
	if (request.method !== "GET" && request.method !== "HEAD") {
		response.writeHead(405, { Allow: "GET, HEAD" });
		response.end();
		return;
	}

	const pathname = new URL(request.url || "/", "http://static.invalid").pathname;
	const file = await publicFile(pathname);
	if (!file) {
		response.writeHead(404, {
			"Content-Type": "text/plain; charset=utf-8",
			"X-Content-Type-Options": "nosniff",
		});
		response.end("Not Found\n");
		return;
	}

	const metadata = await stat(file);
	response.writeHead(200, {
		"Cache-Control": "no-store",
		"Content-Length": metadata.size,
		"Content-Type": contentTypes[extname(file)] || "application/octet-stream",
		"X-Content-Type-Options": "nosniff",
	});
	if (request.method === "HEAD") {
		response.end();
		return;
	}
	createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
	console.log(`严格静态预览：http://${host}:${port}（${root}）`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => server.close(() => process.exit(0)));
}
