import { createFileRoute } from "@tanstack/react-router";

import { CityHome } from "../components/city-home";
import { SITE_ORIGIN } from "../site";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "南京话｜南京城的声音" },
			{ name: "description", content: "一点点关于南京话、城市生活的记忆。" },
		],
		links: [{ rel: "canonical", href: `${SITE_ORIGIN}/` }],
	}),
	component: Home,
});

function Home() {
	return <CityHome />;
}
