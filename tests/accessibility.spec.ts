import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const representativePages = [
	["首页", "/"],
	["城市故事", "/stories/breakfast"],
	["制度", "/policies/accessibility"],
	["反馈", "/contribute"],
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
					checkbox?.addEventListener("change", () => {
						if (checkbox.checked && typeof options.callback === "function") {
							options.callback("accessibility-test-token");
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

for (const [label, path] of representativePages) {
	test(`${label}达到 WCAG 2.2 AA 自动检查基线`, async ({ page }) => {
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

test("键盘用户可以从首页进入故事和关于页", async ({ page }) => {
	await page.goto("/");
	const navigation = page.getByRole("navigation", { name: "首页导航" });
	const about = navigation.getByRole("link", { name: "关于" });
	await about.focus();
	await expect(about).toBeFocused();
	await expect(about).toHaveCSS("outline-style", "solid");
	await about.press("Enter");
	await expect(page).toHaveURL(/\/policies\/about$/);
	await expect(page.getByRole("heading", { level: 1, name: "关于本站" })).toBeVisible();
});

test("键盘用户可以填写反馈并确认数据规则", async ({ page }) => {
	await openStablePage(page, "/contribute");
	const skipToForm = page.getByRole("link", { name: "跳到反馈表单" });
	await skipToForm.focus();
	await skipToForm.press("Enter");
	await expect(page.getByLabel("线索类型")).toBeFocused();
	await page.getByLabel("线索类型").selectOption("词语");
	await page.getByLabel("说明").fill("早点铺里的短句建议补充具体说话人关系和使用时间范围。");
	await page.getByLabel(/我已了解上述信息用途/).check();
	await page.getByLabel("完成人机验证（测试替身）").check();
	await page.getByRole("button", { name: "提交反馈" }).click();
	await expect(page.getByText(/提交不代表必然采纳/)).toBeVisible();
});

test("城市地图和故事总览都有十五个等价文字入口", async ({ page }) => {
	await page.goto("/");
	await expect(
		page.getByRole("list", { name: "城市地点", exact: true }).getByRole("link"),
	).toHaveCount(15);
	await expect(page.getByRole("list", { name: "城市故事总览" }).getByRole("link")).toHaveCount(15);
	await expect(page.getByText("旧资料柜", { exact: true })).toHaveCount(0);
});

test.describe("减少动态", () => {
	test("城市首页在减少动态偏好下压低地点动效", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");
		await expect
			.poll(() =>
				page
					.getByRole("link", { name: "去公交站看看" })
					.evaluate((element) => getComputedStyle(element).animationName),
			)
			.toBe("none");
	});
});
