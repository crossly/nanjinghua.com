import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig(({ mode }) => {
	if (mode !== "archive-governance-test" && process.env.VITE_ARCHIVE_GOVERNANCE_FIXTURES === "1") {
		throw new Error("治理测试夹具不能进入 production 构建");
	}
	const readonlyStatic = mode === "readonly-static";
	return {
		resolve: { tsconfigPaths: true },
		plugins: [
			cloudflare({ viteEnvironment: { name: "ssr" } }),
			tanstackStart({
				server: { entry: "server.ts" },
				pages: [{ path: "/" }],
				prerender: {
					enabled: true,
					failOnError: true,
					crawlLinks: true,
					// Binary downloads and submission forms must keep their runtime response path.
					filter: (page) =>
						!page.path.startsWith("/api/") &&
						!page.path.startsWith("/downloads/") &&
						!page.path.startsWith("/exports/") &&
						!page.path.startsWith("/contribute") &&
						(!readonlyStatic || !page.path.startsWith("/recording-kit")),
				},
			}),
			viteReact(),
		],
	};
});

export default config;
