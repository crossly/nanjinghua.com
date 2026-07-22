import { setTimeout as sleep } from "node:timers/promises";
import type {
	GlobalpingMeasurement,
	GlobalpingMeasurementClient,
	GlobalpingMeasurementRequest,
} from "./mainland-access.ts";

type GlobalpingApiClientOptions = {
	baseUrl?: string;
	token?: string;
	fetcher?: typeof fetch;
	pollIntervalMs?: number;
	measurementTimeoutMs?: number;
	requestTimeoutMs?: number;
};

export type GlobalpingRawMeasurement = {
	id: string;
	status: string;
	createdAt: string;
	results: unknown[];
};

function apiErrorBody(body: string): string {
	return body.replace(/\s+/g, " ").trim().slice(0, 1_000);
}

export class GlobalpingApiClient implements GlobalpingMeasurementClient {
	readonly #baseUrl: string;
	readonly #token?: string;
	readonly #fetcher: typeof fetch;
	readonly #pollIntervalMs: number;
	readonly #measurementTimeoutMs: number;
	readonly #requestTimeoutMs: number;

	constructor(options: GlobalpingApiClientOptions = {}) {
		this.#baseUrl = (options.baseUrl ?? "https://api.globalping.io/v1").replace(/\/+$/, "");
		this.#token = options.token;
		this.#fetcher = options.fetcher ?? globalThis.fetch;
		this.#pollIntervalMs = options.pollIntervalMs ?? 1_000;
		this.#measurementTimeoutMs = options.measurementTimeoutMs ?? 60_000;
		this.#requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
	}

	async #request(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
		const headers: Record<string, string> = {
			accept: "application/json",
			"user-agent": "nanjinghua.com-mainland-validator/1.0",
		};
		if (body !== undefined) headers["content-type"] = "application/json";
		if (this.#token) headers.authorization = `Bearer ${this.#token}`;
		const response = await this.#fetcher(`${this.#baseUrl}${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(this.#requestTimeoutMs),
		});
		const responseBody = await response.text();
		if (!response.ok) {
			throw new Error(
				`Globalping API ${method} ${path} 返回 ${response.status}: ${apiErrorBody(responseBody)}`,
			);
		}
		try {
			return JSON.parse(responseBody) as unknown;
		} catch (error) {
			throw new Error(`Globalping API ${method} ${path} 返回无效 JSON`, { cause: error });
		}
	}

	async measureRaw(request: unknown): Promise<GlobalpingRawMeasurement> {
		const created = (await this.#request("POST", "/measurements", request)) as {
			id?: unknown;
		};
		if (typeof created.id !== "string" || !created.id) {
			throw new Error("Globalping 创建测量响应缺少 ID");
		}

		const deadline = Date.now() + this.#measurementTimeoutMs;
		while (Date.now() <= deadline) {
			const measurement = (await this.#request(
				"GET",
				`/measurements/${encodeURIComponent(created.id)}`,
			)) as Partial<GlobalpingRawMeasurement>;
			if (measurement.status === "finished") {
				if (
					typeof measurement.id !== "string" ||
					typeof measurement.createdAt !== "string" ||
					!Array.isArray(measurement.results)
				) {
					throw new Error(`Globalping 测量 ${created.id} 的最终响应不完整`);
				}
				return measurement as GlobalpingRawMeasurement;
			}
			if (measurement.status !== "in-progress") {
				throw new Error(
					`Globalping 测量 ${created.id} 返回未知状态：${String(measurement.status)}`,
				);
			}
			if (this.#pollIntervalMs > 0) await sleep(this.#pollIntervalMs);
		}
		throw new Error(`等待 Globalping 测量 ${created.id} 超时`);
	}

	async measure(request: GlobalpingMeasurementRequest): Promise<GlobalpingMeasurement> {
		return (await this.measureRaw(request)) as GlobalpingMeasurement;
	}
}
