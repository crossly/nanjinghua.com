import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
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
				// The prerenderer reads crawled responses as text, so binary downloads must keep Vite's bytes.
				filter: (page) => !page.path.startsWith("/api/") && !page.path.startsWith("/downloads/"),
			},
		}),
		viteReact(),
	],
});

export default config;
