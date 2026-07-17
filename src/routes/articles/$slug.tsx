import { createFileRoute, notFound } from "@tanstack/react-router";

import { ArchiveHeader } from "../../components/archive-header";
import { MarkdownContent } from "../../components/markdown-content";
import { getArticle } from "../../content/registry";

export const Route = createFileRoute("/articles/$slug")({
	loader: ({ params }) => {
		const article = getArticle(params.slug);
		if (!article) throw notFound();
		return article;
	},
	head: ({ loaderData }) => ({
		meta: loaderData
			? [
					{ title: `${loaderData.title}｜南京话` },
					{ name: "description", content: loaderData.summary },
				]
			: [],
	}),
	component: ArticlePage,
});

function ArticlePage() {
	const article = Route.useLoaderData();

	return (
		<main className="interior-page">
			<ArchiveHeader />
			<article className="editorial-article">
				<header className="editorial-article__lead">
					<p className="section-label">证据处理示例</p>
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

				<div className="editorial-article__body">
					<MarkdownContent>{article.body}</MarkdownContent>
				</div>
			</article>
		</main>
	);
}
