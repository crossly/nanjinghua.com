import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, MessageSquarePlus, Search } from "lucide-react";

import {
	archiveEntries,
	articles,
	getArticle,
	getArticlesForCollection,
	getCollection,
	getPublicArchiveEntry,
} from "../content/registry";

export const Route = createFileRoute("/")({
	head: () => ({
		links: [{ rel: "canonical", href: "https://nanjinghua.com/" }],
	}),
	component: Home,
});

const historicalPath = [
	{
		id: "NJH000008",
		period: "1864",
		note: "英文原著区分 Nanking、Peking 与西部发音系统，不把历史记录直接等同于当代南京话。",
	},
	{
		id: "NJH000005",
		period: "20 世纪 20 年代",
		note: "赵元任《南京音系》目前先作为书目线索，不把尚未取得的原文内容补写成结论。",
	},
	{
		id: "NJH000004",
		period: "1960",
		note: "区域调查成果把南京材料放进江苏与上海方言的可比较框架。",
	},
	{
		id: "NJH000002",
		period: "1993",
		note: "地方志专志系统整理南京方言，但它仍需与更早原始材料和后续调查相互核对。",
	},
	{
		id: "NJH000012",
		period: "2006",
		note: "有限学生样本记录新老派差异，结论只适用于论文交代的调查对象。",
	},
] as const;

function requirePublishedArchive(id: string) {
	const entry = getPublicArchiveEntry(id);
	if (!entry || entry.publicationStatus !== "公开") {
		throw new Error(`首页引用的公开档案不存在：${id}`);
	}
	return entry;
}

function Home() {
	const openingCollection = getCollection("what-is-nanjinghua");
	const [openingArticle, ...continuingArticles] = openingCollection
		? getArticlesForCollection(openingCollection)
		: [];
	const featuredArticle = getArticle("what-a-review-can-tell-us");
	const featuredArchive = featuredArticle
		? getPublicArchiveEntry(featuredArticle.archiveIds[0] ?? "")
		: undefined;
	const culturalArticle = getArticle("nanjinghua-cultural-forms");
	const historicalEntries = historicalPath.map((item) => ({
		...item,
		entry: requirePublishedArchive(item.id),
	}));
	const highlightedArchives = ["NJH000008", "NJH000015", "NJH000016"].map(requirePublishedArchive);
	const publicArchiveCount = archiveEntries.filter(
		(entry) => entry.publicationStatus === "公开",
	).length;

	if (
		!openingCollection ||
		!openingArticle ||
		!featuredArticle ||
		!featuredArchive ||
		featuredArchive.publicationStatus !== "公开" ||
		!culturalArticle?.visual
	) {
		throw new Error("首页缺少对应专题、档案条目或授权视觉素材");
	}
	const culturalVisual = culturalArticle.visual;

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
					<nav aria-label="首页导航">
						<a href="/browse" aria-label="浏览与检索档案">
							<Search aria-hidden="true" strokeWidth={1.5} />
							<span>浏览档案</span>
						</a>
						<span className="site-header__edition">公共数字档案 · 预览</span>
					</nav>
				</header>

				<div className="hero__content">
					<p className="hero__eyebrow">首发专题集合 · 01</p>
					<h1 id="site-title">南京话</h1>
					<p className="hero__subtitle">南京话的历史</p>
					<p className="hero__lede">
						从南京主城区地方话出发，辨清地域、年代与证据，连接历史记录与当代调查。
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
						<dd>文献与调查互证</dd>
					</div>
					<div>
						<dt>立场</dt>
						<dd>呈现差异，不定正宗</dd>
					</div>
				</dl>
			</section>

			<section className="historical-path" aria-labelledby="historical-path-title">
				<header className="historical-path__lead">
					<div>
						<p className="section-label">历史脉络</p>
						<h2 id="historical-path-title">从材料看见时间</h2>
					</div>
					<p>
						这里排列的是材料形成时间，不是一条把南京话说成单一起源、直线演变的年表。每个节点都回到档案原件、书目线索或调查范围。
					</p>
					<a href="/articles/historical-nanjing-speech">
						<span>阅读历史南京语音专题</span>
						<ArrowRight aria-hidden="true" strokeWidth={1.5} />
					</a>
				</header>

				<ol className="historical-path__list">
					{historicalEntries.map(({ entry, period, note }) => (
						<li key={entry.id}>
							<a href={`/archive/${entry.id}`}>
								<time>{period}</time>
								<div>
									<h3>{entry.title}</h3>
									<p>{note}</p>
									<span>
										{entry.id} · {entry.evidenceIdentity}
									</span>
								</div>
								<ArrowRight aria-hidden="true" strokeWidth={1.5} />
							</a>
						</li>
					))}
				</ol>
			</section>

			<section className="archive-highlights" aria-labelledby="archive-highlights-title">
				<div className="archive-highlights__inner">
					<header className="archive-highlights__lead">
						<div>
							<p className="section-label">真实内容入口</p>
							<h2 id="archive-highlights-title">精选档案</h2>
						</div>
						<p>
							从晚清文献到国家非遗名录和当代表演照片，不同材料各自说明它能证明什么，也公开不能证明什么。
						</p>
					</header>

					<figure className="archive-highlights__visual">
						<a href="/archive/NJH000016" aria-label="查看 NJH000016 南京白局演出照片档案">
							<img
								src={culturalVisual.src}
								width={culturalVisual.width}
								height={culturalVisual.height}
								alt={culturalVisual.alt}
								loading="lazy"
							/>
						</a>
						<figcaption>
							<span>南京白局演出现场。照片记录表演空间、演出者与观众关系。</span>
							<span>
								{culturalVisual.credit} ·{` `}
								<a href={culturalVisual.licenseUrl} target="_blank" rel="license noreferrer">
									{culturalVisual.license}
								</a>
								{` `}·{` `}
								<a href={culturalVisual.sourceUrl} target="_blank" rel="license noreferrer">
									Commons 来源
								</a>
							</span>
						</figcaption>
					</figure>

					<ol className="archive-highlights__list">
						{highlightedArchives.map((entry, index) => (
							<li key={entry.id}>
								<a href={`/archive/${entry.id}`}>
									<span className="archive-highlights__index">0{index + 1}</span>
									<div>
										<p>
											{entry.id} · {entry.evidenceIdentity}
										</p>
										<h3>{entry.title}</h3>
										<span>{entry.rightsStatus}</span>
									</div>
									<ArrowRight aria-hidden="true" strokeWidth={1.5} />
								</a>
							</li>
						))}
					</ol>
				</div>
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

			<section className="browse-entry" aria-labelledby="browse-entry-title">
				<div>
					<p className="section-label">
						{publicArchiveCount} 条正式档案 · {articles.length} 篇专题
					</p>
					<h2 id="browse-entry-title">从目录继续查找</h2>
				</div>
				<p>目录中的材料跨越历史记录、当代调查与文化现场，并分别保留来源和证据身份。</p>
				<a href="/browse">
					<Search aria-hidden="true" strokeWidth={1.5} />
					<span>浏览全部公开内容</span>
				</a>
			</section>
		</main>
	);
}
