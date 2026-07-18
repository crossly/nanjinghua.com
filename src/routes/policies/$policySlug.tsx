import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ArchiveHeader } from "../../components/archive-header";
import { getPolicyDocument, policyDocuments } from "../../content/policies";
import { SITE_ORIGIN } from "../../site";

export const Route = createFileRoute("/policies/$policySlug")({
	loader: ({ params }) => {
		const document = getPolicyDocument(params.policySlug);
		if (!document) throw notFound();
		return { document };
	},
	head: ({ loaderData }) => ({
		meta: loaderData
			? [
					{ title: `${loaderData.document.title}｜南京话` },
					{ name: "description", content: loaderData.document.summary },
				]
			: [],
		links: loaderData
			? [
					{
						rel: "canonical",
						href: `${SITE_ORIGIN}/policies/${loaderData.document.slug}`,
					},
				]
			: [],
	}),
	component: PolicyPage,
});

function PolicyPage() {
	const { document } = Route.useLoaderData();

	return (
		<main className="interior-page">
			<ArchiveHeader />
			<article className="policy-page">
				<header className="policy-page__lead">
					<p className="section-label">{document.eyebrow}</p>
					<div>
						<h1>{document.title}</h1>
						<p>{document.summary}</p>
					</div>
					<dl>
						<div>
							<dt>版本</dt>
							<dd>1.0</dd>
						</div>
						<div>
							<dt>最近更新</dt>
							<dd>{document.updatedAt}</dd>
						</div>
					</dl>
				</header>

				<div className="policy-page__layout">
					<nav className="policy-index" aria-label="制度页面">
						<p className="section-label">制度目录</p>
						<ul>
							{policyDocuments.map((candidate) => (
								<li key={candidate.slug}>
									<a
										href={`/policies/${candidate.slug}`}
										aria-current={candidate.slug === document.slug ? "page" : undefined}
									>
										{candidate.navLabel}
									</a>
								</li>
							))}
						</ul>
					</nav>

					<div className="policy-page__content">
						{document.sections.map((section) => (
							<section key={section.title}>
								<h2>{section.title}</h2>
								{section.paragraphs.map((paragraph) => (
									<p key={paragraph}>{paragraph}</p>
								))}
								{section.points ? (
									<ul>
										{section.points.map((point) => (
											<li key={point}>{point}</li>
										))}
									</ul>
								) : null}
								{section.links ? (
									<ul className="policy-links">
										{section.links.map((link) => {
											const external = link.href.startsWith("http");
											return (
												<li key={link.href}>
													<a
														href={link.href}
														target={external ? "_blank" : undefined}
														rel={external ? "noreferrer" : undefined}
													>
														<span>{link.label}</span>
														<ArrowRight aria-hidden="true" strokeWidth={1.5} />
													</a>
													<p>{link.description}</p>
												</li>
											);
										})}
									</ul>
								) : null}
							</section>
						))}
					</div>
				</div>
			</article>
		</main>
	);
}
