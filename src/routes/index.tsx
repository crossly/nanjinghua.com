import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, MessageSquarePlus } from "lucide-react";

import {
	getArticle,
	getArticlesForCollection,
	getCollection,
	getPublicArchiveEntry,
} from "../content/registry";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const openingCollection = getCollection("what-is-nanjinghua");
	const [openingArticle, ...continuingArticles] = openingCollection
		? getArticlesForCollection(openingCollection)
		: [];
	const featuredArticle = getArticle("what-a-review-can-tell-us");
	const featuredArchive = featuredArticle
		? getPublicArchiveEntry(featuredArticle.archiveIds[0] ?? "")
		: undefined;

	if (
		!openingCollection ||
		!openingArticle ||
		!featuredArticle ||
		!featuredArchive ||
		featuredArchive.publicationStatus !== "公开"
	) {
		throw new Error("首页证据处理示例缺少对应专题或档案条目");
	}

	return (
		<main>
			<section className="hero" aria-labelledby="site-title">
				<img
					className="hero__map"
					src="/images/nanjing-city-map-1940.jpg"
					alt="1940 年《南京市区图》扫描件"
					width="1920"
					height="2816"
					fetchPriority="high"
				/>
				<div className="hero__veil" aria-hidden="true" />

				<header className="site-header">
					<a className="site-header__brand" href="/" aria-label="南京话首页">
						南京话
					</a>
					<span className="site-header__edition">公共数字档案 · 预览</span>
				</header>

				<div className="hero__content">
					<p className="hero__eyebrow">首发专题集合 · 01</p>
					<h1 id="site-title">南京话</h1>
					<p className="hero__subtitle">南京话的历史</p>
					<p className="hero__lede">
						从南京主城区地方话出发，辨清地域、年代与证据，连接历史记录与当代声音。
					</p>
					<a className="hero__action" href="#opening-collection">
						<span>进入首发专题集合</span>
						<ArrowDown aria-hidden="true" strokeWidth={1.5} />
					</a>
				</div>

				<p className="hero__source">
					图：1940 年《南京市区图》· 公版
					<a
						href="https://commons.wikimedia.org/wiki/File:1940_Department_of_Land,_Nanking_City_Government_Nanking_Administrative_division_Map.jpg"
						target="_blank"
						rel="license noreferrer"
						aria-label="在 Wikimedia Commons 查看 1940 年《南京市区图》来源"
					>
						来源
						<ArrowUpRight aria-hidden="true" strokeWidth={1.5} />
					</a>
				</p>
			</section>

			<section
				className="opening-collection"
				id="opening-collection"
				aria-labelledby="opening-title"
			>
				<div className="opening-collection__index" aria-hidden="true">
					<span>{openingCollection.sequenceLabel}</span>
					<strong>{openingCollection.sequenceNumber}</strong>
				</div>

				<div className="opening-collection__intro">
					<p className="section-label">首发专题集合</p>
					<h2 id="opening-title">{openingCollection.title}</h2>
					<p>{openingCollection.summary}</p>
					<a className="opening-collection__link" href={`/articles/${openingArticle.slug}`}>
						<span>进入“{openingArticle.title}”专题</span>
						<ArrowRight aria-hidden="true" strokeWidth={1.5} />
					</a>
					{continuingArticles.length > 0 ? (
						<div className="opening-collection__published">
							<p>继续阅读</p>
							<ol>
								{continuingArticles.map((article) => (
									<li key={article.slug}>
										<a href={`/articles/${article.slug}`}>
											<span>{article.title}</span>
											<ArrowRight aria-hidden="true" strokeWidth={1.5} />
										</a>
									</li>
								))}
							</ol>
						</div>
					) : null}
				</div>

				<dl className="opening-collection__dimensions">
					<div>
						<dt>范围</dt>
						<dd>主城区地方话</dd>
					</div>
					<div>
						<dt>路径</dt>
						<dd>文献与声音互证</dd>
					</div>
					<div>
						<dt>立场</dt>
						<dd>呈现差异，不定正宗</dd>
					</div>
				</dl>
			</section>

			<section className="evidence-example" aria-labelledby="evidence-example-title">
				<div className="evidence-example__heading">
					<p className="section-label">方法公开</p>
					<p className="evidence-example__number" aria-hidden="true">
						{featuredArchive.id.slice(0, 3)} · {featuredArchive.id.slice(3)}
					</p>
				</div>
				<div className="evidence-example__content">
					<h2 id="evidence-example-title">{featuredArticle.title}</h2>
					<p>{featuredArticle.summary}</p>
					<div className="evidence-example__links">
						<a href={`/articles/${featuredArticle.slug}`}>
							<span>查看证据处理示例</span>
							<ArrowRight aria-hidden="true" strokeWidth={1.5} />
						</a>
						<a href="/contribute">
							<span>提供线索</span>
							<MessageSquarePlus aria-hidden="true" strokeWidth={1.5} />
						</a>
					</div>
				</div>
				<dl className="evidence-example__status">
					<div>
						<dt>证据身份</dt>
						<dd>{featuredArchive.evidenceIdentity}</dd>
					</div>
					<div>
						<dt>来源</dt>
						<dd>官方期刊记录</dd>
					</div>
					<div>
						<dt>权利</dt>
						<dd>{featuredArchive.rightsStatus}</dd>
					</div>
				</dl>
			</section>
		</main>
	);
}
