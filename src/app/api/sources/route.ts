import { NextResponse } from "next/server";

import { CATEGORY_SLUGS, isCategorySlug } from "@/lib/categories";
import { deleteSource, getSources, setSourceEnabled, SourceConflictError, upsertSource } from "@/lib/db";
import { isAuthorised } from "@/lib/auth";
import { checkFeedUrl } from "@/lib/feedUrl";

export const dynamic = "force-dynamic";

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** GET /api/sources - every feed with its health record. Read-only, so public. */
export async function GET() {
  return NextResponse.json({ ok: true, sources: getSources(true) });
}

/**
 * POST /api/sources - add or update a feed.
 * Body: { id?, name, home, url, region, defaultCategory, enabled }
 */
export async function POST(request: Request) {
  if (!isAuthorised(request)) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const url = String(body.url ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!url || !name) {
    return NextResponse.json({ error: "Both name and url are required" }, { status: 400 });
  }
  // The collector fetches this URL with the server's own network position, so
  // a feed URL is a privileged target, not just a string. Refuse private and
  // link-local destinations before anything is written.
  const urlCheck = await checkFeedUrl(url);
  if (!urlCheck.ok) {
    return NextResponse.json({ error: urlCheck.reason }, { status: 400 });
  }

  const defaultCategory = String(body.defaultCategory ?? "other");
  if (!isCategorySlug(defaultCategory)) {
    return NextResponse.json({ error: `defaultCategory must be one of: ${CATEGORY_SLUGS.join(", ")}` }, { status: 400 });
  }

  const id =
    String(body.id ?? "").trim() ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);

  try {
    upsertSource({
      id,
      name,
      home: String(body.home ?? url).trim(),
      url,
      region: String(body.region ?? "Global").trim(),
      defaultCategory,
      enabled: body.enabled === undefined ? true : Boolean(body.enabled),
    });
  } catch (caught) {
    if (caught instanceof SourceConflictError) {
      return NextResponse.json({ error: caught.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Could not save the source" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, source: getSources(true).find((s) => s.id === id) }, { status: 201 });
}

/** PATCH /api/sources - enable or disable a feed. Body: { id, enabled } */
export async function PATCH(request: Request) {
  if (!isAuthorised(request)) return unauthorized();

  const body = (await request.json()) as { id?: string; enabled?: boolean };
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  setSourceEnabled(id, Boolean(body.enabled));
  return NextResponse.json({ ok: true, source: getSources(true).find((s) => s.id === id) });
}

/** DELETE /api/sources?id=<id> - remove a custom feed. */
export async function DELETE(request: Request) {
  if (!isAuthorised(request)) return unauthorized();

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id query param is required" }, { status: 400 });

  deleteSource(id);
  return NextResponse.json({ ok: true, removed: id });
}
