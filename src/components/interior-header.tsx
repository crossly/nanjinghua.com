import { ArrowLeft } from "lucide-react";

type InteriorHeaderProps = {
	backHref?: string;
	backLabel?: string;
};

export function InteriorHeader({ backHref = "/", backLabel = "返回首页" }: InteriorHeaderProps) {
	return (
		<header className="archive-header">
			<a className="archive-header__brand" href="/" aria-label="南京话首页">
				南京话
			</a>
			<nav aria-label="页面导航">
				<a className="archive-header__back" href={backHref}>
					<ArrowLeft aria-hidden="true" strokeWidth={1.5} />
					<span>{backLabel}</span>
				</a>
			</nav>
		</header>
	);
}
