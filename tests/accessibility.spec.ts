import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

const representativePages = [
	["首页", "/"],
	["城市故事", "/stories/jigongjiao"],
	["专题", "/articles/what-is-nanjinghua"],
	["最长外文题名档案", "/archive/NJH000010"],
	["长中文题名档案", "/archive/NJH000013"],
	["检索", "/browse?q=白局"],
	["制度", "/policies/accessibility"],
	["线索提交", "/contribute"],
] as const;

function violationSummary(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
	return violations.map((violation) => ({
		id: violation.id,
		impact: violation.impact,
		help: violation.help,
		targets: violation.nodes.map((node) => node.target.join(" ")),
	}));
}

async function openStablePage(page: Page, path: string) {
	if (path.startsWith("/contribute")) {
		await page.addInitScript(() => {
			window.turnstile = {
				render: (container, options) => {
					container.innerHTML = '<label><input type="checkbox">完成人机验证（测试替身）</label>';
					const checkbox = container.querySelector("input");
					if (!checkbox) return "accessibility-test-widget";
					checkbox.addEventListener("change", () => {
						const callback = options.callback;
						if (checkbox.checked && typeof callback === "function") {
							callback("accessibility-test-token");
						}
					});
					return "accessibility-test-widget";
				},
				remove: () => undefined,
				reset: () => undefined,
			};
		});
	}
	await page.goto(path);
	if (path.startsWith("/contribute")) {
		await expect(page.locator(".contribute-form fieldset")).toBeEnabled();
	}
}

async function tabTo(page: Page, target: Locator, settleFrames = 0) {
	await page.keyboard.press("Tab");
	if (settleFrames > 0) {
		await page.evaluate(
			(frames) =>
				new Promise<void>((resolve) => {
					const waitForFrame = (remaining: number) => {
						if (remaining === 0) resolve();
						else window.requestAnimationFrame(() => waitForFrame(remaining - 1));
					};
					waitForFrame(frames);
				}),
			settleFrames,
		);
	}
	await expect(target).toBeFocused();
	await expect(target).toHaveCSS("outline-style", "solid");
	await expect(target).toHaveCSS("outline-width", "2px");
}

async function resetTabOrderAfterNavigation(page: Page) {
	await page.locator("body").evaluate((body) => {
		const previousTabIndex = body.getAttribute("tabindex");
		body.setAttribute("tabindex", "-1");
		body.focus();
		if (previousTabIndex === null) body.removeAttribute("tabindex");
		else body.setAttribute("tabindex", previousTabIndex);
	});
	await expect(page.locator("body")).toBeFocused();
}

for (const [label, path] of representativePages) {
	test(`${label}达到非音频 WCAG 2.2 AA 自动检查基线`, async ({ page }) => {
		await openStablePage(page, path);

		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
			.analyze();

		expect(
			results.violations,
			JSON.stringify(violationSummary(results.violations), null, 2),
		).toEqual([]);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow, `${path} 出现 ${overflow}px 横向溢出`).toBeLessThanOrEqual(1);
	});
}

test("键盘用户可以从首页进入旧资料柜并提交查询", async ({ page }) => {
	await page.goto("/");

	await tabTo(page, page.locator(".city-home__header").getByRole("link", { name: "南京话首页" }));
	await expect
		.poll(() =>
			page.locator(":focus").evaluate((element) => getComputedStyle(element).outlineStyle),
		)
		.not.toBe("none");

	const homeNavigation = page.getByRole("navigation", { name: "首页导航" });
	await tabTo(page, homeNavigation.getByRole("link", { name: "逛一逛" }));
	await tabTo(page, homeNavigation.getByRole("link", { name: "翻翻看" }));
	const browseLink = homeNavigation.getByRole("link", { name: "旧资料柜" });
	await tabTo(page, browseLink);
	await browseLink.press("Enter");
	await expect(page).toHaveURL(/\/browse\/?$/);

	await resetTabOrderAfterNavigation(page);
	await tabTo(page, page.locator(".archive-header__brand"));
	await tabTo(page, page.locator(".archive-header__browse"));
	await tabTo(page, page.locator(".archive-header__back"));
	const query = page.getByLabel("搜索题名、人物、词语、正文或普通话拼音");
	await tabTo(page, query);
	await page.keyboard.type("白局");

	await tabTo(page, page.getByLabel("内容类型"));
	await tabTo(page, page.getByLabel("档案证据身份"));
	await tabTo(page, page.getByLabel("档案时间"));
	await tabTo(page, page.getByLabel("档案地点"));
	await tabTo(page, page.getByLabel("文化形式"));
	const submitSearch = page.getByRole("button", { name: "查看结果" });
	await tabTo(page, submitSearch);
	await submitSearch.press("Enter");

	await expect(page).toHaveURL(/\/browse\?q=%E7%99%BD%E5%B1%80$/);
	await expect(page.getByRole("heading", { name: /南京白局/ }).first()).toBeVisible();
});

