import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({ children }: { children: string }) {
	return (
		<div className="prose">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					a: ({ children: linkChildren, href }) => <a href={href}>{linkChildren}</a>,
					table: ({ children: tableChildren }) => (
						// biome-ignore lint/a11y/noNoninteractiveTabindex: The scrollable table region must be keyboard reachable.
						<section className="prose__table-scroll" aria-label="数据表格" tabIndex={0}>
							<table>{tableChildren}</table>
						</section>
					),
				}}
			>
				{children}
			</ReactMarkdown>
		</div>
	);
}
