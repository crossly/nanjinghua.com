import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ArchiveHeader } from "../components/archive-header";

declare global {
	interface Window {
		turnstile?: {
			render: (
				container: HTMLElement,
				options: Record<string, string | ((value?: string) => void)>,
			) => string;
			remove: (widgetId: string) => void;
			reset: (widgetId?: string) => void;
		};
	}
}

type FormPhase = "idle" | "submitting" | "success" | "error";
const prefillableTypes = new Set(["纠错", "权利请求", "隐私或安全请求"]);

export const Route = createFileRoute("/contribute")({
	validateSearch: (search: Record<string, unknown>) => ({
		type:
			typeof search.type === "string" && prefillableTypes.has(search.type)
				? search.type
				: undefined,
		archiveId:
			typeof search.archiveId === "string" && /^NJH\d{6}$/.test(search.archiveId)
				? search.archiveId
				: undefined,
	}),
	head: () => ({
		meta: [
			{ title: "提供线索｜南京话" },
			{
				name: "description",
				content: "向南京话公共数字档案提供词语、出处、纠错、权利请求或录音意愿。",
			},
		],
	}),
	component: ContributePage,
});

function ContributePage() {
	const search = Route.useSearch();
	const formRef = useRef<HTMLFormElement>(null);
	const submissionTypeRef = useRef<HTMLSelectElement>(null);
	const turnstileContainerRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | undefined>(undefined);
	const [siteKey, setSiteKey] = useState<string>();
	const [clientReady, setClientReady] = useState(false);
	const [token, setToken] = useState("");
	const [phase, setPhase] = useState<FormPhase>("idle");
	const [message, setMessage] = useState("");
	const [referenceId, setReferenceId] = useState("");
	const [submissionType, setSubmissionType] = useState(search.type ?? "");
	const rightsRequest = submissionType === "权利请求" || submissionType === "隐私或安全请求";

	useEffect(() => {
		fetch("/api/submissions")
			.then(
				(response) => response.json() as Promise<{ available: boolean; siteKey: string | null }>,
			)
			.then((config) => {
				if (config.available && config.siteKey) setSiteKey(config.siteKey);
				else setMessage("提交服务正在配置中，请稍后再试。");
			})
			.catch(() => setMessage("提交服务暂时不可用，请稍后再试。"));
	}, []);

	useEffect(() => {
		if (!siteKey) return;
		const frame = window.requestAnimationFrame(() => setClientReady(true));
		return () => window.cancelAnimationFrame(frame);
	}, [siteKey]);

	useEffect(() => {
		if (!siteKey || !turnstileContainerRef.current) return;
		let cancelled = false;

		const renderWidget = () => {
			if (cancelled || !window.turnstile || !turnstileContainerRef.current) return;
			widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
				sitekey: siteKey,
				action: "public_submission",
				language: "zh-CN",
				theme: "light",
				callback: (value = "") => setToken(value),
				"expired-callback": () => setToken(""),
				"error-callback": () => setMessage("人机验证加载失败，请刷新后重试。"),
			});
		};

		const existingScript = document.querySelector<HTMLScriptElement>(
			"script[data-turnstile-script]",
		);
		if (window.turnstile) renderWidget();
		else if (existingScript) existingScript.addEventListener("load", renderWidget, { once: true });
		else {
			const script = document.createElement("script");
			script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
			script.async = true;
			script.defer = true;
			script.dataset.turnstileScript = "true";
			script.addEventListener("load", renderWidget, { once: true });
			document.head.appendChild(script);
		}

		return () => {
			cancelled = true;
			if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
		};
	}, [siteKey]);

	async function submitForm(form: HTMLFormElement) {
		setPhase("submitting");
		setMessage("");
		const formData = new FormData(form);
		const localTest = ["127.0.0.1", "localhost"].includes(window.location.hostname);

		try {
			const response = await fetch("/api/submissions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: formData.get("type"),
					description: formData.get("description"),
					sourceUrl: formData.get("sourceUrl"),
					archiveId: formData.get("archiveId"),
					contactMethod: formData.get("contactMethod") || undefined,
					contactValue: formData.get("contactValue") || undefined,
					policyAccepted: formData.get("policyAccepted") === "on",
					turnstileToken: localTest ? "test-pass-token" : token,
				}),
			});
			const result = (await response.json()) as {
				referenceId?: string;
				message?: string;
				error?: { message?: string; details?: Record<string, string[] | undefined> };
			};

			if (response.ok && result.referenceId) {
				setPhase("success");
				setReferenceId(result.referenceId);
				setMessage(result.message ?? "线索已收到。");
				formRef.current?.reset();
				setSubmissionType("");
				return;
			}

			const fieldMessage = Object.values(result.error?.details ?? {})
				.flatMap((messages) => messages ?? [])
				.join("；");
			setPhase("error");
			setMessage(fieldMessage || result.error?.message || "提交失败，请稍后重试。");
		} catch {
			setPhase("error");
			setMessage("提交未完成，请检查网络后重试；表单内容仍保留在本页。");
		} finally {
			setToken("");
			window.turnstile?.reset(widgetIdRef.current);
		}
	}

	return (
		<main className="interior-page">
			<ArchiveHeader />
			<section className="contribute" aria-labelledby="contribute-title">
				<button
					type="button"
					className="contribute__skip"
					onClick={() => {
						window.requestAnimationFrame(() => submissionTypeRef.current?.focus());
					}}
				>
					跳到线索表单
				</button>
				<header className="contribute__lead">
					<p className="section-label">公众参与</p>
					<h1 id="contribute-title">提供一条线索</h1>
					<p>词语、材料出处、纠错和录音意愿会先成为待审核材料；权利、隐私与安全请求优先处理。</p>
				</header>

				<section className="contribute__policy" aria-labelledby="submission-policy-title">
					<h2 id="submission-policy-title">信息用途与保留</h2>
					<dl>
						<div>
							<dt>公开范围</dt>
							<dd>提交内容不会直接公开，也不保证采纳或逐条回复。</dd>
						</div>
						<div>
							<dt>联系方式</dt>
							<dd>与线索正文分开保存；线索采纳或关闭 90 天后删除。</dd>
						</div>
						<div>
							<dt>处理周期</dt>
							<dd>180 天无处理会触发提醒；普通线索在宽限期后按规则关闭。</dd>
						</div>
						<div>
							<dt>材料接收</dt>
							<dd>表单不接收文件；确认来源与授权后，编辑再联系接收原件。</dd>
						</div>
					</dl>
					<a className="contribute__recording-kit" href="/recording-kit">
						<span>查看真人语音采集包</span>
						<ArrowRight aria-hidden="true" strokeWidth={1.5} />
					</a>
				</section>

				<form
					className="contribute-form"
					ref={formRef}
					onSubmit={(event) => {
						event.preventDefault();
						void submitForm(event.currentTarget);
					}}
				>
					<fieldset
						className="contribute-form__fields"
						disabled={!clientReady || phase === "submitting"}
					>
						<legend className="visually-hidden">线索内容</legend>
						<label>
							<span>线索类型</span>
							<select
								id="submission-type"
								ref={submissionTypeRef}
								name="type"
								required
								value={submissionType}
								onChange={(event) => setSubmissionType(event.currentTarget.value)}
								onKeyDown={(event) => {
									if (event.key === "ArrowDown" && !submissionType) {
										event.preventDefault();
										setSubmissionType("词语");
									}
								}}
							>
								<option value="" disabled>
									选择类型
								</option>
								<option>词语</option>
								<option>材料出处</option>
								<option>纠错</option>
								<option>权利请求</option>
								<option>隐私或安全请求</option>
								<option>录音意愿</option>
							</select>
						</label>

						<label className="contribute-form__wide">
							<span>说明</span>
							<textarea name="description" required minLength={20} maxLength={4000} rows={7} />
						</label>

						<label>
							<span>材料链接（可选）</span>
							<input name="sourceUrl" type="url" inputMode="url" />
						</label>

						<label>
							<span>{rightsRequest ? "关联档案编号（必填）" : "关联档案编号（可选）"}</span>
							<input
								name="archiveId"
								pattern="NJH[0-9]{6}"
								placeholder="NJH000001"
								defaultValue={search.archiveId ?? ""}
								required={rightsRequest}
							/>
						</label>

						<label>
							<span>联系类型（可选）</span>
							<select name="contactMethod" defaultValue="">
								<option value="">不留联系方式</option>
								<option>电子邮箱</option>
								<option>手机</option>
								<option>微信</option>
							</select>
						</label>

						<label>
							<span>联系方式（可选）</span>
							<input name="contactValue" autoComplete="off" maxLength={320} />
						</label>

						<label className="contribute-form__consent contribute-form__wide">
							<input name="policyAccepted" type="checkbox" required />
							<span>我已了解上述信息用途、处理规则和保留周期。</span>
						</label>

						<div className="contribute-form__verification contribute-form__wide">
							<div ref={turnstileContainerRef} />
						</div>

						<div className="contribute-form__submit contribute-form__wide">
							<button
								type="button"
								disabled={!siteKey || !clientReady || phase === "submitting"}
								onClick={() => {
									if (formRef.current) void submitForm(formRef.current);
								}}
							>
								<Send aria-hidden="true" strokeWidth={1.5} />
								<span>{phase === "submitting" ? "正在提交" : "提交线索"}</span>
							</button>
							<p className={`form-message form-message--${phase}`} aria-live="polite">
								{message}
								{referenceId ? ` 编号：${referenceId}` : ""}
							</p>
						</div>
					</fieldset>
				</form>
			</section>
		</main>
	);
}
