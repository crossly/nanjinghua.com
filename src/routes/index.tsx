import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
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
					<p className="hero__eyebrow">一座城市的声音档案</p>
					<h1 id="site-title">南京话</h1>
					<p className="hero__subtitle">南京话的历史</p>
					<p className="hero__lede">从一段声音、一页文献出发，追寻南京这座城市留下的语言。</p>
					<a className="hero__action" href="#opening-collection">
						<span>进入第一辑</span>
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
					<span>第一辑</span>
					<strong>01</strong>
				</div>

				<div className="opening-collection__intro">
					<p className="section-label">首发专题</p>
					<h2 id="opening-title">南京话是什么？</h2>
					<p>
						先辨清地域、年代与证据，再谈一种语言从何而来。第一辑将从南京主城区地方话出发，连接历史记录与当代声音。
					</p>
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
		</main>
	);
}
