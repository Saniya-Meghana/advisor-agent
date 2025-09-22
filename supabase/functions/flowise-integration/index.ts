import { parseJsonSafely, assertIsRecord } from "../_shared/types";

export default async function handler(req: Request): Promise<Response> {
  try {
    const bodyUnknown = await parseJsonSafely(req);
    assertIsRecord(bodyUnknown, "payload");
    const body = bodyUnknown as Record<string, unknown>;

    const flowId = typeof body.flowId === "string" ? body.flowId : undefined;
    if (!flowId) {
      return new Response(JSON.stringify({ error: "flowId required" }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true, flowId }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
}
