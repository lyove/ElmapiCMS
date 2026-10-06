import { VerifyEmailForm } from "@/components/verify-email-form";
import { getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Verify email",
    description: "Confirm your Northline Academy email verification token.",
    path: "/verify-email",
    robots: { index: false, follow: false },
  });
}

type PageProps = {
  searchParams: Promise<{ token?: string; email?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-[76vh] max-w-lg flex-col justify-center px-5 py-20 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
        Verification
      </p>
      <h1 className="mt-3 font-heading text-5xl font-semibold tracking-tight">
        Confirm your email
      </h1>
      <div className="mt-8 rounded-xl border border-border bg-surface p-6 sm:p-8">
        <VerifyEmailForm
          initialToken={params.token}
          email={params.email}
        />
      </div>
    </div>
  );
}
