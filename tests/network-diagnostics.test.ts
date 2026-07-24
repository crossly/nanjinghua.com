import assert from "node:assert/strict";
import test from "node:test";
import {
	classifyDiagnosticOutcome,
	safeGlobalpingFailureReason,
	safeGlobalpingStatus,
} from "../scripts/network-diagnostics.ts";

test("确定的站点失败优先于并存的测量基础设施错误", () => {
	assert.equal(
		classifyDiagnosticOutcome([
			{ passed: false, infrastructureError: true },
			{ passed: false, infrastructureError: false },
		]),
		"site-failure",
	);
	assert.equal(
		classifyDiagnosticOutcome([{ passed: false, infrastructureError: true }]),
		"infrastructure-error",
	);
	assert.equal(classifyDiagnosticOutcome([{ passed: true, infrastructureError: false }]), "passed");
});

test("Globalping 原始错误只生成受控摘要", () => {
	assert.equal(safeGlobalpingStatus("offline"), "offline");
	assert.equal(safeGlobalpingStatus("203.0.113.50"), "missing");
	assert.equal(
		safeGlobalpingFailureReason("HTTPS", "failed", "Request timeout via 203.0.113.51"),
		"HTTPS 请求超时",
	);
	assert.equal(
		safeGlobalpingFailureReason("HTTPS", "missing", "failed via 203.0.113.52"),
		"HTTPS 状态为 missing",
	);
});
