import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Sign in",
    description: "Sign in to your Sable Goods account.",
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
  const callbackUrl = params.callbackUrl || "/account";

  return (
    <div className="mx-auto flex min-h-[76vh] max-w-lg flex-col justify-center px-5 py-20 sm:px-8">
      <p className="eyebrow">Account</p>
      <h1 className="section-title mt-3">Sign in</h1>
      <p className="mt-4 text-sm leading-6 text-stone">
        Checkout requires an account. Sign in to place orders and view history.
      </p>

      {params.registered ? (
        <p className="mt-4 border border-border bg-surface px-3 py-2 text-sm">
          Account created. Sign in to continue.
        </p>
      ) : null}
      {params.verified ? (
        <p className="mt-4 border border-border bg-surface px-3 py-2 text-sm">
          Email verified. You can sign in now.
        </p>
      ) : null}
      {params.error === "session" ? (
        <p className="mt-4 border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Your session expired or refresh failed. Sign in again.
        </p>
      ) : null}

      <div className="mt-8 border border-border bg-surface p-6 sm:p-8">
        <LoginForm callbackUrl={callbackUrl} />
      </div>

      <p className="mt-6 text-sm text-stone">
        New here?{" "}
        <Link href="/register" className="font-medium text-teal hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
