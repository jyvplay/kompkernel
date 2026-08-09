import { db } from "@/db";
import { conversions } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(conversions)
      .orderBy(desc(conversions.createdAt))
      .limit(20);
    return Response.json({ ok: true, rows });
  } catch {
    // History is a nice-to-have; degrade gracefully if the table is absent.
    return Response.json({ ok: true, rows: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      source?: unknown;
      output?: unknown;
      preset?: unknown;
      inChars?: unknown;
      outChars?: unknown;
      charDeltaPct?: unknown;
    };

    const source = typeof body.source === "string" ? body.source.slice(0, 20000) : "";
    const output = typeof body.output === "string" ? body.output.slice(0, 20000) : "";
    if (!source || !output) {
      return Response.json({ ok: false, error: "source and output required" }, { status: 400 });
    }

    const [row] = await db
      .insert(conversions)
      .values({
        source,
        output,
        preset: typeof body.preset === "string" ? body.preset.slice(0, 32) : "balanced",
        inChars: typeof body.inChars === "number" ? body.inChars : source.length,
        outChars: typeof body.outChars === "number" ? body.outChars : output.length,
        charDeltaPct: typeof body.charDeltaPct === "number" ? body.charDeltaPct : 0,
      })
      .returning();

    return Response.json({ ok: true, row });
  } catch {
    return Response.json({ ok: false, error: "save failed" }, { status: 500 });
  }
}
