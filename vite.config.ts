import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig(({ mode }) => {
	if (mode === "production" && process.env.VITE_ARCHIVE_GOVERNANCE_FIXTURES === "1") {
		throw new Error("治理测试夹具不能进入 production 构建");
	}

	return {
		resolve: { tsconfigPaths: true },
		plugins: [
			cloudflare({ viteEnvironment: { name: "ssr" } }),
			tanstackStart({
				server: { entry: "server.ts" },
				pages: [
					{ path: "/" },
					{ path: "/articles/what-a-review-can-tell-us" },
					{ path: "/archive/NJH000001" },
				],
				prerender: {
					enabled: true,
					failOnError: true,
					crawlLinks: true,
					// Binary downloads and query-dependent forms must keep their runtime response path.
					filter: (page) =>
						!page.path.startsWith("/api/") &&
						!page.path.startsWith("/downloads/") &&
						!page.path.startsWith("/contribute"),
				},
			}),
			viteReact(),
		],
	};
});

export default config;
