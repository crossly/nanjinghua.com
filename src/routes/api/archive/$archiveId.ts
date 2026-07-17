import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";

import { getArchiveEntry } from "../../../content/registry";
import { toArchiveExport } from "../../../content/structured-data";

export const Route = createFileRoute("/api/archive/$archiveId")({
	server: {
		handlers: {
			GET: ({ params }) => {
				const entry = getArchiveEntry(params.archiveId);

				if (!entry) {
					return Response.json({ error: "未找到档案条目" }, { status: 404 });
				}

				return Response.json(toArchiveExport(entry), {
					headers: {
						"Cache-Control": "public, max-age=300, s-maxage=3600",
						"Content-Disposition": `inline; filename="${entry.id}.json"`,
					},
				});
			},
		},
	},
});
