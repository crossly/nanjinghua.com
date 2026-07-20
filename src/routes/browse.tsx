import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { ArchiveHeader } from "../components/archive-header";
import {
	createDiscoveryItems,
	type DiscoveryFilters,
	discoveryContentTypes,
	discoveryCulturalForms,
	discoveryEvidenceIdentities,
	discoveryPlaces,
	discoveryTimePeriods,
	filterDiscoveryItems,
} from "../content/discovery";
import { archiveEntries, articles, collections } from "../content/registry";
import { SITE_ORIGIN } from "../site";

const discoveryItems = createDiscoveryItems({ archiveEntries, articles, collections });

function acceptedValue<const T extends readonly string[]>(
	value: unknown,
	values: T,
): T[number] | undefined {
	return typeof value === "string" && values.includes(value) ? (value as T[number]) : undefined;
}

export const Route = createFileRoute("/browse")({
	validateSearch: (search: Record<string, unknown>) => ({
		q: typeof search.q === "string" && search.q.trim() ? search.q.trim().slice(0, 120) : undefined,
		type: acceptedValue(search.type, discoveryContentTypes),
		evidence: acceptedValue(search.evidence, discoveryEvidenceIdentities),
		time: acceptedValue(search.time, discoveryTimePeriods),
		place: acceptedValue(search.place, discoveryPlaces),
		culture: acceptedValue(search.culture, discoveryCulturalForms),
	}),
	head: ({ match }) => ({
		meta: [
			{ title: "浏览与检索｜南京话" },
			{
				name: "description",
				content: "检索南京话档案、专题文章和专题集合，并按受控档案字段组合筛选。",
			},
			...(Object.values(match.search).some(Boolean)
				? []
				: [{ name: "nanjinghua-static-shell", content: "browse" }]),
		],
		links: [{ rel: "canonical", href: `${SITE_ORIGIN}/browse` }],
	}),
	component: BrowsePage,
});

function BrowsePage() {
	const requestedFilters = Route.useSearch();
	const [searchReady, setSearchReady] = useState(
		() =>
			typeof document === "undefined" ||
			!document.querySelector('meta[name="nanjinghua-static-shell"][content="browse"]'),
	);
	useEffect(() => setSearchReady(true), []);
	const filters: DiscoveryFilters = searchReady ? requestedFilters : {};
	const results = filterDiscoveryItems(discoveryItems, filters);
	const activeFilterCount = Object.values(filters).filter(Boolean).length;

	return (
		<main className="interior-page">
			<ArchiveHeader />
			<section className="discovery" aria-labelledby="discovery-title">
				<header className="discovery__lead">
					<div>
						<p className="section-label">公共档案目录</p>
						<h1 id="discovery-title">浏览与检索</h1>
					</div>
					<p className="discovery__count" aria-live="polite">
						<strong>{results.length}</strong>
						<span>项结果</span>
					</p>
				</header>

				<form className="discovery-form" action="/browse" method="get">
					<label className="discovery-form__query">
						<span>搜索题名、人物、词语、正文或普通话拼音</span>
						<div>
							<Search aria-hidden="true" strokeWidth={1.5} />
							<input
								key={filters.q ?? ""}
								type="search"
								name="q"
								defaultValue={filters.q ?? ""}
								maxLength={120}
								placeholder="例如：赵元任、白局、nanjing baiju"
							/>
						</div>
					</label>

					<DiscoverySelect
						name="type"
						label="内容类型"
						allLabel="全部内容"
						options={discoveryContentTypes}
						value={filters.type}
					/>
					<DiscoverySelect
						name="evidence"
						label="档案证据身份"
						allLabel="全部证据身份"
						options={discoveryEvidenceIdentities}
						value={filters.evidence}
					/>
					<DiscoverySelect
						name="time"
						label="档案时间"
						allLabel="全部时期"
						options={discoveryTimePeriods}
						value={filters.time}
					/>
					<DiscoverySelect
						name="place"
						label="档案地点"
						allLabel="全部地点"
						options={discoveryPlaces}
						value={filters.place}
					/>
					<DiscoverySelect
						name="culture"
						label="文化形式"
						allLabel="全部文化形式"
						options={discoveryCulturalForms}
						value={filters.culture}
					/>

					<div className="discovery-form__actions">
						<button type="submit">
							<Search aria-hidden="true" strokeWidth={1.5} />
							<span>查看结果</span>
						</button>
						{activeFilterCount > 0 ? (
							<a href="/browse">
								<RotateCcw aria-hidden="true" strokeWidth={1.5} />
								<span>重置</span>
							</a>
						) : null}
					</div>
				</form>

				<section className="discovery-results" aria-labelledby="results-title">
					<header>
						<p className="section-label">检索结果</p>
						<h2 id="results-title">
							{activeFilterCount > 0 ? `当前条件 · ${results.length} 项` : "全部公开内容"}
						</h2>
					</header>

					{results.length > 0 ? (
						<ol>
							{results.map((item) => (
								<li key={`${item.type}-${item.id}`}>
									<div className="discovery-result__index">
										<span>{item.type}</span>
										<strong>{item.label}</strong>
									</div>
									<div className="discovery-result__content">
										<a href={item.href}>
											<h3>{item.title}</h3>
											<ArrowRight aria-hidden="true" strokeWidth={1.5} />
										</a>
										<p>{item.summary}</p>
										<ul aria-label="结果字段">
											{item.details.map((detail) => (
												<li key={detail}>{detail}</li>
											))}
										</ul>
									</div>
								</li>
							))}
						</ol>
					) : (
						<div className="discovery-empty">
							<p>没有符合当前条件的公开内容。</p>
							<a href="/browse">查看全部目录</a>
						</div>
					)}
				</section>
			</section>
		</main>
	);
}

function DiscoverySelect({
	name,
	label,
	allLabel,
	options,
	value,
}: {
	name: string;
	label: string;
	allLabel: string;
	options: readonly string[];
	value?: string;
}) {
	return (
		<label>
			<span>{label}</span>
			<select key={`${name}-${value ?? ""}`} name={name} defaultValue={value ?? ""}>
				<option value="">{allLabel}</option>
				{options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		</label>
	);
}
