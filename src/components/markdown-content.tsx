import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({ children }: { children: string }) {
	return (
		<div className="prose">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					a: ({ children: linkChildren, href }) => <a href={href}>{linkChildren}</a>,
				}}
			>
				{children}
			</ReactMarkdown>
		</div>
	);
}
