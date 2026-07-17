import { ArrowLeft } from "lucide-react";

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
			<a className="archive-header__back" href={backHref}>
				<ArrowLeft aria-hidden="true" strokeWidth={1.5} />
				<span>{backLabel}</span>
			</a>
		</header>
	);
}
