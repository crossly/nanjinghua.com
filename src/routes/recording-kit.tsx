import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Download, FileCheck2, FolderLock, Headphones, Mic2 } from "lucide-react";

import { ArchiveHeader } from "../components/archive-header";
import { RECORDING_KIT_DOWNLOAD_PATH, RECORDING_KIT_VERSION } from "../recording-kit/config";

export const Route = createFileRoute("/recording-kit")({
	head: () => ({
		meta: [
			{ title: "真人语音采集包｜南京话" },
			{
				name: "description",
				content:
					"供非专业采集者使用的南京话成年说话者语音采集包，包含录音提示、技术说明、分项授权与安全交接流程。",
			},
		],
	}),
	component: RecordingKitPage,
});

const promptGroups = [
	{
		number: "01",
		title: "共同词句",
		text: "每位参与者录同一组日常词句。先让对方自然说，不示范读音，也不评判对错。",
	},
	{
		number: "02",
		title: "自然讲述",
		text: "从买菜、上学、过节或一次出行讲起，连续说两至五分钟，保留停顿与自我修正。",
	},
	{
		number: "03",
		title: "访谈提示",
		text: "追问词语在谁面前、什么场景使用，以及是否随年代变化，不请说话者表演“最正宗”的南京话。",
	},
];

const consentScopes = [
	{
		icon: Headphones,
		title: "公开播放",
		text: "允许网站播放器向公众提供收听。",
	},
	{
		icon: Download,
		title: "公开下载",
		text: "允许访客取得发布版本的音频文件。",
	},
	{
		icon: FileCheck2,
		title: "研究复用",
		text: "允许项目按授权书约定向研究者提供复用。",
	},
];

function RecordingKitPage() {
	return (
		<main className="interior-page">
			<ArchiveHeader backHref="/contribute" backLabel="返回参与说明" />

			<section className="recording-kit-hero" aria-labelledby="recording-kit-title">
				<div>
					<p className="section-label">公众采集工具 · v{RECORDING_KIT_VERSION}</p>
					<h1 id="recording-kit-title">真人语音采集包</h1>
				</div>
				<div className="recording-kit-hero__intro">
					<p>
						用常见手机或录音机，留下可追溯、可撤回且不表演化的南京话记录。先取得分项授权，再开始录音。
					</p>
					<a className="recording-kit-download" href={RECORDING_KIT_DOWNLOAD_PATH} download>
						<Download aria-hidden="true" strokeWidth={1.5} />
						<span>下载完整采集包</span>
					</a>
				</div>
			</section>

			<section className="recording-kit-guardrail" aria-label="参与边界">
				<strong>只采集年满 18 周岁的参与者</strong>
				<span>不追求统计代表性</span>
				<span>不以聊天软件压缩文件代替原件</span>
			</section>

			<section className="recording-kit-section" aria-labelledby="recording-prompts-title">
				<header>
					<p className="section-label">采集顺序</p>
					<h2 id="recording-prompts-title">怎么录</h2>
				</header>
				<ol className="recording-kit-steps">
					{promptGroups.map((group) => (
						<li key={group.number}>
							<span>{group.number}</span>
							<h3>{group.title}</h3>
							<p>{group.text}</p>
						</li>
					))}
				</ol>
			</section>

			<section className="recording-kit-technical" aria-labelledby="technical-title">
				<header>
					<Mic2 aria-hidden="true" strokeWidth={1.25} />
					<div>
						<p className="section-label">现场速查</p>
						<h2 id="technical-title">安静、靠近、保留原件</h2>
					</div>
				</header>
				<dl>
					<div>
						<dt>环境</dt>
						<dd>关窗、关提示音，避开空调出风口和硬墙回声。</dd>
					</div>
					<div>
						<dt>距离</dt>
						<dd>设备距嘴约 15 至 20 厘米，略偏向一侧，先试听 20 秒。</dd>
					</div>
					<div>
						<dt>格式</dt>
						<dd>优先 WAV、48 kHz、24 bit；手机无法设置时保留录音应用导出的原文件。</dd>
					</div>
					<div>
						<dt>命名</dt>
						<dd>参与者代码_日期_序号，例如 NJH-S01_20260717_01.wav。</dd>
					</div>
				</dl>
			</section>

			<section
				className="recording-kit-section recording-kit-consent"
				aria-labelledby="consent-title"
			>
				<header>
					<p className="section-label">录音前完成</p>
					<h2 id="consent-title">三项授权</h2>
					<p>每一项都由参与者分别选择“同意”或“不同意”；拒绝其中一项不影响其他选择。</p>
				</header>
				<ul>
					{consentScopes.map(({ icon: Icon, title, text }) => (
						<li key={title}>
							<Icon aria-hidden="true" strokeWidth={1.25} />
							<h3>{title}</h3>
							<p>{text}</p>
						</li>
					))}
				</ul>
				<p className="recording-kit-consent__withdrawal">
					参与者以后可以凭化名或录音编号提出撤回；项目核对身份后停止相应范围的新传播，并说明已经发生的下载或研究复用能否追回。
				</p>
			</section>

			<section className="recording-kit-separation" aria-labelledby="separation-title">
				<header>
					<FolderLock aria-hidden="true" strokeWidth={1.25} />
					<div>
						<p className="section-label">安全交接</p>
						<h2 id="separation-title">信息分开保存</h2>
					</div>
				</header>
				<div className="recording-kit-separation__columns">
					<div>
						<span>受限 · A</span>
						<h3>真实身份</h3>
						<p>姓名与联系信息只用于核对授权和处理撤回，不进入公开档案。</p>
					</div>
					<div>
						<span>受限 · B</span>
						<h3>授权凭证</h3>
						<p>签署页与录音编号对应，和身份资料分别限制访问。</p>
					</div>
					<div>
						<span>公开候选 · C</span>
						<h3>公开元数据</h3>
						<p>只含化名、出生年代、成长片区、长期居住、家庭语言和普通话使用概况。</p>
					</div>
				</div>
			</section>

			<section className="recording-kit-contents" aria-labelledby="contents-title">
				<div>
					<p className="section-label">包内文件</p>
					<h2 id="contents-title">从准备到交接</h2>
				</div>
				<ul>
					<li>共同词句、自然讲述与访谈提示</li>
					<li>常见设备录音技术指南</li>
					<li>说话者背景模板与分项授权书</li>
					<li>安全交接清单与无真人素材演练</li>
					<li>原始文件和派生文件校验清单</li>
				</ul>
				<a href="/contribute">
					<span>先提交录音意愿</span>
					<ArrowRight aria-hidden="true" strokeWidth={1.5} />
				</a>
			</section>
		</main>
	);
}
