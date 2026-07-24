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

const cityStoryArchiveNote: CityStorySourceNote = {
	label: "去旧资料柜看看",
	href: "/browse",
	note: "这里可以继续浏览档案条目和专题文章，并查看各自的来源、权利与编辑说明；本页的城市场景是原创写作，不作为档案事实。",
};

export const cityStories = [
	{
		slug: "jigongjiao",
		title: "早高峰，南京人都在挤公交",
		scene: "公交站",
		summary: "车门一开，大家都往里挪。城市醒过来的时候，话也跟着醒了。",
		image: {
			src: "/images/city-story-jigongjiao.webp",
			width: 1662,
			height: 946,
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
	{
		slug: "lane",
		title: "巷口见着面，不急着走",
		scene: "巷口",
		summary: "一扇门、一棵树、一句顺口的招呼，把回家的路放慢一点。",
		image: {
			src: "/images/city-story-lane.webp",
			width: 1672,
			height: 941,
			alt: "午后的梧桐树下，两位邻居在安静的巷口停下来打招呼。",
		},
		paragraphs: [
			"巷口总有一点恰好。刚从菜场回来的人拎着一把青菜，正要关门的人还没把钥匙收好，两个人碰上了，就多站一会儿。没有要紧事，也不觉得这几分钟白花。",
			"一座城熟起来，未必靠每个人都认识彼此。可能只是见过几次面，知道对方常在这个时候回来，于是路过时抬抬下巴，问一句吃过没有。话不长，脚步却会跟着松下来。",
			"南京话里的招呼常常带着这样的余地。听不懂也没关系，语气先把门推开一条缝：不是盘问，是让你知道这里有人看见你回来了。",
		],
		phraseCards: [
			{
				title: "吃过啦？",
				body: "在巷口听见这句话，不一定真要逐项汇报一顿饭。它更像一句轻轻的“回来啦”，让人有机会停一停，也有机会笑着往前走。",
			},
		],
		sourceNotes: [cityStoryArchiveNote],
	},
	{
		slug: "shop",
		title: "小店的灯，还亮着",
		scene: "小店",
		summary: "下班路上买一瓶水，顺手把一天里没说完的话留在门口。",
		image: {
			src: "/images/city-story-shop.webp",
			width: 1672,
			height: 941,
			alt: "傍晚的街角小店亮着暖灯，店主正在把东西递给站在柜台前的顾客。",
		},
		paragraphs: [
			"天快黑的时候，小店的玻璃门总先亮起来。有人进去买水，有人只是找个地方躲两分钟的雨。店里东西摆得密，话却不用说得满，问一句“这个还有吗”，就能从货架间接上。",
			"熟一点的店主会记得你上次挑过哪一种汽水，但也不必把这当成什么大事。城市里这样的小小记得，刚好够让人觉得自己不是一路飘过去的。",
			"有些南京话会把称呼说得很亲近，落在这个场景里，更像是把陌生的买卖收一收边角。不是非要学会那一声，而是可以听见里面那点不着急的照应。",
		],
		phraseCards: [
			{
				title: "拿好哦",
				body: "一句普通的提醒，尾音放松一点，像是把找零、塑料袋和一句“路上当心”一块递到手里。",
			},
		],
		sourceNotes: [cityStoryArchiveNote],
	},
	{
		slug: "market",
		title: "菜场里，话比菜新鲜",
		scene: "菜场",
		summary: "一把青菜、一句问价、一个熟练的点头，早晨就热闹起来。",
		image: {
			src: "/images/city-story-market.webp",
			width: 1672,
			height: 941,
			alt: "清晨的菜场里，摊主正把一袋绿叶菜递给顾客，长长的过道通向晨光。",
		},
		paragraphs: [
			"菜场的早晨不用谁宣布开始。塑料袋一响，秤砣一落，第一批青菜带着水珠摆上来，过道里就有了方向。有人认真挑拣，有人远远地问一句今天什么新鲜。",
			"这里的对话常常很短，短到像是接力：要多少，够不够，给你装上。可话的速度不等于冷淡，手上多添一根葱、把袋口拧紧一点，都是不用特别解释的好意。",
			"别把菜场里的叫卖和应答当成一套需要背下来的方言课。它们只属于这一刻的声音和手势，跟着摊位、天气、相熟的程度慢慢变。",
		],
		phraseCards: [
			{
				title: "搭把手",
				body: "在菜场，它可以是一句请人帮忙把袋子提稳的话。重点不在说得多漂亮，而在两个人都知道下一步该怎么接。",
			},
		],
		sourceNotes: [cityStoryArchiveNote],
	},
	{
		slug: "breakfast",
		title: "早点铺的热气，先醒过来",
		scene: "早点铺",
		summary: "天刚亮，蒸汽和一句“慢点吃”已经把街口叫醒。",
		image: {
			src: "/images/city-story-breakfast.webp",
			width: 1672,
			height: 941,
			alt: "清晨的早点铺冒着热气，摊主在窄窄的柜台后准备早餐，街道刚刚苏醒。",
		},
		paragraphs: [
			"天刚亮，熟客在柜台前要一碗馄饨。摊主一边揭锅，一边把口味、分量和堂食外带问清楚。",
		],
		phraseCards: [
			{
				title: "趁热吃",
				body: "这是一句很实在的关照。早点铺里它既是在说食物，也是在提醒人别把自己的清晨过得太匆忙。",
			},
		],
		sourceNotes: [cityStoryArchiveNote],
	},
	{
		slug: "kitchen",
		title: "厨房里，总有人接着说",
		scene: "厨房",
		summary: "洗菜、摆碗、关小火，家里最平常的话都在这里续上。",
		image: {
			src: "/images/city-story-kitchen.webp",
			width: 1672,
			height: 941,
			alt: "夜晚的家庭厨房里，两个人一起准备晚饭，窗外是安静的城市灯光。",
		},
		paragraphs: [
			"厨房里的话很少需要一个正式开头。水龙头开着，菜叶还没沥干，谁今天回来得晚、明天要不要早点出门，就在递碗、擦桌子、关小火之间慢慢讲完。",
			"一家人说话的方式也不会总是一样。有人把普通话和南京话混在一起，有人只听得懂几个熟悉的尾音。重要的不是谁说得最像，而是每个人都能在饭菜的声音里找到自己的位置。",
			"这不是一幅关于“老样子”的图。窗外一直在变，厨房也会换新的锅和新的习惯；只是有人愿意把下一只碗摆好，这件事常常不会变。",
		],
		phraseCards: [
			{
				title: "我来吧",
				body: "厨房里的一句接手，不必带方言色彩也足够亲近。它让下一件小事有人一起做，也给谈话留一点继续的时间。",
			},
		],
		sourceNotes: [cityStoryArchiveNote],
	},
	{
		slug: "downstairs",
		title: "楼下的风，吹到天黑",
		scene: "楼下",
		summary: "椅子搬出来，窗灯亮起来，楼下留住一天最后一点闲话。",
		image: {
			src: "/images/city-story-downstairs.webp",
			width: 1672,
			height: 941,
			alt: "入夜的住宅楼下，几位邻居在有盆栽和长椅的小院里轻松停留，窗户透出暖光。",
		},
		paragraphs: [
			"天一暗，楼下才慢慢有空出来。有人把折叠椅搬到门口，有人推着孩子绕院子走一圈，也有人只是下来透透气。窗户一盏盏亮着，楼道里的脚步声变得不那么赶。",
			"这时候的聊天没什么主题，从天气说到谁家的花开了，再说到明天要不要带伞。说话的人和听话的人都可以换，偶尔插一句，偶尔只在旁边笑一笑。",
			"一座城市不只存在于大路和地标，也在这些不必安排的相遇里。南京话可能出现，也可能没有出现；楼下的亲近感从来不靠谁必须说对一句话。",
		],
		phraseCards: [
			{
				title: "下来坐坐",
				body: "它不是郑重的邀请，更像给晚风留出一个位置。想来就来，想先走也不用解释。",
			},
		],
		sourceNotes: [cityStoryArchiveNote],
	},
	{
		slug: "school-gate",
		title: "放学以后，路才慢下来",
		scene: "校门口",
		summary: "铃声散进树荫里，今天的新鲜事总要走一段路才说得完。",
		image: {
			src: "/images/city-story-school-gate.webp",
			width: 1672,
			height: 941,
			alt: "傍晚的校门口，学生们背着书包走出来，一位家长在梧桐树下扶着自行车等候。",
		},
		paragraphs: [
			"放学铃响过一阵，校门口才真正热闹起来。书包从一边肩膀换到另一边，没来得及在教室里说完的话，顺着树荫一路接下去。等候的人不必催，远远看见那个熟悉的身影，今天就算有了着落。",
			"有人在这里第一次听见同学家里说南京话，也有人从小只会听、很少开口。成长不要求每个人留下同一种口音；一句话在校园、家庭和朋友之间换着说法，本来就是城市现在的样子。",
			"多年以后再经过一扇校门，记住的也许不是哪句话最地道，而是放学以后忽然变宽的时间。旧日和今天都在这条路上走，并不需要分出谁更像南京。",
		],
		phraseCards: [
			{
				title: "慢慢走",
				body: "它可以是提醒，也可以只是陪伴。路不用赶完，今天发生的小事也不用一次讲清。",
			},
		],
		sourceNotes: [cityStoryArchiveNote],
	},
	{
		slug: "playground",
		title: "操场边，下一球还没结束",
		scene: "操场边",
		summary: "球落地又弹起来，不同年纪的人共享同一阵晚风。",
		image: {
			src: "/images/city-story-playground.webp",
			width: 1672,
			height: 941,
			alt: "夕阳下的社区球场里，年轻人正在打篮球，孩子在场边捡球，一位老人坐在树下休息。",
		},
		paragraphs: [
			"傍晚的操场没有统一的开场时间。有人刚放下书包，有人下班后才赶来，也有人坐在场边，只替每一个差点进的球叹口气。球鞋擦过地面，几句提醒在风里来回跑。",
			"这里说普通话还是南京话，往往跟组队一样自然，谁来都能接上。熟悉的语气可能从上一代传来，也会被年轻人加进新的说法里；变化不是把从前赶走，而是让同一块场地继续有人使用。",
			"灯亮起来以后，最后一球总要多打几次。城里的亲近有时就是这样：不用先说明来历，先把滚到脚边的球递回去。",
		],
		phraseCards: [
			{
				title: "再来一个",
				body: "它不是不肯结束，只是大家都愿意把这一小段晚风再留一会儿。",
			},
		],
		sourceNotes: [cityStoryArchiveNote],
	},
	{
		slug: "new-estate",
		title: "新小区，也会慢慢熟起来",
		scene: "新小区",
		summary: "楼是新的，招呼和照应仍要靠日子一遍遍添进去。",
		image: {
			src: "/images/city-story-new-estate.webp",
			width: 1672,
			height: 941,
			alt: "雨后的住宅小区里，一对年轻人提着菜与照料花草的邻居交谈，远处是亮起灯的新楼。",
		},
		paragraphs: [
			"刚搬来的时候，电梯里的每张脸都很陌生。过几天，门口多了几盆花，快递架旁有人替后面的人扶住门，雨后的路上也开始出现点头的熟人。新小区不是一夜之间变成家的。",
			"城市换了楼房、门禁和收快递的方式，生活里的照应却会找到新的落脚处。有人仍用南京话招呼，有人说普通话，也有人把两种说法放在一句话里。没有哪一种日常因此更旧或更新。",
			"等树长高一点，窗灯亮得更有规律，这里也会积下自己的记忆。它们不需要先成为怀旧的对象，今天发生的相遇已经足够真实。",
		],
		phraseCards: [
			{
				title: "顺手带一下",
				body: "在门禁、电梯或快递架旁，这句话把一件举手之劳说得很轻，也让陌生人有了下一次打招呼的理由。",
			},
		],
		sourceNotes: [cityStoryArchiveNote],
	},
	{
		slug: "phone-screen",
		title: "屏幕亮了，家里的话还在",
		scene: "手机屏幕",
		summary: "离得远一点，熟悉的语气仍会从一条消息里绕回来。",
		image: {
			src: "/images/city-story-phone-screen.webp",
			width: 1672,
			height: 941,
			alt: "夜晚的客厅里，一个人拿着显示抽象聊天气泡的手机，窗外有树影和城市灯光。",
		},
		paragraphs: [
			"手机屏幕亮起来，家里的群聊又多了几条消息。有人只打几个字，有人习惯按住说一小段；听见熟悉的尾音，远处的房间会忽然近一点。这里讲的是当下的联系，不是本站提供的音频。",
			"南京话到了屏幕里也不会停在原样。年轻人会换词、缩短句子，把普通话和南京话一起用；长辈也会学会新的表情和回复方式。语言没有被手机关住，它只是又多了一条回家的路。",
			"没听清时可以再问一句，不会说也可以照常回话。亲近不靠一次模仿得像，而在于对面知道你仍愿意接着聊。",
		],
		phraseCards: [
			{
				title: "到家说一声",
				body: "从门口跟到手机里，它还是一句普通的惦记。回复长短不重要，让人知道你平安就好。",
			},
		],
		sourceNotes: [cityStoryArchiveNote],
	},
	{
		slug: "stage",
		title: "戏台不大，故事坐得很近",
		scene: "戏台",
		summary: "灯一亮，唱的人和听的人就在同一个院子里碰见。",
		image: {
			src: "/images/city-story-stage.webp",
			width: 1672,
			height: 941,
			alt: "夜晚的小院戏台上，两位成年表演者正在演唱和伴奏，观众坐在近处安静观看。",
		},
		paragraphs: [
			"院子里搭起一方小台，灯泡亮了，搬来的椅子也差不多坐满。唱腔从近处起，不必隔着很远的舞台；有人听得熟，会在一句落下时笑起来，也有人第一次来，只跟着节奏慢慢坐定。",
			"白局是可以继续查证和了解的南京话文化形式，但不是每个南京人的共同记忆，也不代表南京话的全部。来到戏台，只是遇见城市里一条仍有人演、有人听的支流。",
			"散场以后，观众和表演者从同一扇门出去。文化材料回到日常里，才不会只剩一个被远远观看的名字。",
		],
		phraseCards: [
			{
				title: "听一会儿",
				body: "不必预先懂得曲牌或唱词。先坐下来听一小段，再决定要不要去旧资料柜里多翻一点。",
			},
		],
		sourceNotes: [
			{
				label: "国家级非物质文化遗产代表性项目“南京白局”",
				href: "/archive/NJH000015",
				note: "档案条目 NJH000015 整理了项目名录记录，并单独标明来源、权利和编辑状态；它是背景材料，不为本页原创场景背书。",
			},
		],
	},
	{
		slug: "desk",
		title: "旧书桌上，城一直在变",
		scene: "旧书桌",
		summary: "摊开一张旧图，不是为了找回唯一正确的南京。",
		image: {
			src: "/images/city-story-desk.webp",
			width: 1672,
			height: 941,
			alt: "窗边的旧书桌上摊着一张没有可读标签的城市图，一位读者正与现代笔记本对照查看。",
		},
		paragraphs: [
			"旧书桌的抽屉有点涩，地图摊开时还带着折痕。图上的路和今天对不上并不奇怪，城市改过名字、方向和生活的重心，读图的人也站在另一个时间里。",
			"旧地图适合让人提出问题，却不能单独回答南京话从哪里来、谁说得最正。历史语音和城市空间都需要材料互相印证；本页插画里的地图只是创作道具，不是一件真实馆藏。",
			"把旧图收好以前，可以记下一个想继续追的线索。资料的价值不在把变化抹平，而在让我们看见每一个判断从哪里开始。",
		],
		phraseCards: [
			{
				title: "再对一对",
				body: "面对旧材料，多找一份出处、多看一个年代，常常比急着下结论更接近“正本清源”。",
			},
		],
		sourceNotes: [
			{
				label: "《南京方言志》（1993 年专志）",
				href: "/archive/NJH000002",
				note: "档案条目 NJH000002 提供书目信息、证据身份和权利说明；它是进一步查阅的入口，不是本页虚构地图的来源。",
			},
		],
	},
	{
		slug: "festival-street",
		title: "灯亮起来，街口就有了节拍",
		scene: "灯会街口",
		summary: "节日不是旧照片，年轻的脚步也会把街道走出新的热闹。",
		image: {
			src: "/images/city-story-festival-street.webp",
			width: 1672,
			height: 941,
			alt: "入夜的街巷挂着温暖的手工灯彩，不同年纪的人从小摊旁走过并互相招呼。",
		},
		paragraphs: [
			"天色刚蓝下来，街口的灯已经一盏盏亮了。孩子仰头看，年轻人边走边聊，摆摊的人把热气腾腾的东西递出去；节日的街景不是只属于过去，它就在今晚重新被走一遍。",
			"热闹里可能听见南京话，也可能听见许多别的口音。没有一种声音需要代表整座城，大家只是共享同一段路和同一片灯光。新的歌、旧的招呼，都可以在这里停一会儿。",
			"想听一首歌，可以从下面的书签去官方平台；页面不会自动播放，也不复制音频、歌词或封面。是否让声音继续，由你自己决定。",
		],
		phraseCards: [
			{
				title: "走，去看看",
				body: "一句轻快的提议，不必把目的地说得很精确。先跟着亮起来的街口往前走，路上自然会有发现。",
			},
		],
		music: {
			title: "去听《Come on！莱斯狗！》",
			href: "https://y.qq.com/n/ryqq/songDetail/000pEaf80BVErP",
		},
		sourceNotes: [cityStoryArchiveNote],
	},
	{
		slug: "station",
		title: "车站把一句话带得很远",
		scene: "车站",
		summary: "离开南京以后，熟悉的语气不必被留在原地。",
		image: {
			src: "/images/city-story-station.webp",
			width: 1672,
			height: 941,
			alt: "清晨的城市车站外，旅客提着行李互相道别，玻璃雨棚下有柔和的天光。",
		},
		paragraphs: [
			"车站的清晨总有人比城市更早醒来。行李轮子压过地面，道别的话说得很短，检票时间却一步步近了。有人去很远的地方，也有人只是隔几天回来。",
			"离开南京以后，南京话可能变成偶尔脱口而出的一个尾音，也可能只在电话那头听见。它不因此更珍贵或更纯粹，只是跟着人的生活换了场景。记忆也不是一只必须原样带走的箱子。",
			"列车开走，城市仍留在日常的说法里。下一次听见熟悉的招呼，不必急着证明属于哪里；先回一句，就已经把路接上。",
		],
		phraseCards: [
			{
				title: "到了讲一声",
				body: "站台上的叮嘱会跟着人走很远。这里的“讲”就是“说”，重点始终是等一条平安抵达的消息。",
			},
		],
		sourceNotes: [cityStoryArchiveNote],
	},
] as const satisfies readonly CityStory[];

export function getCityStory(slug: string): CityStory | undefined {
	return cityStories.find((story) => story.slug === slug);
}

type CityStorySlug = (typeof cityStories)[number]["slug"];

export type CityLocation = {
	id: string;
	label: string;
	position: { x: number; y: number };
	storySlug: CityStorySlug;
};

const cityLocationMetadata = [
	{ id: "bus-stop", position: { x: 10, y: 18 }, storySlug: "jigongjiao" },
	{ id: "lane", position: { x: 30, y: 18 }, storySlug: "lane" },
	{ id: "shop", position: { x: 50, y: 18 }, storySlug: "shop" },
	{ id: "market", position: { x: 70, y: 18 }, storySlug: "market" },
	{ id: "breakfast", position: { x: 90, y: 18 }, storySlug: "breakfast" },
	{ id: "kitchen", position: { x: 10, y: 50 }, storySlug: "kitchen" },
	{ id: "downstairs", position: { x: 30, y: 50 }, storySlug: "downstairs" },
	{ id: "school-gate", position: { x: 50, y: 50 }, storySlug: "school-gate" },
	{ id: "playground", position: { x: 70, y: 50 }, storySlug: "playground" },
	{ id: "new-estate", position: { x: 90, y: 50 }, storySlug: "new-estate" },
	{ id: "phone", position: { x: 10, y: 82 }, storySlug: "phone-screen" },
	{ id: "stage", position: { x: 30, y: 82 }, storySlug: "stage" },
	{ id: "desk", position: { x: 50, y: 82 }, storySlug: "desk" },
	{
		id: "festival-street",
		position: { x: 70, y: 82 },
		storySlug: "festival-street",
	},
	{ id: "station", position: { x: 90, y: 82 }, storySlug: "station" },
] as const satisfies readonly {
	id: string;
	position: { x: number; y: number };
	storySlug: CityStorySlug;
}[];

export const cityLocations: readonly CityLocation[] = cityLocationMetadata.map((location) => {
	const story = getCityStory(location.storySlug);
	if (!story) throw new Error(`Missing city story for map location: ${location.storySlug}`);
	return { ...location, label: story.scene };
});