test("键盘用户可以填写非音频线索并确认数据规则", async ({ page }) => {
	await openStablePage(page, "/contribute");

	await tabTo(page, page.locator(".archive-header__brand"));
	await tabTo(page, page.locator(".archive-header__browse"));
	await tabTo(page, page.locator(".archive-header__back"));

	const skipToForm = page.getByRole("link", { name: "跳到线索表单" });
	await tabTo(page, skipToForm);
	await skipToForm.press("Enter");
	await expect(page).toHaveURL(/\/contribute#submission-type$/);

	const type = page.getByLabel("线索类型");
	await expect(type).toBeFocused();
	await expect(type).toHaveCSS("outline-style", "solid");
	await expect(type).toHaveCSS("outline-width", "2px");
	await page.keyboard.press("ArrowDown");
	await expect(type).toHaveValue("词语");

	const description = page.getByLabel("说明");
	await tabTo(page, description, 2);
	await page.keyboard.type("这是一条只用于键盘流程验收的南京话词语线索说明。");
	await tabTo(page, page.getByLabel("材料链接（可选）"));
	await tabTo(page, page.getByLabel("关联档案编号（可选）"));
	await tabTo(page, page.getByLabel("联系类型（可选）"));
	await tabTo(page, page.getByLabel("联系方式（可选）"));

	const consent = page.getByLabel(/我已了解上述信息用途/);
	await tabTo(page, consent);
	await page.keyboard.press("Space");
	await expect(consent).toBeChecked();

	const verification = page.getByLabel("完成人机验证（测试替身）");
	await tabTo(page, verification);
	await page.keyboard.press("Space");
	await expect(verification).toBeChecked();

	const submit = page.getByRole("button", { name: "提交线索" });
	await tabTo(page, submit);
	await submit.press("Enter");
	await expect(page.getByText(/提交不代表必然采纳/)).toBeVisible();
	await expect(page.getByText(/编号：SUB-\d{8}-[A-F0-9]{10}/)).toBeVisible();
});

test("直接打开线索表单 fragment 会在控件启用后聚焦线索类型", async ({ page }) => {
	await openStablePage(page, "/contribute#submission-type");

	await expect(page.getByLabel("线索类型")).toBeFocused();
});

test("城市地图、故事总览和旧资料柜都有等价文本入口", async ({ page }) => {
	await page.goto("/");

	await expect(
		page.getByRole("img", {
			name: "一张受南京日常生活启发的想象城市插画，包含公交站、巷口、小店、戏台、菜场与车站等地点。",
		}),
	).toBeVisible();
	await expect(
		page.getByRole("list", { name: "城市地点", exact: true }).getByRole("listitem"),
	).toHaveCount(15);
	await expect(page.getByRole("link", { name: "去公交站看看" })).toBeVisible();
	await expect(page.getByText("巷口，故事正在散步中", { exact: true })).toHaveCount(1);

	const storyOverview = page.getByRole("list", { name: "城市故事总览" });
	await expect(
		storyOverview.getByRole("link", { name: /早高峰，南京人都在挤公交/ }),
	).toHaveAttribute("href", "/stories/jigongjiao");
	await expect(page.getByRole("link", { name: "去旧资料柜看看" })).toHaveAttribute(
		"href",
		"/browse",
	);

	await page.goto("/archive/NJH000008");
	await expect(page.getByText(/一部英文官话语法原著/)).toBeVisible();
	await expect(page.getByRole("region", { name: "档案说明" })).toContainText("全书影印与 OCR");
	await expect(page.getByRole("region", { name: "核查入口" })).toContainText(
		"Internet Archive 全文影印与 OCR",
	);
});

test.describe("减少动态", () => {
	test("城市首页在减少动态偏好下压低地点与总览动效", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");

		await expect
			.poll(() =>
				page
					.getByRole("link", { name: "去公交站看看" })
					.evaluate((element) => getComputedStyle(element).animationName),
			)
			.toBe("none");
		await expect
			.poll(() =>
				page
					.locator(".city-overview__list svg")
					.evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration)),
			)
			.toBeLessThanOrEqual(0.01);
	});

	test("城市故事在减少动态偏好下保持静态阅读", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/stories/jigongjiao");

		await expect
			.poll(() =>
				page
					.locator(".city-story__music")
					.evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration)),
			)
			.toBeLessThanOrEqual(0.01);
	});
});
