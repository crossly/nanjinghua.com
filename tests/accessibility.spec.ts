import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

const representativePages = [
	["首页", "/"],
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
	if (path === "/contribute") {
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
	if (path === "/contribute") {
		await expect(page.locator(".contribute-form fieldset")).toBeEnabled();
	}
}

async function tabTo(page: Page, target: Locator) {
	await page.keyboard.press("Tab");
	await expect(target).toBeFocused();
	await expect(target).toHaveCSS("outline-style", "solid");
	await expect(target).toHaveCSS("outline-width", "2px");
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

test("键盘用户可以从首页进入检索并提交查询", async ({ page }) => {
	await page.goto("/");

	await tabTo(page, page.locator(".site-header__brand"));
	await expect
		.poll(() =>
			page.locator(":focus").evaluate((element) => getComputedStyle(element).outlineStyle),
		)
		.not.toBe("none");

	await tabTo(page, page.locator(".site-header nav").getByRole("link"));
	await page.keyboard.press("Enter");
	await expect(page).toHaveURL(/\/browse\/?$/);

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
	await page.keyboard.press("Enter");

	await expect(page).toHaveURL(/\/browse\?q=%E7%99%BD%E5%B1%80$/);
	await expect(page.getByRole("heading", { name: /南京白局/ }).first()).toBeVisible();
});

test("键盘用户可以填写非音频线索并确认数据规则", async ({ page }) => {
	await openStablePage(page, "/contribute");

	await tabTo(page, page.locator(".archive-header__brand"));
	await tabTo(page, page.locator(".archive-header__browse"));
	await tabTo(page, page.locator(".archive-header__back"));

	const skipToForm = page.getByRole("button", { name: "跳到线索表单" });
	await tabTo(page, skipToForm);
	await page.keyboard.press("Enter");

	const type = page.getByLabel("线索类型");
	await expect(type).toBeFocused();
	await expect(type).toHaveCSS("outline-style", "solid");
	await expect(type).toHaveCSS("outline-width", "2px");
	await page.keyboard.press("ArrowDown");
	await expect(type).toHaveValue("词语");

	const description = page.getByLabel("说明");
	await tabTo(page, description);
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
	await page.keyboard.press("Enter");
	await expect(page.getByText(/提交不代表必然采纳/)).toBeVisible();
	await expect(page.getByText(/编号：SUB-\d{8}-[A-F0-9]{10}/)).toBeVisible();
});

test("地图、历史路径和扫描件都有等价文本入口", async ({ page }) => {
	await page.goto("/");

	await expect(page.getByRole("img", { name: "1940 年《南京市区图》扫描件" })).toBeVisible();
	await expect(
		page.getByRole("link", { name: "在 Wikimedia Commons 查看 1940 年《南京市区图》来源" }),
	).toHaveAttribute("href", /^https:\/\/commons\.wikimedia\.org/);

	const historicalPath = page.getByRole("region", { name: "从材料看见时间" });
	await expect(historicalPath.getByRole("listitem")).toHaveCount(5);
	await expect(historicalPath.getByRole("time")).toHaveCount(5);

	await page.goto("/archive/NJH000008");
	await expect(page.getByText(/一部英文官话语法原著/)).toBeVisible();
	await expect(page.getByRole("region", { name: "档案说明" })).toContainText("全书影印与 OCR");
	await expect(page.getByRole("region", { name: "核查入口" })).toContainText(
		"Internet Archive 全文影印与 OCR",
	);
});

test.describe("减少动态", () => {
	test("首页在减少动态偏好下关闭入场动画和箭头过渡", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");

		await expect
			.poll(() =>
				page.locator(".hero__map").evaluate((element) => getComputedStyle(element).animationName),
			)
			.toBe("none");
		await expect
			.poll(() =>
				page
					.locator(".hero__action svg")
					.evaluate((element) => getComputedStyle(element).transitionDuration),
			)
			.toBe("0s");
	});
});
