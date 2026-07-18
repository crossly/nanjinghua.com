export const policyNavigation = [
	{ group: "项目", slug: "about", label: "关于本站" },
	{ group: "项目", slug: "editorial", label: "编辑与证据原则" },
	{ group: "项目", slug: "transparency", label: "透明度与合作" },
	{ group: "权利与数据", slug: "rights-and-licensing", label: "版权与开放许可" },
	{ group: "权利与数据", slug: "privacy", label: "隐私政策" },
	{ group: "权利与数据", slug: "corrections-and-rights", label: "纠错与权利申诉" },
	{ group: "参与", slug: "accessibility", label: "无障碍说明" },
	{ group: "参与", slug: "participate", label: "参与贡献" },
] as const;

const policyGroupLabels = ["项目", "权利与数据", "参与"] as const;

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
