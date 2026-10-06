"use client";

import { SessionProvider } from "next-auth/react";
import { NavigationProgress } from "@/components/navigation-progress";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NavigationProgress />
      {children}
    </SessionProvider>
  );
}
