import Link from "next/link";
import { RegisterForm } from "@/components/register-form";
import { getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Create account",
    description: "Join Northline Academy with Elmapi project user auth.",
    path: "/register",
    robots: { index: false, follow: false },
  });
}

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[76vh] max-w-lg flex-col justify-center px-5 py-20 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
        Membership
      </p>
      <h1 className="mt-3 font-heading text-5xl font-semibold tracking-tight">
        Create account
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Join Northline to unlock full lessons and keep your learning in one place.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-surface p-6 sm:p-8">
        <RegisterForm />
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Already a member?{" "}
        <Link href="/login" className="font-bold text-coral hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
