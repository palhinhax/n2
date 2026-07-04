import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  DEFAULT_ASSUMPTIONS,
  getImportAssumptions,
  saveImportAssumptions,
  type ImportAssumptions,
} from "@/lib/import-cost";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const assumptions = await getImportAssumptions();
  return NextResponse.json({ assumptions, defaults: DEFAULT_ASSUMPTIONS });
}

const NUMERIC_KEYS: (keyof ImportAssumptions)[] = [
  "transportBase",
  "transportPerKm",
  "travelPerKm",
  "tempPlatesDocs",
  "inspectionB",
  "homologation",
  "registration",
  "plates",
  "adminBuffer",
  "serviceFeePct",
  "serviceFeeMin",
];

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object")
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });

  const partial: Partial<ImportAssumptions> = {};
  for (const k of NUMERIC_KEYS) {
    if (b[k] == null) continue;
    const n = Number(b[k]);
    if (!Number.isFinite(n) || n < 0)
      return NextResponse.json(
        { error: `Valor inválido em ${k}` },
        { status: 400 }
      );
    (partial as any)[k] = n;
  }
  if (typeof b.note === "string") partial.note = b.note.slice(0, 500);
  if (b.fxToEur && typeof b.fxToEur === "object") {
    const fx: Record<string, number> = {};
    for (const [cur, rate] of Object.entries(b.fxToEur)) {
      const n = Number(rate);
      if (/^[A-Z]{3}$/.test(cur) && Number.isFinite(n) && n > 0) fx[cur] = n;
    }
    partial.fxToEur = fx;
  }

  const assumptions = await saveImportAssumptions(partial);
  return NextResponse.json({ ok: true, assumptions });
}
