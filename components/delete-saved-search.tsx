"use client";
import { useRouter } from "next/navigation";

export default function DeleteSavedSearch({ id }: { id: string }) {
  const router = useRouter();
  async function del() {
    await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={del}
      className="btn-line btn-xs text-red-800"
      aria-label="Apagar pesquisa"
    >
      Apagar
    </button>
  );
}
