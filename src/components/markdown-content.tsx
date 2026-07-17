import ReactMarkdown from "react-markdown";

export function MarkdownContent({ children }: { children: string }) {
	return (
		<div className="prose">
			<ReactMarkdown
				components={{
					a: ({ children: linkChildren, href }) => <a href={href}>{linkChildren}</a>,
				}}
			>
				{children}
			</ReactMarkdown>
		</div>
	);
}
