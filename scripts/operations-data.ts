export const d1BusinessTables = [
	"submission_contacts",
	"submission_disposition_events",
	"submission_leads",
	"submission_status_events",
] as const;

export type D1BusinessTable = (typeof d1BusinessTables)[number];
export type D1RowCounts = Record<D1BusinessTable, number>;

export const d1RowCountQuery = d1BusinessTables
	.map(
		(table, index) =>
			`${index === 0 ? "" : "UNION ALL "}SELECT '${table}' AS table_name, COUNT(*) AS row_count FROM ${table}`,
	)
	.join(" ");

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseD1RowCounts(stdout: string): D1RowCounts {
	let decoded: unknown;
	try {
		decoded = JSON.parse(stdout);
	} catch {
		throw new Error("Wrangler D1 输出不是有效 JSON");
	}

	if (!Array.isArray(decoded) || decoded.length !== 1 || !isObject(decoded[0])) {
		throw new Error("Wrangler D1 输出结构无效");
	}
	const execution = decoded[0];
	if (execution.success !== true || !Array.isArray(execution.results)) {
		throw new Error("Wrangler D1 查询未成功返回结果");
	}

	const counts = new Map<D1BusinessTable, number>();
	for (const row of execution.results) {
		if (!isObject(row)) throw new Error("Wrangler D1 行结构无效");
		const table = row.table_name;
		const count = row.row_count;
		if (!d1BusinessTables.includes(table as D1BusinessTable)) {
			throw new Error(`Wrangler D1 返回未知表 ${String(table)}`);
		}
		if (!Number.isInteger(count) || Number(count) < 0) {
			throw new Error(`Wrangler D1 返回无效行数 ${String(count)}`);
		}
		if (counts.has(table as D1BusinessTable)) {
			throw new Error(`Wrangler D1 重复返回表 ${String(table)}`);
		}
		counts.set(table as D1BusinessTable, Number(count));
	}

	for (const table of d1BusinessTables) {
		if (!counts.has(table)) throw new Error(`Wrangler D1 输出缺少表 ${table}`);
	}

	return Object.fromEntries(
		d1BusinessTables.map((table) => [table, counts.get(table)]),
	) as D1RowCounts;
}
