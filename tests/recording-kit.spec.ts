import { createHash } from "node:crypto";

import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";

import {
	RECORDING_KIT_ARCHIVE_NAME,
	RECORDING_KIT_DOWNLOAD_PATH,
} from "../src/recording-kit/config.ts";

test("非专业采集者可以取得完整的成年说话者语音采集包", async ({ page, request }) => {
	await page.goto("/contribute");
	await page.getByRole("link", { name: "查看真人语音采集包" }).click();

	await expect(page).toHaveURL(/\/recording-kit\/?$/);
	await expect(page.getByRole("heading", { level: 1, name: "真人语音采集包" })).toBeVisible();

	const prompts = page.getByRole("region", { name: "怎么录" });
	await expect(prompts.getByText("共同词句", { exact: true })).toBeVisible();
	await expect(prompts.getByText("自然讲述", { exact: true })).toBeVisible();
	await expect(prompts.getByText("访谈提示", { exact: true })).toBeVisible();
	await expect(prompts).toContainText("不请说话者表演“最正宗”");

	const consent = page.getByRole("region", { name: "三项授权" });
	await expect(consent.getByText("公开播放", { exact: true })).toBeVisible();
	await expect(consent.getByText("公开下载", { exact: true })).toBeVisible();
	await expect(consent.getByText("研究复用", { exact: true })).toBeVisible();
	await expect(consent).toContainText("分别选择");
	await expect(page.getByText("只采集年满 18 周岁的参与者", { exact: true })).toBeVisible();

	const separation = page.getByRole("region", { name: "信息分开保存" });
	await expect(separation).toContainText("真实身份");
	await expect(separation).toContainText("授权凭证");
	await expect(separation).toContainText("公开元数据");

	const download = page.getByRole("link", { name: "下载完整采集包" });
	await expect(download).toHaveAttribute("href", RECORDING_KIT_DOWNLOAD_PATH);
	const response = await request.get(RECORDING_KIT_DOWNLOAD_PATH);
	expect(response.ok()).toBe(true);
	expect(response.headers()["content-type"]).toContain("application/zip");
	const archiveBytes = await response.body();
	expect(archiveBytes.subarray(0, 2).toString("ascii")).toBe("PK");
	const checksumResponse = await request.get(`${RECORDING_KIT_DOWNLOAD_PATH}.sha256`);
	expect(checksumResponse.ok()).toBe(true);
	const checksumText = await checksumResponse.text();
	const expectedHash = checksumText.split("  ")[0];
	expect(createHash("sha256").update(archiveBytes).digest("hex")).toBe(expectedHash);
	const archive = unzipSync(archiveBytes);
	expect(archive[`nanjinghua-recording-kit/README.md`]).toBeTruthy();
	expect(checksumText).toContain(RECORDING_KIT_ARCHIVE_NAME);

	const widths = await page.evaluate(() => ({
		client: document.documentElement.clientWidth,
		scroll: document.documentElement.scrollWidth,
	}));
	expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});
