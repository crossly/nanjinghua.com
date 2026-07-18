import assert from "node:assert/strict";
import { test } from "node:test";

import { dispositionInputSchema } from "../src/submissions/schema.ts";

const baseDisposition = {
	note: "记录完成核验后的最终处置依据与执行范围。",
};

test("事实修订与证据身份变更不能夹带目录或文件处置", () => {
	assert.equal(
		dispositionInputSchema.safeParse({
			...baseDisposition,
			decisionType: "事实修订",
			publicCatalogAction: "不适用",
			storedCopyAction: "不适用",
			backupAction: "不适用",
		}).success,
		true,
	);
	assert.equal(
		dispositionInputSchema.safeParse({
			...baseDisposition,
			decisionType: "证据身份变更",
			publicCatalogAction: "移除",
			storedCopyAction: "销毁",
			backupAction: "销毁",
		}).success,
		false,
	);
});

test("目录撤回与隐私删除必须逐项记录目录、副本和备份处置", () => {
	assert.equal(
		dispositionInputSchema.safeParse({
			...baseDisposition,
			decisionType: "目录撤回",
			publicCatalogAction: "保留",
			storedCopyAction: "保留",
			backupAction: "未持有",
		}).success,
		true,
	);
	assert.equal(
		dispositionInputSchema.safeParse({
			...baseDisposition,
			decisionType: "隐私删除",
			publicCatalogAction: "保留",
			storedCopyAction: "不适用",
			backupAction: "不适用",
		}).success,
		false,
	);
});
