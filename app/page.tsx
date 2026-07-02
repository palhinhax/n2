import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code2, Database, Shield, Palette } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="font-bold text-xl">SaaS Template</div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Production-Ready
          <br />
          <span className="text-primary">SaaS Template</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          A full-stack Next.js 14 template with authentication, database, and
          beautiful UI components. Start building your SaaS product today.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/auth/register">
            <Button size="lg">
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold">Built with the Best Stack</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Modern technologies carefully selected for developer experience and production readiness.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Code2 className="h-8 w-8" />}
              title="Next.js 14"
              description="App Router with React Server Components and TypeScript"
            />
            <FeatureCard
              icon={<Database className="h-8 w-8" />}
              title="Prisma + PostgreSQL"
              description="Type-safe database access with migrations"
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="Auth.js"
              description="Secure authentication with credentials provider"
            />
            <FeatureCard
              icon={<Palette className="h-8 w-8" />}
              title="shadcn/ui"
              description="Beautiful, accessible UI components with Tailwind"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built with ❤️ using Next.js, Prisma, and shadcn/ui</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-6">
      <div className="text-primary">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
