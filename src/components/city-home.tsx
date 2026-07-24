import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { type CityStory, cityLocations, cityStories } from "../content/city-stories";
import { CityStoryReader } from "./city-story-reader";

type CityLocationStyle = CSSProperties & Record<"--city-x" | "--city-y", string>;
const dialogTriggerStorageKey = "nanjinghua:city-story-dialog-trigger";
const visitedStoriesStorageKey = "nanjinghua:visited-city-stories";

export function CityHome({ activeStory }: { activeStory?: CityStory }) {
	const navigate = useNavigate();
	const router = useRouter();
	const mapTriggerRefs = useRef(new Map<string, HTMLAnchorElement>());
	const overviewTriggerRefs = useRef(new Map<string, HTMLAnchorElement>());
	const [visitedStorySlugs, setVisitedStorySlugs] = useState<readonly string[]>([]);
	const [activeStorySlug, setActiveStorySlug] = useState<string>();
	const [isInteractive, setIsInteractive] = useState(false);

	useEffect(() => {
		setIsInteractive(true);
	}, []);

	useEffect(() => {
		const savedStories = window.localStorage.getItem(visitedStoriesStorageKey);
		if (!savedStories) return;
		try {
			const parsedStories: unknown = JSON.parse(savedStories);
			if (
				Array.isArray(parsedStories) &&
				parsedStories.every((story) => typeof story === "string")
			) {
				setVisitedStorySlugs(parsedStories);
			}
		} catch {
			window.localStorage.removeItem(visitedStoriesStorageKey);
		}
	}, []);

	useEffect(() => {
		if (activeStory) return;
		const triggerKey = window.sessionStorage.getItem(dialogTriggerStorageKey);
		if (!triggerKey) return;
		window.sessionStorage.removeItem(dialogTriggerStorageKey);
		const [triggerType, triggerStorySlug] = triggerKey.includes(":")
			? triggerKey.split(":", 2)
			: ["map", triggerKey];
		const triggerRefs = triggerType === "overview" ? overviewTriggerRefs : mapTriggerRefs;
		triggerRefs.current.get(triggerStorySlug)?.focus();
	}, [activeStory]);

	function openStory(storySlug: string, trigger: HTMLAnchorElement) {
		const isMobile = window.matchMedia("(max-width: 44rem)").matches;
		if (!isMobile) {
			const triggerType = trigger.closest(".city-overview__list") ? "overview" : "map";
			window.sessionStorage.setItem(dialogTriggerStorageKey, `${triggerType}:${storySlug}`);
		}
		setVisitedStorySlugs((currentStories) => {
			if (currentStories.includes(storySlug)) return currentStories;
			const nextStories = [...currentStories, storySlug];
			window.localStorage.setItem(visitedStoriesStorageKey, JSON.stringify(nextStories));
			return nextStories;
		});

		void navigate({
			to: "/stories/$storySlug",
			params: { storySlug },
			state: isMobile
				? undefined
				: (state) => ({ ...state, cityStoryPresentation: "dialog" as const }),
		});
	}

	function closeStory() {
		router.history.back();
	}

	return (
		<main className="city-home" data-city-interactive={isInteractive || undefined}>
			<header className="city-home__header">
				<a href="/" aria-label="南京话首页">
					南京话
				</a>
				<nav aria-label="首页导航">
					<a href="#city-map">逛一逛</a>
					<a href="#city-overview">翻翻看</a>
					<a href="/browse">旧资料柜</a>
				</nav>
			</header>

			<section className="city-home__intro" aria-labelledby="site-title">
				<p>一点点关于南京话、城市生活的记忆</p>
				<h1 id="site-title">南京话</h1>
				<h2>南京城的声音</h2>
				<p className="city-home__lede">
					从一座想象的城市开始，慢慢走进巷口、车站、灯会和一顿还冒着热气的早饭。这里的“声音”先指说话与城市表达；故事页也提供少量
					AI 合成试音。
				</p>
				<a href="#city-map" className="city-home__scroll">
					<span>从公交站出发</span>
					<ArrowDown aria-hidden="true" strokeWidth={1.5} />
				</a>
			</section>

			<section className="city-map" id="city-map" aria-labelledby="city-map-title">
				<div className="city-map__heading">
					<div>
						<p>城市漫游 · 01</p>
						<h2 id="city-map-title">从一条街，慢慢走进去</h2>
					</div>
					<p>地图不是导览图。它只留下一些能停下来的地方。</p>
				</div>

				<div className="city-map__canvas">
					<img
						src="/images/city-map-v2.webp"
						width="1536"
						height="1024"
						alt="一张叙事型南京城市插画，十五个相连的街区场景依次呈现公交站、巷口、小店、菜场、早点铺、厨房、楼下、校门口、操场、新小区、电话、戏台、旧书桌、灯会街口和车站。"
						fetchPriority="high"
					/>
					<ol className="city-map__locations" aria-label="城市地点">
						{cityLocations.map((location, index) => (
							<li
								key={location.id}
								style={
									{
										"--city-x": `${location.position.x}%`,
										"--city-y": `${location.position.y}%`,
									} as CityLocationStyle
								}
							>
								<a
									href={`/stories/${location.storySlug}`}
									data-active={activeStorySlug === location.storySlug || undefined}
									className={
										visitedStorySlugs.includes(location.storySlug)
											? "city-map__location--visited"
											: undefined
									}
									ref={(node) => {
										if (node) mapTriggerRefs.current.set(location.storySlug, node);
									}}
									onClick={(event) => {
										event.preventDefault();
										openStory(location.storySlug, event.currentTarget);
									}}
									onMouseEnter={() => setActiveStorySlug(location.storySlug)}
									onMouseLeave={() => setActiveStorySlug(undefined)}
									onFocus={() => setActiveStorySlug(location.storySlug)}
									onBlur={() => setActiveStorySlug(undefined)}
									aria-label={`去${location.label}看看${
										visitedStorySlugs.includes(location.storySlug) ? "，已去过" : ""
									}`}
								>
									<span>{String(index + 1).padStart(2, "0")}</span>
									<strong>{location.label}</strong>
								</a>
							</li>
						))}
					</ol>
				</div>

				<ol className="city-map__mobile-list" aria-label="城市地点清单">
					{cityLocations.map((location, index) => (
						<li key={location.id}>
							<a
								href={`/stories/${location.storySlug}`}
								onClick={(event) => {
									event.preventDefault();
									openStory(location.storySlug, event.currentTarget);
								}}
								aria-label={`${location.label}，${
									visitedStorySlugs.includes(location.storySlug) ? "已去过" : "进去看看"
								}`}
							>
								<span>{String(index + 1).padStart(2, "0")}</span>
								<strong>{location.label}</strong>
								<span>
									{visitedStorySlugs.includes(location.storySlug) ? "已去过" : "进去看看"}
								</span>
							</a>
						</li>
					))}
				</ol>
			</section>

			<section className="city-overview" id="city-overview" aria-labelledby="city-overview-title">
				<div className="city-overview__heading">
					<div>
						<p>想再翻一翻</p>
						<h2 id="city-overview-title">翻翻看</h2>
					</div>
					<p>不想从地图开始，也可以从一段熟悉的日常走进去。</p>
				</div>

				<ol className="city-overview__list" aria-label="城市故事总览 城市故事索引">
					{cityStories.map((story, index) => (
						<li key={story.slug}>
							<a
								href={`/stories/${story.slug}`}
								data-active={activeStorySlug === story.slug || undefined}
								ref={(node) => {
									if (node) overviewTriggerRefs.current.set(story.slug, node);
								}}
								onClick={(event) => {
									event.preventDefault();
									openStory(story.slug, event.currentTarget);
								}}
								onMouseEnter={() => setActiveStorySlug(story.slug)}
								onMouseLeave={() => setActiveStorySlug(undefined)}
								onFocus={() => setActiveStorySlug(story.slug)}
								onBlur={() => setActiveStorySlug(undefined)}
							>
								<span className="city-overview__number">{String(index + 1).padStart(2, "0")}</span>
								<div>
									<p>
										城市散步 · {story.scene}
										{visitedStorySlugs.includes(story.slug) ? <em>已去过</em> : null}
									</p>
									<h3>{story.title}</h3>
								</div>
								<ArrowRight aria-hidden="true" strokeWidth={1.5} />
							</a>
						</li>
					))}
				</ol>

				<aside className="city-overview__archive" aria-labelledby="city-archive-title">
					<div>
						<p>旧资料柜</p>
						<h3 id="city-archive-title">有些旧页，也值得慢慢翻。</h3>
					</div>
					<a href="/browse">
						<span>去旧资料柜看看</span>
						<ArrowUpRight aria-hidden="true" strokeWidth={1.5} />
					</a>
				</aside>
			</section>

			{activeStory ? <CityStoryDialog story={activeStory} onDismiss={closeStory} /> : null}
		</main>
	);
}

function CityStoryDialog({ story, onDismiss }: { story: CityStory; onDismiss: () => void }) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		dialog.showModal();
		return () => {
			if (dialog.open) dialog.close();
		};
	}, []);

	return (
		<dialog
			ref={dialogRef}
			className="city-story-dialog"
			aria-labelledby={`city-story-${story.slug}-title`}
			onCancel={(event) => {
				event.preventDefault();
				onDismiss();
			}}
		>
			<div className="city-story-dialog__window">
				<header>
					<p>南京城的声音</p>
					<button type="button" onClick={onDismiss} aria-label="关闭故事窗口">
						<X aria-hidden="true" strokeWidth={1.5} />
					</button>
				</header>
				<CityStoryReader story={story} />
			</div>
		</dialog>
	);
}
