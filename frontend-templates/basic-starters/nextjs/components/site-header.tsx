import Link from "next/link";
import { auth } from "@/auth";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { LocaleSwitcher } from "./locale-switcher";
import { LogoutButton } from "./logout-button";

export async function SiteHeader({
  locale,
  dictionary,
  siteName,
}: {
  locale: Locale;
  dictionary: Dictionary;
  siteName: string;
}) {
  const session = await auth();
  const signedIn = Boolean(session?.accessToken) && !session?.authError;

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={localePath(locale, "/")}
            className="text-sm font-semibold tracking-tight text-zinc-900"
          >
            {siteName}
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
            <Link href={localePath(locale, "/notes")} className="hover:text-zinc-900">
              {dictionary.nav.notes}
            </Link>
            <Link
              href={localePath(locale, "/notes/new")}
              className="hover:text-zinc-900"
            >
              {dictionary.nav.newNote}
            </Link>
            <Link
              href={localePath(locale, "/upload")}
              className="hover:text-zinc-900"
            >
              {dictionary.nav.upload}
            </Link>
            {signedIn ? (
              <Link
                href={localePath(locale, "/account")}
                className="hover:text-zinc-900"
              >
                {dictionary.nav.account}
              </Link>
            ) : (
              <>
                <Link
                  href={localePath(locale, "/login")}
                  className="hover:text-zinc-900"
                >
                  {dictionary.nav.login}
                </Link>
                <Link
                  href={localePath(locale, "/register")}
                  className="hover:text-zinc-900"
                >
                  {dictionary.nav.register}
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher locale={locale} label={dictionary.locale.switcher} />
          {signedIn ? (
            <LogoutButton
              locale={locale}
              label={dictionary.nav.logout}
              failedLabel={dictionary.auth.logoutFailed}
              networkLabel={dictionary.auth.logoutNetwork}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
