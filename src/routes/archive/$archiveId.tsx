import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpRight } from "lucide-react";

import { ArchiveHeader } from "../../components/archive-header";
import { MarkdownContent } from "../../components/markdown-content";
import { getArchiveEntry, getArticlesForArchive, getPrimaryCitation } from "../../content/registry";
import { formatArchiveCitation, toArchiveJsonLd } from "../../content/structured-data";

export const Route = createFileRoute("/archive/$archiveId")({
	loader: ({ params }) => {
		const entry = getArchiveEntry(params.archiveId);
		if (!entry) throw notFound();
		const relatedArticle = getArticlesForArchive(entry.id)[0];
		return {
			entry,
			relatedArticle: relatedArticle
				? { slug: relatedArticle.slug, title: relatedArticle.title }
				: null,
		};
	},
	head: ({ loaderData }) => ({
		meta: loaderData
			? [
					{ title: `${loaderData.entry.id}｜${loaderData.entry.title}｜南京话` },
					{ name: "description", content: loaderData.entry.summary },
				]
			: [],
	}),
	component: ArchiveEntryPage,
});

function ArchiveEntryPage() {
	const { entry, relatedArticle } = Route.useLoaderData();
	const primaryCitation = getPrimaryCitation(entry);
	const jsonLd = toArchiveJsonLd(entry);
	const serializedJsonLd = JSON.stringify(jsonLd).replaceAll("<", "\\u003c");

	return (
		<main className="interior-page">
			{/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized and script delimiters are escaped above. */}
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializedJsonLd }} />
			<ArchiveHeader
				backHref={relatedArticle ? `/articles/${relatedArticle.slug}` : "/"}
				backLabel={relatedArticle ? "返回专题" : "返回首页"}
			/>

			<article className="archive-record">
				<header className="archive-record__lead">
					<div className="archive-record__identity">
						<p className="archive-record__id">{entry.id}</p>
						<span>{entry.evidenceIdentity}</span>
					</div>
					<h1>{entry.title}</h1>
					<p className="archive-record__summary">{entry.summary}</p>
					<div className="archive-record__actions">
						<a href={primaryCitation.url} target="_blank" rel="noreferrer">
							<span>查看来源</span>
							<ArrowUpRight aria-hidden="true" strokeWidth={1.5} />
						</a>
						<a href={`/api/archive/${entry.id}`} download={`${entry.id}.json`}>
							<span>导出元数据</span>
							<ArrowDownToLine aria-hidden="true" strokeWidth={1.5} />
						</a>
					</div>
				</header>

				<section className="record-facts" aria-labelledby="record-facts-title">
					<div className="record-section-title">
						<p className="section-label">编目字段</p>
						<h2 id="record-facts-title">材料与审核</h2>
					</div>
					<dl>
						<div>
							<dt>证据身份</dt>
							<dd>{entry.evidenceIdentity}</dd>
						</div>
						<div>
							<dt>权利状态</dt>
							<dd>{entry.rightsStatus}</dd>
						</div>
						<div>
							<dt>材料时间</dt>
							<dd>{entry.archiveTime.materialDate}</dd>
						</div>
						<div>
							<dt>所述时期</dt>
							<dd>{entry.archiveTime.describedPeriod}</dd>
						</div>
						<div>
							<dt>档案地点</dt>
							<dd>{entry.archivePlace.recordedName}</dd>
						</div>
						<div>
							<dt>审核状态</dt>
							<dd>{entry.review.status}</dd>
						</div>
						<div>
							<dt>编辑责任</dt>
							<dd>{entry.review.reviewer}</dd>
						</div>
						<div>
							<dt>AI 辅助</dt>
							<dd>{entry.aiAssistance ? "资料发现、归纳与初稿整理" : "未使用"}</dd>
						</div>
						<div>
							<dt>元数据许可</dt>
							<dd>CC0 1.0</dd>
						</div>
					</dl>
				</section>

				<section className="archive-record__body" aria-label="档案说明">
					<MarkdownContent>{entry.body}</MarkdownContent>
				</section>

				<section className="citation-block" aria-labelledby="citation-title">
					<div className="record-section-title">
						<p className="section-label">永久引用</p>
						<h2 id="citation-title">怎样引用这条档案</h2>
					</div>
					<div>
						<p className="citation-block__text">{formatArchiveCitation(entry)}</p>
						<p className="citation-block__permalink">永久网址：nanjinghua.com/archive/{entry.id}</p>
					</div>
				</section>

				<section className="source-list" aria-labelledby="sources-title">
					<div className="record-section-title">
						<p className="section-label">来源记录</p>
						<h2 id="sources-title">核查入口</h2>
					</div>
					<ol>
						{entry.citations.map((citation) => (
							<li key={citation.url}>
								<p>{citation.title}</p>
								<span>
									{citation.role} · {citation.publication} · {citation.locator}
								</span>
								<a href={citation.url} target="_blank" rel="noreferrer">
									打开官方记录
									<ArrowUpRight aria-hidden="true" strokeWidth={1.5} />
								</a>
							</li>
						))}
					</ol>
				</section>
			</article>
		</main>
	);
}
