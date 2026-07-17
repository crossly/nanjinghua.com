export {};

const requiredSecrets = ["TURNSTILE_SECRET_KEY", "EDITOR_API_KEY"] as const;

let input = "";
for await (const chunk of process.stdin) input += chunk;

let secrets: unknown;
try {
	secrets = JSON.parse(input);
} catch {
	throw new Error("无法读取 Cloudflare Worker secret 列表");
}

if (!Array.isArray(secrets)) throw new Error("Cloudflare Worker secret 列表格式无效");

const names = new Set(
	secrets.flatMap((secret) =>
		typeof secret === "object" && secret !== null && "name" in secret ? [String(secret.name)] : [],
	),
);
const missing = requiredSecrets.filter((name) => !names.has(name));

if (missing.length > 0) {
	throw new Error(`部署缺少 Worker secrets：${missing.join("、")}`);
}

console.log(`Worker secret 检查通过：${requiredSecrets.length} 项已配置。`);
