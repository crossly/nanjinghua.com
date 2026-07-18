import { createFileRoute, notFound } from "@tanstack/react-router";

import { ArchiveHeader } from "../../components/archive-header";
import { MarkdownContent } from "../../components/markdown-content";
import { getArchiveEntriesForArticle, getArticle } from "../../content/registry";

export const Route = createFileRoute("/articles/$slug")({
	loader: ({ params }) => {
		const article = getArticle(params.slug);
		if (!article) throw notFound();
		return {
			article,
			archiveEntries: getArchiveEntriesForArticle(article),
		};
	},
	head: ({ loaderData }) => ({
		meta: loaderData
			? [
					{ title: `${loaderData.article.title}｜南京话` },
					{ name: "description", content: loaderData.article.summary },
				]
			: [],
		links: loaderData
			? [
					{
						rel: "canonical",
						href: `https://nanjinghua.com/articles/${loaderData.article.slug}`,
					},
				]
			: [],
	}),
	component: ArticlePage,
});

function ArticlePage() {
	const { article, archiveEntries } = Route.useLoaderData();

	return (
		<main className="interior-page">
			<ArchiveHeader />
			<article className="editorial-article">
				<header className="editorial-article__lead">
					<p className="section-label">专题文章</p>
					<h1>{article.title}</h1>
					<p className="editorial-article__summary">{article.summary}</p>
					<dl className="article-byline">
						<div>
							<dt>作者</dt>
							<dd>
								{article.author.name} · {article.author.role}
							</dd>
						</div>
						<div>
							<dt>审核</dt>
							<dd>
								{article.review.reviewer} · {article.review.status}
							</dd>
						</div>
						<div>
							<dt>发布</dt>
							<dd>{article.publishedAt}</dd>
						</div>
						<div>
							<dt>更新</dt>
							<dd>{article.updatedAt}</dd>
						</div>
						<div>
							<dt>AI</dt>
							<dd>{article.aiAssistance ? "辅助资料发现、归纳与初稿整理" : "未使用"}</dd>
						</div>
						<div>
							<dt>许可</dt>
							<dd>CC BY 4.0</dd>
						</div>
					</dl>
				</header>

				{article.visual ? (
					<figure className="editorial-article__visual">
						<img
							src={article.visual.src}
							width={article.visual.width}
							height={article.visual.height}
							alt={article.visual.alt}
							style={{ width: "100%", height: "auto" }}
						/>
						<figcaption>
							<span>{article.visual.caption}</span>
							<span>
								图：{article.visual.credit} ·{" "}
								<a href={article.visual.licenseUrl} target="_blank" rel="license noreferrer">
									{article.visual.license}
								</a>{" "}
								·{" "}
								<a href={article.visual.sourceUrl} target="_blank" rel="noreferrer">
									查看来源
								</a>
							</span>
						</figcaption>
					</figure>
				) : null}

				<div className="editorial-article__body">
					<MarkdownContent>{article.body}</MarkdownContent>
				</div>

				<section className="article-archives" aria-labelledby="article-archives-title">
					<header>
						<p className="section-label">证据链</p>
						<h2 id="article-archives-title">本篇关联档案</h2>
					</header>
					<ol>
						{archiveEntries.map((entry) => (
							<li key={entry.id}>
								<a href={`/archive/${entry.id}`}>
									<span className="article-archives__id">{entry.id}</span>
									<strong>{entry.title}</strong>
								</a>
								<p>{entry.summary}</p>
								{entry.publicationStatus === "公开" ? (
									<dl>
										<div>
											<dt>证据身份</dt>
											<dd>{entry.evidenceIdentity}</dd>
										</div>
										<div>
											<dt>语言对象</dt>
											<dd>{entry.languageScope.join("、")}</dd>
										</div>
										{entry.culturalForms ? (
											<div>
												<dt>文化形式</dt>
												<dd>{entry.culturalForms.join("、")}</dd>
											</div>
										) : null}
										<div>
											<dt>权利</dt>
											<dd>{entry.rightsStatus}</dd>
										</div>
									</dl>
								) : (
									<dl>
										<div>
											<dt>公开状态</dt>
											<dd>{entry.publicationStatus}</dd>
										</div>
										<div>
											<dt>权利</dt>
											<dd>{entry.rightsStatus}</dd>
										</div>
									</dl>
								)}
							</li>
						))}
					</ol>
				</section>

				{article.plannedArchiveRelations ? (
					<section className="planned-archives" aria-labelledby="planned-archives-title">
						<header>
							<p className="section-label">后续采集</p>
							<h2 id="planned-archives-title">待关联档案</h2>
						</header>
						<ul>
							{article.plannedArchiveRelations.map((relation) => (
								<li key={relation.label}>
									<div>
										<h3>{relation.label}</h3>
										<span>{relation.status}</span>
									</div>
									<p>{relation.description}</p>
								</li>
							))}
						</ul>
					</section>
				) : null}
			</article>
		</main>
	);
}
