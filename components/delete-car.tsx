"use client";
import { useRouter } from "next/navigation";

export default function DeleteCar({ carId }: { carId: string }) {
  const router = useRouter();
  async function del() {
    if (!confirm("Apagar este carro da garagem? Esta ação é definitiva."))
      return;
    await fetch(`/api/cars/${carId}`, { method: "DELETE" });
    router.push("/garagem");
    router.refresh();
  }
  return (
    <button onClick={del} className="btn-line btn-xs text-red-800">
      Apagar carro
    </button>
  );
}
