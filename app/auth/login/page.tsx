"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Indica a palavra-passe"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou palavra-passe incorretos");
      } else {
        router.push("/garagem");
        router.refresh();
      }
    } catch {
      setError("Ocorreu um erro inesperado. Tenta novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/promo.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#2A211A]/35 via-transparent to-[#2A211A]/45" />
      <Card className="relative z-10 w-full max-w-md rounded-2xl border border-[#E7D7B6] bg-[#FCF7EC]/90 shadow-warmlg backdrop-blur-md">
        <CardHeader className="space-y-1">
          <div className="text-center font-head text-[1.5rem] font-extrabold tracking-tight text-ink">
            NACIONAL <span className="text-clay">2</span>
          </div>
          <CardTitle className="text-center text-2xl font-bold">
            Bem-vindo de volta
          </CardTitle>
          <CardDescription className="text-center">
            Entra na tua conta para gerir os teus carros
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="o.teu@email.pt"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Spinner size="sm" className="mr-2" />}
              Entrar
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Ainda não tens conta?{" "}
              <Link
                href="/auth/register"
                className="text-primary hover:underline"
              >
                Cria já — é grátis
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
