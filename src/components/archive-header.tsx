import { ArrowLeft, Search } from "lucide-react";

type ArchiveHeaderProps = {
	backHref?: string;
	backLabel?: string;
};

export function ArchiveHeader({ backHref = "/", backLabel = "返回首页" }: ArchiveHeaderProps) {
	return (
		<header className="archive-header">
			<a className="archive-header__brand" href="/" aria-label="南京话首页">
				南京话
			</a>
			<nav aria-label="页面导航">
				<a className="archive-header__browse" href="/browse" aria-label="浏览与检索档案">
					<Search aria-hidden="true" strokeWidth={1.5} />
					<span>浏览档案</span>
				</a>
				<a className="archive-header__back" href={backHref}>
					<ArrowLeft aria-hidden="true" strokeWidth={1.5} />
					<span>{backLabel}</span>
				</a>
			</nav>
		</header>
	);
}
