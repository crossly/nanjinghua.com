export type CityStoryDialogueLine = {
	speaker: string;
	utterance: string;
	meaning: string;
	context: string;
	audio?: {
		src: string;
		type: "audio/mpeg" | "audio/wav";
	};
};

export type CityStoryDialogue = {
	review: "待南京本地使用者复核" | "南京本地使用者已复核";
	lines: readonly CityStoryDialogueLine[];
};

const pendingReview = "待南京本地使用者复核" as const;

const trialAudioBySlug: Record<string, { utterance: string; src: string }> = {
	jigongjiao: {
		utterance: "后头空得很，往里走诶。",
		src: "/audio/nanjinghua-trials/jigongjiao.wav",
	},
	lane: { utterance: "上哪块去啊？", src: "/audio/nanjinghua-trials/lane.wav" },
	shop: { utterance: "老板，这个怎么卖啊？", src: "/audio/nanjinghua-trials/shop.wav" },
	market: { utterance: "便宜一得儿行啊？", src: "/audio/nanjinghua-trials/market.wav" },
	breakfast: { utterance: "阿要辣油啊？", src: "/audio/nanjinghua-trials/breakfast.wav" },
	kitchen: { utterance: "莫搁盐了，够咸了。", src: "/audio/nanjinghua-trials/kitchen.wav" },
	downstairs: { utterance: "今个蛮凉快的。", src: "/audio/nanjinghua-trials/downstairs.wav" },
	"school-gate": {
		utterance: "今个作业多不多啊？",
		src: "/audio/nanjinghua-trials/school-gate.wav",
	},
	playground: {
		utterance: "还差一个，阿有人来？",
		src: "/audio/nanjinghua-trials/playground.wav",
	},
	"new-estate": { utterance: "电梯等一哈。", src: "/audio/nanjinghua-trials/new-estate.wav" },
	"phone-screen": { utterance: "你到哪块了？", src: "/audio/nanjinghua-trials/phone-screen.wav" },
	stage: { utterance: "开场了，快坐得。", src: "/audio/nanjinghua-trials/stage.wav" },
	desk: { utterance: "这本你看到哪块了？", src: "/audio/nanjinghua-trials/desk.wav" },
	"festival-street": {
		utterance: "人多的一塌。",
		src: "/audio/nanjinghua-trials/festival-street.wav",
	},
	station: { utterance: "票证带了啊？", src: "/audio/nanjinghua-trials/station.wav" },
};

