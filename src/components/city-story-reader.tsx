import { ArrowUpRight, Music2 } from "lucide-react";

import type { CityStory } from "../content/city-stories";

export function CityStoryReader({ story }: { story: CityStory }) {
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
			</figure>

			<div className="city-story__body">
				{story.paragraphs.map((paragraph) => (
					<p key={paragraph}>{paragraph}</p>
				))}

				{story.phraseCards.map((card) => (
					<aside className="city-story__phrase" key={card.title} aria-label={card.title}>
						<p>{card.title}</p>
						<span>{card.body}</span>
					</aside>
				))}
			</div>

			{story.music ? (
				<a className="city-story__music" href={story.music.href} target="_blank" rel="noreferrer">
					<Music2 aria-hidden="true" strokeWidth={1.5} />
					<span>{story.music.title}</span>
					<ArrowUpRight aria-hidden="true" strokeWidth={1.5} />
				</a>
			) : null}

			{story.sourceNotes && story.sourceNotes.length > 0 ? (
				<section
					className="city-story__sources"
					aria-labelledby={`city-story-${story.slug}-sources`}
				>
					<h2 id={`city-story-${story.slug}-sources`}>想再翻一翻</h2>
					<ul>
						{story.sourceNotes.map((source) => (
							<li key={source.href}>
								<a href={source.href}>
									<span>{source.label}</span>
									<ArrowUpRight aria-hidden="true" strokeWidth={1.5} />
								</a>
								<p>{source.note}</p>
							</li>
						))}
					</ul>
				</section>
			) : null}
		</article>
	);
}
