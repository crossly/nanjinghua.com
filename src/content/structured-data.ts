import type { ArchiveEntry } from "./registry";

const archiveBaseUrl = "https://nanjinghua.com/archive";
const metadataLicenseUrl = "https://creativecommons.org/publicdomain/zero/1.0/";

export function formatArchiveCitation(entry: ArchiveEntry): string {
	return `${entry.review.reviewer}整理：《${entry.title}》，南京话，档案编号 ${entry.id}，${entry.publishedAt}，${archiveBaseUrl}/${entry.id}。`;
}

export function toArchiveExport(entry: ArchiveEntry) {
	return {
		"@context": {
			dc: "http://purl.org/dc/elements/1.1/",
			dcterms: "http://purl.org/dc/terms/",
			nanjinghua: "https://nanjinghua.com/ns#",
		},
		"@id": `${archiveBaseUrl}/${entry.id}`,
		"dc:identifier": entry.id,
		"dc:title": entry.title,
		"dc:description": entry.summary,
		"dc:type": "档案条目",
		"dc:rights": "CC0 1.0 Universal",
		"dcterms:license": metadataLicenseUrl,
		"dcterms:temporal": entry.archiveTime,
		"dcterms:spatial": entry.archivePlace,
		"dc:source": entry.citations,
		"nanjinghua:evidenceIdentity": entry.evidenceIdentity,
		"nanjinghua:languageScope": entry.languageScope,
		"nanjinghua:sourceRights": entry.rightsStatus,
		"nanjinghua:review": entry.review,
		"nanjinghua:aiAssistance": entry.aiAssistance,
		"nanjinghua:canonicalCitation": formatArchiveCitation(entry),
		"dcterms:issued": entry.publishedAt,
		"dcterms:modified": entry.updatedAt,
	};
}

export function toArchiveJsonLd(entry: ArchiveEntry) {
	return {
		"@context": "https://schema.org",
		"@type": "ArchiveComponent",
		identifier: entry.id,
		name: entry.title,
		description: entry.summary,
		dateCreated: entry.archiveTime.materialDate,
		datePublished: entry.publishedAt,
		dateModified: entry.updatedAt,
		spatialCoverage: entry.archivePlace.currentLocation ?? entry.archivePlace.recordedName,
		license: metadataLicenseUrl,
		conditionsOfAccess: entry.rightsStatus,
		about: entry.languageScope,
		isPartOf: {
			"@type": "ArchiveOrganization",
			name: "南京话",
			url: "https://nanjinghua.com",
		},
		citation: entry.citations.map((citation) => ({
			"@type": "CreativeWork",
			name: citation.title,
			url: citation.url,
			identifier: citation.stableIdentifier,
		})),
	};
}
