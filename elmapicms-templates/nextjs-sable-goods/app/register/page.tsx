import Link from "next/link";
import { RegisterForm } from "@/components/register-form";
import { getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Create account",
    description: "Register for a Sable Goods account.",
    path: "/register",
    robots: { index: false, follow: false },
  });
}

export default async function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[76vh] max-w-lg flex-col justify-center px-5 py-20 sm:px-8">
      <p className="eyebrow">Account</p>
      <h1 className="section-title mt-3">
        Create account
      </h1>
      <p className="mt-4 text-sm leading-6 text-stone">
        Register to checkout. Orders are invoiced after placement, not paid by card on the site.
      </p>

      <div className="mt-8 border border-border bg-surface p-6 sm:p-8">
        <RegisterForm />
      </div>

      <p className="mt-6 text-sm text-stone">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-teal hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
