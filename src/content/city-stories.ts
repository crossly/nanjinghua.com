export type MusicBookplate = {
	title: string;
	href: string;
};

export type CityStorySourceNote = {
	label: string;
	href: string;
	note: string;
};

export type CityStory = {
	slug: string;
	title: string;
	scene: string;
	summary: string;
	image: {
		src: string;
		width: number;
		height: number;
		alt: string;
	};
	paragraphs: readonly string[];
	phraseCards: readonly {
		title: string;
		body: string;
	}[];
	music?: MusicBookplate;
	relatedStorySlugs?: readonly string[];
	sourceNotes?: readonly CityStorySourceNote[];
};

export type CityLocation = {
	id: string;
	label: string;
	position: { x: number; y: number };
	storySlug?: string;
};

export const cityStories = [
	{
		slug: "jigongjiao",
		title: "早高峰，南京人都在挤公交",
		scene: "公交站",
		summary: "车门一开，大家都往里挪。城市醒过来的时候，话也跟着醒了。",
		image: {
			src: "/images/city-story-jigongjiao.png",
			width: 1693,
			height: 929,
			alt: "清晨的梧桐树下，一辆砖红色公交车停在站台前，人们正依次上车。",
		},
		paragraphs: [
			"车门一开，大家都往里挪。有人把包往前抱一点，有人侧过身给后面的人让出半步，刚碰见的熟人也许只来得及点个头。早高峰不太会等谁，但它总有自己的默契。",
			"公交站像一座城的短暂停靠。几分钟里，早餐的热气、鞋跟敲在人行道上的声音、手机里没播完的话，全都挤在同一小块地方。你不必会说南京话，也能听懂这里的急和熟。",
			"有些话不需要说完。一个“往里点”，一个抬眼，一个顺手扶住快合上的车门，已经把人带进了同一段路。",
		],
		phraseCards: [
			{
				title: "挪一挪",
				body: "不是命令，也不必大声。把身体让出一点点，下一位就有地方上车。",
			},
		],
		music: {
			title: "去听《挤公交（bonus track）》",
			href: "https://y.qq.com/n/ryqq/songDetail/0038BI7X4Im2Kz",
		},
	},
] as const satisfies readonly CityStory[];

export function getCityStory(slug: string): CityStory | undefined {
	return cityStories.find((story) => story.slug === slug);
}

export const cityLocations: readonly CityLocation[] = [
	{ id: "bus-stop", label: "公交站", position: { x: 25, y: 68 }, storySlug: "jigongjiao" },
	{ id: "lane", label: "巷口", position: { x: 12, y: 48 } },
	{ id: "shop", label: "小店", position: { x: 37, y: 44 } },
	{ id: "stage", label: "戏台", position: { x: 56, y: 34 } },
	{ id: "desk", label: "旧书桌", position: { x: 72, y: 24 } },
	{ id: "market", label: "菜场", position: { x: 48, y: 63 } },
	{ id: "breakfast", label: "早点铺", position: { x: 67, y: 55 } },
	{ id: "kitchen", label: "厨房", position: { x: 19, y: 28 } },
	{ id: "downstairs", label: "楼下", position: { x: 34, y: 79 } },
	{ id: "school-gate", label: "校门口", position: { x: 51, y: 80 } },
	{ id: "playground", label: "操场边", position: { x: 79, y: 70 } },
	{ id: "festival-street", label: "灯会街口", position: { x: 82, y: 44 } },
	{ id: "new-estate", label: "新小区", position: { x: 61, y: 17 } },
	{ id: "station", label: "车站", position: { x: 87, y: 85 } },
	{ id: "phone", label: "手机屏幕", position: { x: 44, y: 20 } },
];
