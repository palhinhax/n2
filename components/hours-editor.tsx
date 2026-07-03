"use client";

import { useMemo, useState } from "react";
import { DAYS, parseHours, type WeekHours } from "@/lib/hours";

type Periods = [string, string][];

function emptyWeek(): WeekHours {
  const w: WeekHours = {};
  for (const d of DAYS) w[d.key] = [];
  return w;
}

export default function HoursEditor({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (json: string) => void;
}) {
  const initial = useMemo(() => parseHours(value) ?? emptyWeek(), [value]);
  const [week, setWeek] = useState<WeekHours>(initial);

  function commit(next: WeekHours) {
    setWeek(next);
    onChange(JSON.stringify(next));
  }

  function setDay(key: string, periods: Periods) {
    commit({ ...week, [key]: periods });
  }

  function toggleOpen(key: string, open: boolean) {
    setDay(key, open ? [["09:00", "18:00"]] : []);
  }

  function setPeriod(key: string, idx: number, which: 0 | 1, val: string) {
    const periods = (week[key] ?? []).map((p) => [...p] as [string, string]);
    if (!periods[idx]) periods[idx] = ["", ""];
    periods[idx][which] = val;
    setDay(key, periods);
  }

  function addPeriod(key: string) {
    const periods = [...(week[key] ?? [])];
    periods.push(["13:00", "18:00"]);
    setDay(key, periods.slice(0, 3));
  }

  function removePeriod(key: string, idx: number) {
    const periods = (week[key] ?? []).filter((_, i) => i !== idx);
    setDay(key, periods);
  }

  return (
    <div className="flex flex-col divide-y divide-outline/60 rounded-xl border border-outline">
      {DAYS.map((d) => {
        const periods = week[d.key] ?? [];
        const open = periods.length > 0;
        return (
          <div
            key={d.key}
            className="flex flex-wrap items-center gap-2 px-3 py-2"
          >
            <label className="flex w-28 items-center gap-2 text-[0.9rem] font-semibold text-ink">
              <input
                type="checkbox"
                checked={open}
                onChange={(e) => toggleOpen(d.key, e.target.checked)}
                className="h-4 w-4 accent-clay"
              />
              {d.label}
            </label>

            {!open ? (
              <span className="text-[0.85rem] font-medium text-n2muted2">
                Fechado
              </span>
            ) : (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {periods.map((p, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      type="time"
                      value={p[0]}
                      onChange={(e) => setPeriod(d.key, i, 0, e.target.value)}
                      className="rounded border border-outline bg-white px-1.5 py-1 text-[0.85rem]"
                    />
                    <span className="text-n2muted">–</span>
                    <input
                      type="time"
                      value={p[1]}
                      onChange={(e) => setPeriod(d.key, i, 1, e.target.value)}
                      className="rounded border border-outline bg-white px-1.5 py-1 text-[0.85rem]"
                    />
                    <button
                      type="button"
                      onClick={() => removePeriod(d.key, i)}
                      className="px-1 text-[0.9rem] text-red-700"
                      aria-label="Remover período"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {periods.length < 3 && (
                  <button
                    type="button"
                    onClick={() => addPeriod(d.key)}
                    className="text-[0.8rem] font-semibold text-clay hover:underline"
                  >
                    + período
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
