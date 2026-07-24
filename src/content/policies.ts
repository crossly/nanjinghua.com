import { policyIdentity } from "./policy-index.ts";

export type PolicyLink = {
	label: string;
	href: string;
	description: string;
};

export type PolicySection = {
	title: string;
	paragraphs: string[];
	points?: string[];
	links?: PolicyLink[];
};

export type PolicyDocument = {
	slug: string;
	navLabel: string;
	eyebrow: string;
	title: string;
	summary: string;
	updatedAt: string;
	sections: PolicySection[];
};

export const policyDocuments = [
	{
		...policyIdentity("about"),
		eyebrow: "项目说明",
		title: "关于本站",
		summary: "从南京的日常场景出发，记录一些说话方式、城市生活和仍在变化的地方记忆。",
		updatedAt: "2026-07-24",
		sections: [
			{
				title: "现在的南京话",
				paragraphs: [
					"南京话是一项由个人发起的独立网站。当前内容以十五个原创城市场景为主，从公交站、早点铺、菜场、校门口和车站等日常空间进入南京话的使用语境。本站不代表南京市政府、博物馆、高校或研究机构。",
					"这些故事是叙事创作，不是新闻采访、口述史或真实人物记录。页面中的人物、对话和插画用于呈现场景，不应被当作具体事件或馆藏材料。",
				],
			},
			{
				title: "短句与试音",
				paragraphs: [
					"每个场景整理四句候选口语，并提供普通话意思和使用情境。它们用于帮助读者理解一句话在什么情况下可能出现，不用来评选唯一“正宗”的南京话。",
					"页面目前为每个场景的四句候选口语提供 AI 合成试音。短句与音频都标为待南京本地使用者复核；在完成真实使用者核对前，本站不会把合成效果称为已经验证的地道南京话。",
				],
			},
			{
				title: "谁对内容负责",
				paragraphs: [
					"Ricky 是项目发起人和当前内容责任人，负责收录范围、文字、复核状态、纠错和权利处置。AI 可以辅助制作，但不能替代内容责任。",
				],
				links: [
					{
						label: "查看内容与复核说明",
						href: "/policies/editorial",
						description: "了解故事、候选短句和试音分别经过什么检查。",
					},
				],
			},
		],
	},
	{
		...policyIdentity("editorial"),
		eyebrow: "内容说明",
		title: "内容与复核",
		summary: "把原创场景、语言候选和已完成复核的事实分开说明。",
		updatedAt: "2026-07-24",
		sections: [
			{
				title: "三类内容",
				paragraphs: ["读者需要能够判断页面上的文字承担什么作用。"],
				points: [
					"城市故事：原创叙事，用来呈现日常空间和人物关系，不声称发生过对应的真实事件。",
					"候选短句：依据场景整理的常用表达方向，附普通话意思和使用说明，在本地使用者复核前保留明确提示。",
					"AI 合成试音：帮助试听节奏的实验性音频，不是真人录音，也不证明发音已经准确。",
				],
			},
			{
				title: "怎样标记复核",
				paragraphs: [
					"“待南京本地使用者复核”表示该句尚未完成真实使用者核对。只有实际核对过具体措辞、语境或发音后，才会更新状态，并说明复核覆盖的范围。",
					"一位使用者的判断也不自动代表所有年龄、片区和社群。存在不同说法时，优先写明使用范围和差异，不用一个答案抹平变化。",
				],
			},
			{
				title: "修改与纠错",
				paragraphs: [
					"文字错误、场景不匹配、误导性的方言表达和无障碍问题都可以反馈。版权、隐私或安全请求会优先处理；必要时会先下线相关内容，再完成核对。",
				],
				links: [
					{
						label: "反馈与纠错",
						href: "/contribute",
						description: "提交相关页面、问题说明和可选来源。",
					},
				],
			},
		],
	},
	{
		...policyIdentity("transparency"),
		eyebrow: "责任边界",
		title: "AI 与透明度",
		summary: "公开 AI 在文字、图像、音频和代码中的作用，也公开它不能证明什么。",
		updatedAt: "2026-07-24",
		sections: [
			{
				title: "AI 用在什么地方",
				paragraphs: [
					"AI 可用于结构整理、文字草稿、候选短句、插画制作、合成试音和代码辅助。最终是否公开、怎样标注以及何时修正，由内容责任人决定。",
					"AI 输出不是南京话事实来源。模型能生成一段听起来像方言的声音，不等于它准确复现了南京本地真实发音。当前试音因此始终显示为 AI 合成并等待本地复核。",
				],
			},
			{
				title: "不制造背书",
				paragraphs: [
					"没有公开复核人和复核范围的内容，不应被理解为获得语言学者、文化机构或南京本地社群背书。提供一句建议或一条线索，也不自动成为整页审核人。",
				],
			},
			{
				title: "资金与合作",
				paragraphs: [
					"目前没有机构赞助或合作背书。未来如接受资金、数据或制作支持，会公开提供方、用途、时间和与相关内容的关系。合作方不能购买结论、隐藏争议或指定唯一“正宗”答案。",
				],
			},
		],
	},
	{
		...policyIdentity("rights-and-licensing"),
		eyebrow: "使用说明",
		title: "版权与使用",
		summary: "原创文字、插画、合成音频与外部平台内容适用不同的使用边界。",
		updatedAt: "2026-07-24",
		sections: [
			{
				title: "原创文字",
				paragraphs: [
					"除页面另有说明外，本站原创故事、场景说明和制度文字以 CC BY 4.0 提供。复用时请标注作者或本站、内容标题、原页面链接、许可名称，以及是否作过修改。",
				],
				links: [
					{
						label: "CC BY 4.0",
						href: "https://creativecommons.org/licenses/by/4.0/deed.zh-hans",
						description: "查看正式许可文本与署名要求。",
					},
				],
			},
			{
				title: "图片与音频",
				paragraphs: [
					"站内插画和 AI 合成试音用于当前页面展示。除非具体资源另行标明开放许可，否则不要把文字的 CC BY 4.0 自动套用到图片或音频文件。",
					"音乐平台链接只把读者带到第三方服务；本站不托管对应歌曲、封面或歌词，也不对第三方页面重新许可。",
				],
			},
			{
				title: "提出权利请求",
				paragraphs: [
					"如认为页面使用侵犯版权、署名或其他权利，请提供受影响页面、权利关系和希望处理的范围。本站会按最小必要原则核对，并可在核对期间暂时下线相关内容。",
				],
				links: [
					{
						label: "提交权利请求",
						href: "/contribute?type=权利请求",
						description: "填写受影响页面、权利关系和希望处理的范围。",
					},
				],
			},
		],
	},
	{
		...policyIdentity("privacy"),
		eyebrow: "数据说明",
		title: "隐私说明",
		summary: "浏览无需账户；只为已读状态、站点运行和主动反馈处理必要数据。",
		updatedAt: "2026-07-24",
		sections: [
			{
				title: "浏览与本地状态",
				paragraphs: [
					"浏览公开页面、地图和故事不需要注册账户。网站会在浏览器 localStorage 中保存已经打开过的故事路径，用于显示“已去过”；sessionStorage 只用于从故事返回首页时恢复焦点。这些状态留在当前浏览器，可以通过清除站点数据删除。",
					"播放试音会向本站请求对应 WAV 文件。本站不据此建立个人发音档案，也不访问麦克风、通讯录或精确位置。",
				],
			},
			{
				title: "反馈表单",
				paragraphs: [
					"主动提交反馈时，表单会收集反馈类型、说明、可选页面或来源链接，以及由提交者选择提供的联系方式。表单只接受文字和网址，不接受文件上传。",
					"反馈正文与可选联系方式分开保存在受限数据表中，只用于核对问题、回复提交者、处理纠错或权利请求和防止滥用。联系方式在反馈采纳或关闭 90 天后删除；普通反馈长期未处理时会进入复核和关闭流程。",
				],
			},
			{
				title: "托管与统计",
				paragraphs: [
					"站点使用 Cloudflare 托管、Turnstile 和无 Cookie 的聚合访问统计。本站不接入广告、跨站追踪、会话回放或表单事件分析。Cloudflare 仍会按照其政策处理提供网络、安全和统计服务所需的数据。",
				],
				links: [
					{
						label: "Cloudflare 隐私政策",
						href: "https://www.cloudflare.com/privacypolicy/",
						description: "了解托管与安全服务方的数据处理说明。",
					},
				],
			},
		],
	},
	{
		...policyIdentity("corrections-and-rights"),
		eyebrow: "反馈机制",
		title: "纠错与权利",
		summary: "说明怎样反馈短句、事实、版权、隐私和访问问题，以及本站会怎样处理。",
		updatedAt: "2026-07-24",
		sections: [
			{
				title: "怎样提出",
				paragraphs: [
					"请尽量填写受影响页面的网址、具体问题、你建议的修改和可核查来源。涉及南京话短句时，可以补充使用场景、说话者关系、年龄或片区范围；不要用“南京人都这样说”代替具体范围。",
					"版权、隐私、人身安全和无障碍问题会优先核对。请不要提交身份证件、家庭住址或与问题无关的敏感材料。",
				],
				links: [
					{
						label: "打开反馈表单",
						href: "/contribute",
						description: "选择短句、纠错、权利或隐私类型并填写说明。",
					},
				],
			},
			{
				title: "怎样处理",
				paragraphs: [
					"提交成功后会生成参考编号。收到反馈不等于必然采纳；内容负责人会核对来源、影响范围和最小必要处理方式。反馈内容不会自动发布，联系方式也不会出现在公开页面。",
					"普通文字错误可以直接修订；存在争议的短句会保留待复核状态或补充范围。权利、隐私或安全风险需要时会先暂停展示，再决定修改或删除。",
				],
			},
		],
	},
	{
		...policyIdentity("accessibility"),
		eyebrow: "访问说明",
		title: "无障碍说明",
		summary: "以 WCAG 2.2 AA 为持续目标，公开当前覆盖范围和仍需人工验证的边界。",
		updatedAt: "2026-07-24",
		sections: [
			{
				title: "当前做法",
				paragraphs: [
					"首页地图同时提供文字地点清单，故事也可从编号索引进入。页面使用语义化标题、地标、可见键盘焦点和明确的按钮名称，并在桌面与移动视口检查阅读顺序和横向溢出。",
					"每条试音旁都显示对应短句、普通话意思和使用情境；没有试音的按钮会被禁用并给出说明。网站不会把声音作为理解内容的唯一途径。",
				],
			},
			{
				title: "验证范围",
				paragraphs: [
					"2026 年 7 月 24 日，首页、城市故事、制度页和反馈页的代表路径在桌面与移动 Chromium 中运行自动化无障碍检查，并覆盖键盘导航、焦点恢复和减少动态偏好。",
					"自动检查不等于独立认证，也不能替代屏幕阅读器、放大、听觉差异和真实用户测试。短音频播放器及第三方 Turnstile 仍需要持续人工复核。",
				],
			},
			{
				title: "反馈访问障碍",
				paragraphs: [
					"请说明页面网址、遇到的障碍、浏览器或辅助技术，以及希望完成的任务。表单不要求注册，联系方式可以不填。",
				],
				links: [
					{
						label: "报告访问障碍",
						href: "/contribute?type=纠错",
						description: "在说明中写明“无障碍反馈”和受影响页面。",
					},
				],
			},
		],
	},
] as const satisfies readonly PolicyDocument[];

export function getPolicyDocument(slug: string): PolicyDocument | undefined {
	return policyDocuments.find((document) => document.slug === slug);
}
