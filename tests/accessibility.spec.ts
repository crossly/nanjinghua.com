import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const representativePages = [
	["首页", "/"],
	["专题", "/articles/what-is-nanjinghua"],
	["长题名档案", "/archive/NJH000008"],
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

for (const [label, path] of representativePages) {
	test(`${label}达到非音频 WCAG 2.2 AA 自动检查基线`, async ({ page }) => {
		await page.goto(path);

		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
			.analyze();

		expect(
			results.violations,
			JSON.stringify(violationSummary(results.violations), null, 2),
		).toEqual([]);
	});
}

test("键盘用户可以从首页进入检索并提交查询", async ({ page }) => {
	await page.goto("/");

	await page.keyboard.press("Tab");
	await expect(page.locator(":focus")).toHaveAttribute("aria-label", "南京话首页");
	await expect
		.poll(() =>
			page.locator(":focus").evaluate((element) => getComputedStyle(element).outlineStyle),
		)
		.not.toBe("none");

	await page.keyboard.press("Tab");
	await expect(page.locator(":focus")).toHaveAttribute("aria-label", "浏览与检索档案");
	await page.keyboard.press("Enter");
	await expect(page).toHaveURL(/\/browse\/?$/);

	for (let index = 0; index < 4; index += 1) await page.keyboard.press("Tab");
	await expect(page.getByLabel("搜索题名、人物、词语、正文或普通话拼音")).toBeFocused();
	await page.keyboard.type("白局");

	for (let index = 0; index < 6; index += 1) await page.keyboard.press("Tab");
	await expect(page.getByRole("button", { name: "查看结果" })).toBeFocused();
	await page.keyboard.press("Enter");

	await expect(page).toHaveURL(/\/browse\?q=%E7%99%BD%E5%B1%80$/);
	await expect(page.getByRole("heading", { name: /南京白局/ }).first()).toBeVisible();
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

test("代表页面与最长题名不产生横向溢出", async ({ page }) => {
	for (const [, path] of representativePages) {
		await page.goto(path);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow, `${path} 出现 ${overflow}px 横向溢出`).toBeLessThanOrEqual(1);
	}
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
