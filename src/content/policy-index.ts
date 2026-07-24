export const policyNavigation = [
	{ group: "项目", slug: "about", label: "关于本站" },
	{ group: "项目", slug: "editorial", label: "内容与复核" },
	{ group: "项目", slug: "transparency", label: "AI 与透明度" },
	{ group: "使用与反馈", slug: "rights-and-licensing", label: "版权与使用" },
	{ group: "使用与反馈", slug: "privacy", label: "隐私说明" },
	{ group: "使用与反馈", slug: "corrections-and-rights", label: "纠错与权利" },
	{ group: "使用与反馈", slug: "accessibility", label: "无障碍说明" },
] as const;

const policyGroupLabels = ["项目", "使用与反馈"] as const;

export const policyNavigationGroups = policyGroupLabels.map((label) => ({
	label,
	items: policyNavigation.filter((item) => item.group === label),
}));

export type PolicySlug = (typeof policyNavigation)[number]["slug"];

export function policyIdentity<const T extends PolicySlug>(slug: T) {
	const item = policyNavigation.find((candidate) => candidate.slug === slug);
	if (!item) throw new Error(`制度导航缺少路径：${slug}`);
	return { slug, navLabel: item.label };
}
