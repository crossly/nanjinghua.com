import type { ArchiveEntry, Article, Collection } from "./registry";
import { culturalFormSchema, evidenceIdentitySchema } from "./schema.ts";

export const discoveryContentTypes = ["档案条目", "专题文章", "专题集合"] as const;
export const discoveryEvidenceIdentities = evidenceIdentitySchema.options;
export const discoveryTimePeriods = [
	"1900 年以前",
	"1900—1948 年",
	"1949—1999 年",
	"2000 年至今",
] as const;
export const discoveryPlaces = [
	"南京市秦淮区",
	"南京市鼓楼区",
	"南京市（未细分）",
	"南京市域外或地点未详",
] as const;
export const discoveryCulturalForms = culturalFormSchema.options;

export type DiscoveryContentType = (typeof discoveryContentTypes)[number];
export type DiscoveryEvidenceIdentity = (typeof discoveryEvidenceIdentities)[number];
export type DiscoveryTimePeriod = (typeof discoveryTimePeriods)[number];
export type DiscoveryPlace = (typeof discoveryPlaces)[number];
export type DiscoveryCulturalForm = (typeof discoveryCulturalForms)[number];

export type DiscoveryItem = {
	id: string;
	type: DiscoveryContentType;
	title: string;
	summary: string;
	href: string;
	label: string;
	details: string[];
	evidenceIdentity?: DiscoveryEvidenceIdentity;
	timePeriod?: DiscoveryTimePeriod;
	places: DiscoveryPlace[];
	culturalForms: DiscoveryCulturalForm[];
	searchText: string;
};

export type DiscoveryFilters = {
	q?: string;
	type?: DiscoveryContentType;
	evidence?: DiscoveryEvidenceIdentity;
	time?: DiscoveryTimePeriod;
	place?: DiscoveryPlace;
	culture?: DiscoveryCulturalForm;
};

function normalizeSearchText(value: string): string {
	return value
		.normalize("NFKC")
		.toLocaleLowerCase("zh-CN")
		.replace(/[^\p{Letter}\p{Number}]+/gu, "");
}

function searchText(parts: Array<string | undefined>): string {
	return normalizeSearchText(parts.filter(Boolean).join(" "));
}

function timePeriodFor(value: string): DiscoveryTimePeriod | undefined {
	const year = Number(value.match(/\d{4}/)?.[0]);
	if (!Number.isInteger(year)) return undefined;
	if (year < 1900) return "1900 年以前";
	if (year <= 1948) return "1900—1948 年";
	if (year <= 1999) return "1949—1999 年";
	return "2000 年至今";
}

function placesFor(parts: Array<string | undefined>): DiscoveryPlace[] {
	const location = parts.filter(Boolean).join(" ");
	const places: DiscoveryPlace[] = [];
	if (location.includes("秦淮")) places.push("南京市秦淮区");
	if (location.includes("鼓楼")) places.push("南京市鼓楼区");
	if (places.length > 0) return places;
	if (location.includes("南京")) return ["南京市（未细分）"];
	return ["南京市域外或地点未详"];
}

function archiveDiscoveryItem(entry: ArchiveEntry): DiscoveryItem {
	if (entry.publicationStatus !== "公开") {
		return {
			id: entry.id,
			type: "档案条目",
			title: entry.title,
			summary: entry.summary,
			href: `/archive/${entry.id}`,
			label: entry.publicationStatus,
			details: [entry.rightsStatus],
			places: [],
			culturalForms: [],
			searchText: searchText([entry.id, entry.title, entry.summary]),
		};
	}

	const places = placesFor([
		entry.archivePlace.recordedName,
		entry.archivePlace.historicalJurisdiction,
		entry.archivePlace.currentLocation,
		entry.archivePlace.materialCollectionPlace,
	]);
	const timePeriod = timePeriodFor(entry.archiveTime.materialDate);
	const peopleAndSources = entry.citations.flatMap((citation) => [
		...citation.responsibleParties,
		citation.title,
		citation.publication,
		citation.stableIdentifier,
	]);
	const aliases = entry.searchAliases?.flatMap((alias) => [alias.term, alias.mandarinPinyin]);

	return {
		id: entry.id,
		type: "档案条目",
		title: entry.title,
		summary: entry.summary,
		href: `/archive/${entry.id}`,
		label: entry.id,
		details: [entry.evidenceIdentity, entry.archiveTime.materialDate, places.join("、")],
		evidenceIdentity: entry.evidenceIdentity,
		timePeriod,
		places,
		culturalForms: entry.culturalForms ?? [],
		searchText: searchText([
			entry.id,
			entry.title,
			entry.summary,
			entry.body,
			entry.evidenceIdentity,
			...entry.languageScope,
			...(entry.culturalForms ?? []),
			...peopleAndSources,
			...(aliases ?? []),
		]),
	};
}

function articleDiscoveryItem(article: Article): DiscoveryItem {
	return {
		id: article.slug,
		type: "专题文章",
		title: article.title,
		summary: article.summary,
		href: `/articles/${article.slug}`,
		label: "专题文章",
		details: [
			article.author.name,
			article.review.status,
			`关联 ${article.archiveIds.length} 条档案`,
		],
		places: [],
		culturalForms: [],
		searchText: searchText([
			article.slug,
			article.title,
			article.summary,
			article.body,
			article.author.name,
			article.author.role,
			...article.archiveIds,
		]),
	};
}

function collectionDiscoveryItem(collection: Collection): DiscoveryItem {
	return {
		id: collection.slug,
		type: "专题集合",
		title: collection.title,
		summary: collection.summary,
		href: "/#opening-collection",
		label: `${collection.sequenceLabel} · ${collection.sequenceNumber}`,
		details: [`包含 ${collection.articleSlugs.length} 篇专题文章`],
		places: [],
		culturalForms: [],
		searchText: searchText([
			collection.slug,
			collection.title,
			collection.summary,
			...collection.articleSlugs,
		]),
	};
}

export function createDiscoveryItems(input: {
	archiveEntries: ArchiveEntry[];
	articles: Article[];
	collections: Collection[];
}): DiscoveryItem[] {
	return [
		...input.archiveEntries.map(archiveDiscoveryItem),
		...input.articles.map(articleDiscoveryItem),
		...input.collections.map(collectionDiscoveryItem),
	];
}

export function filterDiscoveryItems(
	items: DiscoveryItem[],
	filters: DiscoveryFilters,
): DiscoveryItem[] {
	const queryTokens = (filters.q ?? "").split(/\s+/).map(normalizeSearchText).filter(Boolean);

	return items.filter((item) => {
		if (filters.type && item.type !== filters.type) return false;
		if (filters.evidence && item.evidenceIdentity !== filters.evidence) return false;
		if (filters.time && item.timePeriod !== filters.time) return false;
		if (filters.place && !item.places.includes(filters.place)) return false;
		if (filters.culture && !item.culturalForms.includes(filters.culture)) return false;
		return queryTokens.every((token) => item.searchText.includes(token));
	});
}
