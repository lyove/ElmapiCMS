"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { buttonVariants } from "@/components/ui/button";
import type { NavLink } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AuthNav({
  siteName,
  nav,
  memberLabel,
  memberUrl,
}: {
  siteName: string;
  nav: NavLink[];
  memberLabel: string;
  memberUrl: string;
}) {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && !session?.authError;

  return (
    <div className="flex items-center gap-2">
      {signedIn ? (
        <>
          <Link
            href="/members"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden sm:inline-flex",
            )}
          >
            Library
          </Link>
          <LogoutButton />
        </>
      ) : (
        <>
          <Link
            href={memberUrl}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden sm:inline-flex",
            )}
          >
            {memberLabel}
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: "sm" }),
              "hidden bg-coral text-white hover:bg-coral/90 sm:inline-flex",
            )}
          >
            Join
          </Link>
        </>
      )}
      <MobileNav
        siteName={siteName}
        nav={nav}
        signedIn={signedIn}
        memberLabel={memberLabel}
        memberUrl={memberUrl}
      />
    </div>
  );
}
