import { ArrowUpRight } from "lucide-react";

import { policyNavigationGroups } from "../content/policy-index";

export function SiteFooter() {
	return (
		<footer className="site-footer">
			<div className="site-footer__inner">
				<div className="site-footer__identity">
					<a href="/" aria-label="南京话首页">
						南京话
					</a>
					<p>南京话的历史 · 公共数字档案预览</p>
				</div>

				{policyNavigationGroups.map((group) => (
					<nav key={group.label} aria-label={group.label}>
						<p>{group.label}</p>
						<ul>
							{group.items.map((item) => (
								<li key={item.slug}>
									<a href={`/policies/${item.slug}`}>{item.label}</a>
								</li>
							))}
						</ul>
					</nav>
				))}

				<div className="site-footer__actions">
					<a href="/browse">浏览档案</a>
					<a href="/contribute">
						提供线索
						<ArrowUpRight aria-hidden="true" strokeWidth={1.5} />
					</a>
				</div>

				<p className="site-footer__legal">
					档案元数据 CC0 · 原创文章 CC BY 4.0 · 第三方媒体逐项标注权利
				</p>
			</div>
		</footer>
	);
}