const cityStoryDialogues: Record<string, CityStoryDialogue> = {
	jigongjiao: {
		review: pendingReview,
		lines: [
			{
				speaker: "乘客",
				utterance: "后头空得很，往里走诶。",
				meaning: "后面很空，请往里面走。",
				context: "车门口拥挤时提醒乘客往车厢里面移动",
			},
			{
				speaker: "乘客",
				utterance: "莫挤，慢慢来。",
				meaning: "别挤，慢慢来。",
				context: "上下车的人挤在一起时提醒大家",
			},
			{
				speaker: "乘客",
				utterance: "到站喊我一声诶。",
				meaning: "到站时提醒我一下。",
				context: "请同行的人帮忙留意站点",
			},
			{
				speaker: "同行人",
				utterance: "晓得了，你坐得。",
				meaning: "知道了，你坐着吧。",
				context: "回应同行人的提醒",
			},
		],
	},
	lane: {
		review: pendingReview,
		lines: [
			{
				speaker: "邻居",
				utterance: "上哪块去啊？",
				meaning: "去哪里啊？",
				context: "巷口碰见熟人时顺口打招呼",
			},
			{
				speaker: "邻居",
				utterance: "去菜场转一趟。",
				meaning: "去一趟菜场。",
				context: "回应邻居询问去向",
			},
			{
				speaker: "邻居",
				utterance: "吃过啦？",
				meaning: "吃过饭了吗？",
				context: "熟人见面时表达关心",
			},
			{
				speaker: "邻居",
				utterance: "有空来家里头坐坐啊。",
				meaning: "有空来家里坐坐。",
				context: "分别前发出日常邀请",
			},
		],
	},
	shop: {
		review: pendingReview,
		lines: [
			{
				speaker: "顾客",
				utterance: "老板，这个怎么卖啊？",
				meaning: "老板，这个多少钱？",
				context: "在小店询问商品价格",
			},
			{
				speaker: "老板",
				utterance: "两块五。",
				meaning: "两元五角。",
				context: "老板直接回答价格",
			},
			{
				speaker: "顾客",
				utterance: "帮我拿一个。",
				meaning: "请给我拿一个。",
				context: "确认购买柜台后的商品",
			},
			{
				speaker: "老板",
				utterance: "拿好，慢走啊。",
				meaning: "拿好，慢走。",
				context: "结账后把商品递给顾客",
			},
		],
	},
	market: {
		review: pendingReview,
		lines: [
			{
				speaker: "顾客",
				utterance: "这个怎么卖啊？",
				meaning: "这个多少钱？",
				context: "在菜摊前询价",
			},
			{
				speaker: "顾客",
				utterance: "便宜一得儿行啊？",
				meaning: "便宜一点可以吗？",
				context: "买菜时与摊主商量价格",
			},
			{
				speaker: "顾客",
				utterance: "帮我称一斤。",
				meaning: "请给我称一斤。",
				context: "确定分量后请摊主称重",
			},
			{
				speaker: "摊主",
				utterance: "给你搭把小葱。",
				meaning: "再送你一点小葱。",
				context: "摊主装袋时添一点配菜",
			},
		],
	},
	breakfast: {
		review: pendingReview,
		lines: [
			{
				speaker: "客人",
				utterance: "来一两馄饨。",
				meaning: "来一两馄饨。",
				context: "熟客在柜台前直接点单",
			},
			{
				speaker: "摊主",
				utterance: "阿要辣油啊？",
				meaning: "要不要加辣油？",
				context: "摊主确认客人口味",
			},
			{
				speaker: "客人",
				utterance: "少搁一得儿。",
				meaning: "少放一点。",
				context: "客人说明辣油分量",
			},
			{
				speaker: "摊主",
				utterance: "就在这块吃啊？",
				meaning: "就在这里吃吗？",
				context: "摊主确认堂食还是带走",
			},
		],
	},
	kitchen: {
		review: pendingReview,
		lines: [
			{
				speaker: "家人",
				utterance: "饭好了，来吃饭。",
				meaning: "饭做好了，来吃饭。",
				context: "从厨房招呼家人上桌",
			},
			{
				speaker: "家人",
				utterance: "莫搁盐了，够咸了。",
				meaning: "别放盐了，已经够咸了。",
				context: "做菜时提醒家人调整味道",
			},
			{
				speaker: "家人",
				utterance: "把碗端出去。",
				meaning: "把碗端到外面去。",
				context: "开饭前请家人帮忙摆桌",
			},
			{
				speaker: "家人",
				utterance: "我来弄，你去坐得。",
				meaning: "我来做，你去坐着。",
				context: "接手厨房里的事情",
			},
		],
	},
	downstairs: {
		review: pendingReview,
		lines: [
			{
				speaker: "邻居",
				utterance: "下来坐会儿啊。",
				meaning: "下来坐一会儿。",
				context: "在楼下招呼熟人一起聊天",
			},
			{
				speaker: "邻居",
				utterance: "今个蛮凉快的。",
				meaning: "今天挺凉快的。",
				context: "坐下后从天气开始聊天",
			},
			{
				speaker: "邻居",
				utterance: "你家小孩还没回来啊？",
				meaning: "你家孩子还没回来吗？",
				context: "熟邻之间询问家人近况",
			},
			{
				speaker: "邻居",
				utterance: "回头一道走。",
				meaning: "等一会儿一起走。",
				context: "聊天结束前约好同行",
			},
		],
	},
	"school-gate": {
		review: pendingReview,
		lines: [
			{
				speaker: "家长",
				utterance: "今个作业多不多啊？",
				meaning: "今天作业多不多？",
				context: "放学见面后询问孩子",
			},
			{
				speaker: "家长",
				utterance: "书包背好。",
				meaning: "把书包背好。",
				context: "离开校门前提醒孩子整理东西",
			},
			{
				speaker: "家长",
				utterance: "路上慢点骑。",
				meaning: "路上骑慢一点。",
				context: "孩子骑车离开时叮嘱安全",
			},
			{
				speaker: "家长",
				utterance: "到家讲一声。",
				meaning: "到家后说一声。",
				context: "分别前请孩子报平安",
			},
		],
	},
	playground: {
		review: pendingReview,
		lines: [
			{
				speaker: "球友",
				utterance: "还差一个，阿有人来？",
				meaning: "还缺一个人，有没有人来？",
				context: "开球前招呼旁边的人加入",
			},
			{
				speaker: "球友",
				utterance: "把球传过来。",
				meaning: "把球传给我。",
				context: "比赛中向队友要球",
			},
			{
				speaker: "球友",
				utterance: "这球算不算啊？",
				meaning: "这个球算不算？",
				context: "对进球或出界有疑问时确认",
			},
			{
				speaker: "球友",
				utterance: "再来一把。",
				meaning: "再来一局。",
				context: "一局结束后邀请继续",
			},
		],
	},
	"new-estate": {
		review: pendingReview,
		lines: [
			{
				speaker: "邻居",
				utterance: "你家住哪栋啊？",
				meaning: "你住在哪一栋？",
				context: "新邻居第一次碰面时确认住处",
			},
			{
				speaker: "邻居",
				utterance: "电梯等一哈。",
				meaning: "请等一下电梯。",
				context: "看见邻居赶来时请里面的人等候",
			},
			{
				speaker: "邻居",
				utterance: "帮我按一哈八楼。",
				meaning: "请帮我按八楼。",
				context: "进电梯后请邻居帮忙按楼层",
			},
			{
				speaker: "邻居",
				utterance: "有空来家里头坐坐啊。",
				meaning: "有空来家里坐坐。",
				context: "新邻居分别时发出邀请",
			},
		],
	},
	"phone-screen": {
		review: pendingReview,
		lines: [
			{
				speaker: "家人",
				utterance: "喂，听得见啊？",
				meaning: "喂，能听见吗？",
				context: "电话刚接通时确认声音",
			},
			{
				speaker: "家人",
				utterance: "你到哪块了？",
				meaning: "你到哪里了？",
				context: "询问对方回家的位置",
			},
			{
				speaker: "家人",
				utterance: "快到了，莫催。",
				meaning: "快到了，别催。",
				context: "回应家人询问",
			},
			{
				speaker: "家人",
				utterance: "到家给我讲一声。",
				meaning: "到家后告诉我一声。",
				context: "挂电话前叮嘱对方报平安",
			},
		],
	},
	stage: {
		review: pendingReview,
		lines: [
			{
				speaker: "观众",
				utterance: "开场了，快坐得。",
				meaning: "开场了，快坐下。",
				context: "演出开始时招呼同行人入座",
			},
			{
				speaker: "观众",
				utterance: "这段蛮好听的。",
				meaning: "这一段很好听。",
				context: "演出间隙与同行人交流感受",
			},
			{
				speaker: "观众",
				utterance: "后头还有一折。",
				meaning: "后面还有一折戏。",
				context: "提醒准备离席的人演出尚未结束",
			},
			{
				speaker: "观众",
				utterance: "散场一道走啊。",
				meaning: "散场后一起走。",
				context: "演出结束前与熟人约好同行",
			},
		],
	},
	desk: {
		review: pendingReview,
		lines: [
			{
				speaker: "读者",
				utterance: "这本你看到哪块了？",
				meaning: "这本书你看到哪里了？",
				context: "一起查资料时询问阅读进度",
			},
			{
				speaker: "读者",
				utterance: "这句话再对一哈。",
				meaning: "这句话再核对一下。",
				context: "发现记录可能有出入时提出复查",
			},
			{
				speaker: "读者",
				utterance: "莫在书上划。",
				meaning: "不要在书上画线。",
				context: "提醒同伴保护借阅资料",
			},
			{
				speaker: "读者",
				utterance: "用完搁回原处。",
				meaning: "用完放回原来的地方。",
				context: "整理桌面材料时提醒归位",
			},
		],
	},
	"festival-street": {
		review: pendingReview,
		lines: [
			{
				speaker: "同行人",
				utterance: "人多的一塌。",
				meaning: "人特别多。",
				context: "走进灯会街口时感叹拥挤",
			},
			{
				speaker: "同行人",
				utterance: "跟紧点诶，莫走散了。",
				meaning: "你跟紧一点，别走散了。",
				context: "在人群中提醒同行人",
			},
			{
				speaker: "同行人",
				utterance: "前头有灯，去看看。",
				meaning: "前面有灯，去看看。",
				context: "发现灯彩后招呼同伴过去",
			},
			{
				speaker: "同行人",
				utterance: "买一个带回去。",
				meaning: "买一个带回家。",
				context: "在摊位前商量购买纪念物",
			},
		],
	},
	station: {
		review: pendingReview,
		lines: [
			{
				speaker: "送行人",
				utterance: "票证带了啊？",
				meaning: "票和证件带了吗？",
				context: "进站前帮旅客确认随身物品",
			},
			{
				speaker: "送行人",
				utterance: "时间还早，莫急。",
				meaning: "时间还早，别着急。",
				context: "看见旅客赶时间时安慰对方",
			},
			{
				speaker: "送行人",
				utterance: "到了给家里讲一声。",
				meaning: "到了以后告诉家里一声。",
				context: "分别前叮嘱旅客报平安",
			},
			{
				speaker: "送行人",
				utterance: "路上当心点。",
				meaning: "路上小心一点。",
				context: "旅客进站前最后叮嘱",
			},
		],
	},
};

export function getCityStoryDialogue(slug: string): CityStoryDialogue | undefined {
	const dialogue = cityStoryDialogues[slug];
	if (!dialogue) return undefined;
	const trialAudio = trialAudioBySlug[slug];
	if (!trialAudio) return dialogue;

	return {
		...dialogue,
		lines: dialogue.lines.map((line) =>
			line.utterance === trialAudio.utterance
				? { ...line, audio: { src: trialAudio.src, type: "audio/wav" } }
				: line,
		),
	};
}
