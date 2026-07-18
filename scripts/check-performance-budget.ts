import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const kibibyte = 1024;
const budgets = {
	mainJavaScriptGzip: 190 * kibibyte,
	mainJavaScriptRaw: 600 * kibibyte,
	stylesGzip: 10 * kibibyte,
	homeImagesRaw: 1_800 * kibibyte,
} as const;

function requireCondition(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

const assetsDirectory = join(process.cwd(), "dist/client/assets");
const assets = readdirSync(assetsDirectory);
const mainJavaScript = assets.find((file) => /^index-.+\.js$/.test(file));
const stylesheet = assets.find((file) => /^styles-.+\.css$/.test(file));

requireCondition(mainJavaScript, "未找到生产入口 JavaScript，请先运行 pnpm run build");
requireCondition(stylesheet, "未找到生产样式文件，请先运行 pnpm run build");

const mainBytes = readFileSync(join(assetsDirectory, mainJavaScript));
const styleBytes = readFileSync(join(assetsDirectory, stylesheet));
const mainGzip = gzipSync(mainBytes).byteLength;
const stylesGzip = gzipSync(styleBytes).byteLength;
const homeImageBytes = ["nanjing-city-map-1940.jpg", "nanjing-baiju-performance.webp"].reduce(
	(total, file) => total + statSync(join(process.cwd(), "public/images", file)).size,
	0,
);

requireCondition(
	mainBytes.byteLength <= budgets.mainJavaScriptRaw,
	"生产入口 JavaScript 超过 600 KiB",
);
requireCondition(mainGzip <= budgets.mainJavaScriptGzip, "生产入口 JavaScript gzip 超过 190 KiB");
requireCondition(stylesGzip <= budgets.stylesGzip, "生产 CSS gzip 超过 10 KiB");
requireCondition(homeImageBytes <= budgets.homeImagesRaw, "首页图片合计超过 1800 KiB");

const css = styleBytes.toString("utf8");
requireCondition(!/@import\s+url\(https?:/i.test(css), "CSS 不能通过远程 @import 阻塞正文");
requireCondition(!/fonts\.(googleapis|gstatic)\.com/i.test(css), "生产 CSS 不能依赖 Google Fonts");

console.log(
	JSON.stringify(
		{
			mainJavaScript: { raw: mainBytes.byteLength, gzip: mainGzip },
			styles: { gzip: stylesGzip },
			homeImages: { raw: homeImageBytes },
			budgets,
		},
		null,
		2,
	),
);
