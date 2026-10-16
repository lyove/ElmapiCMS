import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Sign in",
    description: "Sign in to Northline Academy with Elmapi project user auth.",
    path: "/login",
    robots: { index: false, follow: false },
  });
}

type PageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    registered?: string;
    verified?: string;
  }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/members";

  return (
    <div className="mx-auto flex min-h-[76vh] max-w-lg flex-col justify-center px-5 py-20 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
        Members
      </p>
      <h1 className="mt-3 font-heading text-5xl font-semibold tracking-tight">
        Sign in
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Welcome back. Sign in to continue your courses and open the member library.
      </p>

      {params.registered ? (
        <p className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          Account created. Sign in to continue.
        </p>
      ) : null}
      {params.verified ? (
        <p className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          Email verified. You can sign in now.
        </p>
      ) : null}
      {params.error === "session" ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Your session expired or refresh failed. Sign in again.
        </p>
      ) : null}

      <div className="mt-8 rounded-xl border border-border bg-surface p-6 sm:p-8">
        <LoginForm callbackUrl={callbackUrl} />
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-bold text-coral hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
