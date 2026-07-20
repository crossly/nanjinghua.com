import { SITE_ORIGIN } from "../site.ts";
import type { PublicArchiveEntry, PublishedArchiveEntry } from "./publication.ts";

const archiveBaseUrl = `${SITE_ORIGIN}/archive`;
const metadataLicenseUrl = "https://creativecommons.org/publicdomain/zero/1.0/";

export function formatArchiveCitation(entry: PublishedArchiveEntry): string {
	return `${entry.review.reviewer}整理：《${entry.title}》，南京话，档案编号 ${entry.id}，${entry.publishedAt}，${archiveBaseUrl}/${entry.id}。`;
}

export function toArchiveExport(entry: PublicArchiveEntry) {
	const base = {
		"@context": {
			dc: "http://purl.org/dc/elements/1.1/",
			dcterms: "http://purl.org/dc/terms/",
			nanjinghua: `${SITE_ORIGIN}/ns#`,
		},
		"@id": `${archiveBaseUrl}/${entry.id}`,
		"dc:identifier": entry.id,
		"dc:title": entry.title,
		"dc:description": entry.summary,
		"dc:type": "档案条目",
		"dc:rights": "CC0 1.0 Universal",
		"dcterms:license": metadataLicenseUrl,
		"nanjinghua:publicationStatus": entry.publicationStatus,
		"nanjinghua:sourceRights": entry.rightsStatus,
		"dcterms:issued": entry.publishedAt,
		"dcterms:modified": entry.updatedAt,
	};

	if (entry.publicationStatus !== "公开") return base;

	return {
		...base,
		"dcterms:created": entry.archiveTime.materialDate,
		"dcterms:temporal": entry.archiveTime.describedPeriod,
		"dcterms:spatial": entry.archivePlace,
		"dc:source": entry.citations,
		"nanjinghua:evidenceIdentity": entry.evidenceIdentity,
		"nanjinghua:languageScope": entry.languageScope,
		"nanjinghua:culturalForms": entry.culturalForms,
		"nanjinghua:searchAliases": entry.searchAliases,
		"nanjinghua:archiveTime": entry.archiveTime,
		"nanjinghua:preservedFiles": entry.preservedFiles,
		"nanjinghua:revisions": entry.revisions,
		"nanjinghua:review": entry.review,
		"nanjinghua:aiAssistance": entry.aiAssistance,
		"nanjinghua:canonicalCitation": formatArchiveCitation(entry),
	};
}

export function toArchiveJsonLd(entry: PublicArchiveEntry) {
	const base = {
		"@context": "https://schema.org",
		"@type": "ArchiveComponent",
		identifier: entry.id,
		name: entry.title,
		description: entry.summary,
		datePublished: entry.publishedAt,
		dateModified: entry.updatedAt,
		license: metadataLicenseUrl,
		conditionsOfAccess: entry.rightsStatus,
		isPartOf: {
			"@type": "ArchiveOrganization",
			name: "南京话",
			url: SITE_ORIGIN,
		},
	};

	if (entry.publicationStatus !== "公开") return base;

	return {
		...base,
		dateCreated: entry.archiveTime.materialDate,
		spatialCoverage: entry.archivePlace.currentLocation ?? entry.archivePlace.recordedName,
		about: [...entry.languageScope, ...(entry.culturalForms ?? [])],
		citation: entry.citations.map((citation) => ({
			"@type": "CreativeWork",
			name: citation.title,
			url: citation.url,
			identifier: citation.stableIdentifier,
		})),
	};
}
