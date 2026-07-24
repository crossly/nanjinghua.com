import assert from "node:assert/strict";
import test from "node:test";
import { getPolicyDocument, policyDocuments } from "../src/content/policies.ts";
import { policyNavigation } from "../src/content/policy-index.ts";

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

test("Footer 制度页面具有稳定且唯一的公开路径", () => {
	assert.equal(policyDocuments.length, 7);
	assert.equal(new Set(policyDocuments.map((document) => document.slug)).size, 7);
	assert.ok(policyDocuments.every((document) => /^[-a-z]+$/.test(document.slug)));
	for (const item of policyNavigation) {
		assert.equal(getPolicyDocument(item.slug)?.navLabel, item.label);
	}
});

test("制度文案与当前故事、音频和数据行为一致", () => {
	assert.match(policyText("about"), /十五个原创城市场景/);
	assert.match(policyText("editorial"), /待南京本地使用者复核/);
	assert.match(policyText("transparency"), /AI 合成/);
	assert.match(policyText("rights-and-licensing"), /原创故事、场景说明和制度文字以 CC BY 4\.0/);
	const privacy = policyText("privacy");
	assert.match(privacy, /localStorage/);
	assert.match(privacy, /表单只接受文字和网址，不接受文件上传/);
	assert.match(privacy, /90 天后删除/);
	assert.doesNotMatch(privacy, /站内搜索历史/);
	assert.doesNotMatch(privacy, /旧档案|档案编号/);
});
