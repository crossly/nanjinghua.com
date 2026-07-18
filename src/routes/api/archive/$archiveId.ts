import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";

import { getPublicArchiveEntry } from "../../../content/registry";
import { toArchiveExport } from "../../../content/structured-data";

export const Route = createFileRoute("/api/archive/$archiveId")({
	server: {
		handlers: {
			GET: ({ params }) => {
				const entry = getPublicArchiveEntry(params.archiveId);

				if (!entry) {
					return Response.json({ error: "未找到档案条目" }, { status: 404 });
				}

				return Response.json(toArchiveExport(entry), {
					headers: {
						"Cache-Control": "no-store",
						"Content-Disposition": `inline; filename="${entry.id}.json"`,
					},
				});
			},
		},
	},
});
