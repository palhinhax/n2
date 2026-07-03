import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import AccountForm from "@/components/account-form";
import PasswordForm from "@/components/password-form";

export const dynamic = "force-dynamic";

export default async function Conta() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/auth/login");

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(820px,94%)] py-7">
        <span className="font-head text-[0.82rem] font-bold uppercase tracking-[0.14em] text-olive">
          A minha conta
        </span>
        <h1 className="mb-5 font-head text-[2rem] font-extrabold text-ink">
          Definições
        </h1>

        <div className="flex flex-col gap-5">
          <AccountForm user={user} />
          <PasswordForm />

          {user.accountType === "STAND" && (
            <div className="n2-card p-5 text-[0.9rem] text-n2muted">
              O teu perfil público de stand está em{" "}
              <Link
                href={`/stand/${user.id}`}
                className="font-semibold text-clay hover:underline"
              >
                /stand/{user.id}
              </Link>
              .
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
