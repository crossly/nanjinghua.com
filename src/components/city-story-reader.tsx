import { ArrowUpRight, Music2, Pause, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type CityStory, cityLocations } from "../content/city-stories";
import { type CityStoryDialogueLine, getCityStoryDialogue } from "../content/city-story-dialogues";

export function CityStoryReader({ story }: { story: CityStory }) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playingUtterance, setPlayingUtterance] = useState<string>();
	const dialogue = getCityStoryDialogue(story.slug);
	const mapIndex = cityLocations.findIndex((location) => location.storySlug === story.slug);

	useEffect(
		() => () => {
			audioRef.current?.pause();
		},
		[],
	);

	function toggleAudio(line: CityStoryDialogueLine) {
		if (!line.audio) return;
		if (playingUtterance === line.utterance) {
			audioRef.current?.pause();
			setPlayingUtterance(undefined);
			return;
		}

		audioRef.current?.pause();
		const audio = new Audio(line.audio.src);
		audioRef.current = audio;
		setPlayingUtterance(line.utterance);
		audio.addEventListener("ended", () => setPlayingUtterance(undefined), { once: true });
		audio.addEventListener("error", () => setPlayingUtterance(undefined), { once: true });
		void audio.play().catch(() => setPlayingUtterance(undefined));
	}

	return (
		<article className="city-story__article">
			<div className="city-story__lead">
				<p className="city-story__scene">城市散步 · {story.scene}</p>
				<h1 id={`city-story-${story.slug}-title`}>{story.title}</h1>
				<p className="city-story__summary">{story.summary}</p>
			</div>

			<figure className="city-story__visual">
				<img
					src={story.image.src}
					width={story.image.width}
					height={story.image.height}
					alt={story.image.alt}
					fetchPriority="high"
				/>
				{mapIndex >= 0 ? (
					<figcaption>
						<span>地图 {String(mapIndex + 1).padStart(2, "0")}</span>
						<strong>{story.scene}</strong>
					</figcaption>
				) : null}
			</figure>

			<div className="city-story__body">
				{story.paragraphs.slice(0, dialogue ? 1 : undefined).map((paragraph) => (
					<p key={paragraph}>{paragraph}</p>
				))}

				{dialogue ? (
					<section className="city-story__dialogue" aria-labelledby={`dialogue-${story.slug}`}>
						<header>
							<div>
								<p>场景口语</p>
								<h2 id={`dialogue-${story.slug}`}>听他们怎么说</h2>
							</div>
							<div className="city-story__dialogue-meta">
								<span>{dialogue.review}</span>
								<span>AI 合成试音 · 每个场景 1 条</span>
							</div>
						</header>
						<ol aria-label={`${story.scene}场景对话`}>
							{dialogue.lines.map((line, index) => (
								<li key={`${line.speaker}-${line.utterance}`}>
									<span className="city-story__dialogue-index">
										{String(index + 1).padStart(2, "0")}
									</span>
									<div>
										<p>{line.speaker}</p>
										<blockquote>{line.utterance}</blockquote>
										<dl>
											<div>
												<dt>普通话</dt>
												<dd>{line.meaning}</dd>
											</div>
											<div>
												<dt>怎么用</dt>
												<dd>{line.context}</dd>
											</div>
										</dl>
									</div>
									<button
										type="button"
										aria-label={`${
											playingUtterance === line.utterance ? "暂停" : "播放"
										}：${line.utterance}`}
										disabled={!line.audio}
										onClick={() => toggleAudio(line)}
										title={line.audio ? "播放 AI 合成试音" : "本句暂无试音"}
									>
										{playingUtterance === line.utterance ? (
											<Pause aria-hidden="true" strokeWidth={1.6} />
										) : (
											<Volume2 aria-hidden="true" strokeWidth={1.6} />
										)}
									</button>
								</li>
							))}
						</ol>
					</section>
				) : (
					story.phraseCards.map((card) => (
						<aside className="city-story__phrase" key={card.title} aria-label={card.title}>
							<p>{card.title}</p>
							<span>{card.body}</span>
						</aside>
					))
				)}
			</div>

			{story.music ? (
				<aside className="city-story__music" aria-label={`推荐聆听：${story.music.title}`}>
					<div className="city-story__music-mark" aria-hidden="true">
						<Music2 strokeWidth={1.5} />
					</div>
					<div className="city-story__music-copy">
						<p>
							<span>推荐聆听</span>
							<span aria-hidden="true">·</span>
							<span>{story.music.platform}</span>
						</p>
						<strong>{story.music.title}</strong>
						<span>{story.music.artist}</span>
					</div>
					<a
						href={story.music.href}
						target="_blank"
						rel="noreferrer"
						aria-label={`在 ${story.music.platform}打开《${story.music.title}》`}
					>
						<span>去听</span>
						<ArrowUpRight aria-hidden="true" strokeWidth={1.5} />
					</a>
				</aside>
			) : null}
		</article>
	);
}
