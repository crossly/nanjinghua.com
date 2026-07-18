import assert from "node:assert/strict";
import test from "node:test";

import { getPolicyDocument, policyDocuments } from "../src/content/policies.ts";

function policyText(slug: string): string {
	const document = getPolicyDocument(slug);
	assert.ok(document, `缺少制度页面：${slug}`);
	return [
		document.title,
		document.summary,
		...document.sections.flatMap((section) => [
			section.title,
			...section.paragraphs,
			...(section.points ?? []),
		]),
	].join("\n");
}

test("非语音制度页面具有稳定且唯一的公开路径", () => {
	assert.equal(policyDocuments.length, 8);
	assert.equal(new Set(policyDocuments.map((document) => document.slug)).size, 8);
	assert.ok(policyDocuments.every((document) => /^[-a-z]+$/.test(document.slug)));
	assert.ok(!policyDocuments.some((document) => document.slug.includes("recording")));
});

test("制度文案声明独立性、分层许可和真实数据保留行为", () => {
	assert.match(policyText("about"), /不代表南京市政府、任何博物馆、研究院、高校或其他学术机构/);

	const rights = policyText("rights-and-licensing");
	assert.match(rights, /档案元数据以 CC0 1\.0 Universal/);
	assert.match(rights, /原创专题文章文字以 CC BY 4\.0/);
	assert.match(rights, /第三方媒体逐项标注/);

	const privacy = policyText("privacy");
	assert.match(privacy, /联系方式保存在单独的受限表/);
	assert.match(privacy, /满 90 天删除联系方式/);
	assert.match(privacy, /连续 180 天没有更新/);
	assert.match(privacy, /提醒后 7 天宽限期/);
	assert.match(privacy, /权利请求、隐私或安全请求属于优先线索/);
});

test("透明度制度禁止资金或合作方购买编辑结论", () => {
	const transparency = policyText("transparency");
	assert.match(transparency, /赞助方和合作方不得修改历史结论、删除争议、隐藏不利证据/);
	assert.match(transparency, /购买审核背书/);
	assert.match(transparency, /AI 输出不作为来源/);
});
