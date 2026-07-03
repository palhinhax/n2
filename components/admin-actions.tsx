"use client";
import { useRouter } from "next/navigation";

export default function AdminActions({ carId }: { carId: string }) {
  const router = useRouter();
  async function act(status: string) {
    await fetch(`/api/admin/cars/${carId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      <button className="btn-olive btn-xs" onClick={() => act("APPROVED")}>
        Aprovar ✓
      </button>
      <button
        className="btn-line btn-xs text-red-800"
        onClick={() => act("REJECTED")}
      >
        Rejeitar ✕
      </button>
    </div>
  );
}
