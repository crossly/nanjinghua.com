import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import { SiteFooter } from "../components/site-footer";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "南京话｜南京城的声音",
			},
			{
				name: "description",
				content: "从十五个南京城日常场景出发，记录说话方式、城市生活和仍在变化的地方记忆。",
			},
			{
				name: "theme-color",
				content: "#171714",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml",
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="zh-CN">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<SiteFooter />
				<Scripts />
			</body>
		</html>
	);
}
