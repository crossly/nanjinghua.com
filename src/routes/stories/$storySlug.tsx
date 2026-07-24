import { createFileRoute, notFound, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CityHome } from "../../components/city-home";
import { CityStoryReader } from "../../components/city-story-reader";
import { getCityStory } from "../../content/city-stories";
import { SITE_ORIGIN } from "../../site";

export const Route = createFileRoute("/stories/$storySlug")({
	loader: ({ params }) => {
		const story = getCityStory(params.storySlug);
		if (!story) throw notFound();
		return { story };
	},
	head: ({ loaderData }) => {
		const story = loaderData?.story;
		return {
			meta: story
				? [{ title: `${story.title}｜南京话` }, { name: "description", content: story.summary }]
				: [],
			links: story ? [{ rel: "canonical", href: `${SITE_ORIGIN}/stories/${story.slug}` }] : [],
		};
	},
	component: CityStoryPage,
});

function CityStoryPage() {
	const { story } = Route.useLoaderData();
	const isDialogPresentation = useRouterState({
		select: (state) => isCityStoryDialogState(state.location.state),
	});

	if (isDialogPresentation) return <CityHome activeStory={story} />;

	return (
		<main className="city-story">
			<header className="city-story__header">
				<a href="/" aria-label="南京话首页">
					南京话
				</a>
				<p>南京城的声音</p>
				<a href="/" className="city-story__back">
					<ArrowLeft aria-hidden="true" strokeWidth={1.5} />
					<span>回到城市</span>
				</a>
			</header>

			<CityStoryReader story={story} />
		</main>
	);
}

function isCityStoryDialogState(state: unknown) {
	return (
		typeof state === "object" &&
		state !== null &&
		"cityStoryPresentation" in state &&
		state.cityStoryPresentation === "dialog"
	);
}
