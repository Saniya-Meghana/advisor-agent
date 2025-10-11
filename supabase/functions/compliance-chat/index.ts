import { parseJsonSafely, assertIsRecord } from "../_shared/types.ts";

export default async function handler(req: Request): Promise<Response> {
  try {
    const bodyUnknown = await parseJsonSafely(req);
    assertIsRecord(bodyUnknown, "request body");
    const body = bodyUnknown as Record<string, unknown>;

    const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;

    return new Response(JSON.stringify({ ok: true, sessionId }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
}
