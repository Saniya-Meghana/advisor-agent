import { parseJsonSafely, assertIsRecord } from "../_shared/types.ts";

export default async function handler(req: Request): Promise<Response> {
  try {
    const bodyUnknown = await parseJsonSafely(req);
    assertIsRecord(bodyUnknown, "body");
    const body = bodyUnknown as Record<string, unknown>;

    const reportId = typeof body.reportId === "string" ? body.reportId : undefined;
    if (!reportId) {
      return new Response(JSON.stringify({ error: "reportId missing or invalid" }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true, id: reportId }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
}
