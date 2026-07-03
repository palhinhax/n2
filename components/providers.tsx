"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { FavoritesProvider } from "@/components/favorites-context";
import { CompareProvider } from "@/components/compare-context";
import CompareTray from "@/components/compare-tray";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <FavoritesProvider>
          <CompareProvider>
            {children}
            <CompareTray />
          </CompareProvider>
        </FavoritesProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
