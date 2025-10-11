import { parseJsonSafely, assertIsRecord } from "../_shared/types.ts";

export default async function handler(req: Request): Promise<Response> {
  try {
    let body: Record<string, unknown> | undefined;
    if (req.method !== "GET") {
      const parsed = await parseJsonSafely(req);
      assertIsRecord(parsed, "body");
      body = parsed as Record<string, unknown>;
    }

    const cronSchedule = body && typeof body.cronSchedule === "string" ? body.cronSchedule : undefined;

    return new Response(JSON.stringify({ ok: true, cronSchedule }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
