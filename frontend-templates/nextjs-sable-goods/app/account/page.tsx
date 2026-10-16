import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/logout-button";
import { authUserFromMe } from "@/lib/auth-user";
import { createAuthClient } from "@/lib/elmapi-auth";
import { getOrdersForCustomer, getSiteSettings } from "@/lib/content";
import { formatMoney } from "@/lib/format";
import { orderStatusLabel, orderStatusTone } from "@/lib/order";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Account",
    description: "Your Sable Goods order history.",
    path: "/account",
    robots: { index: false, follow: false },
  });
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.accessToken || session.authError || !session.user?.id) {
    redirect("/login?callbackUrl=/account");
  }

  let customerUserId = session.user.id;
  let displayName = session.user.name || "Customer";
  let email = session.user.email || "";

  try {
    const me = authUserFromMe(
      (await createAuthClient({
        accessToken: session.accessToken,
      }).me()) as Record<string, unknown>,
    );
    customerUserId = String(me.uuid ?? me.id ?? customerUserId);
    displayName =
      (me.display_name as string | undefined) || displayName;
    email = String(me.email ?? email);
  } catch {
    // Fall back to session claims if me() fails.
  }

  const [settings, ordersById, ordersByEmail] = await Promise.all([
    getSiteSettings(),
    getOrdersForCustomer(customerUserId),
    email && email !== customerUserId
      ? getOrdersForCustomer(email)
      : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const orders = [...ordersById, ...ordersByEmail].filter((order) => {
    if (seen.has(order.uuid)) return false;
    seen.add(order.uuid);
    return true;
  });

  const currencySymbol = settings.fields["currency-symbol"] || "$";

  return (
    <div>
      <section className="border-b border-border bg-mist">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="animate-rise">
              <p className="eyebrow">Signed in</p>
              <h1 className="section-title mt-3">Account</h1>
              <p className="mt-3 max-w-lg text-[15px] leading-7 text-stone">
                Order history and account details for your Sable Goods studio
                checkout.
              </p>
            </div>
            <div className="animate-rise animate-rise-delay-1">
              <LogoutButton />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] xl:gap-16">
          <aside className="animate-rise space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className="border border-border bg-mist p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
                Profile
              </p>
              <p className="mt-3 font-heading text-xl font-bold tracking-tight text-ink">
                {displayName}
              </p>
              {email ? (
                <p className="mt-1 break-all text-[13px] text-stone">{email}</p>
              ) : null}
            </div>

            <nav className="space-y-1 text-[13px]">
              <a
                href="#orders"
                className="block border-l-2 border-teal px-3 py-2 font-medium text-ink"
              >
                Orders
              </a>
              <Link
                href="/shop"
                className="block border-l-2 border-transparent px-3 py-2 text-stone transition-colors hover:border-border hover:text-ink"
              >
                Continue shopping
              </Link>
              <Link
                href="/shipping"
                className="block border-l-2 border-transparent px-3 py-2 text-stone transition-colors hover:border-border hover:text-ink"
              >
                Shipping and returns
              </Link>
              <Link
                href="/faq"
                className="block border-l-2 border-transparent px-3 py-2 text-stone transition-colors hover:border-border hover:text-ink"
              >
                FAQ
              </Link>
            </nav>
          </aside>

          <section id="orders" className="animate-rise animate-rise-delay-1 min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="eyebrow">History</p>
                <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-ink">
                  Orders
                </h2>
              </div>
              <p className="text-[12px] text-stone">
                {orders.length}{" "}
                {orders.length === 1 ? "order" : "orders"}
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="mt-8 border border-border bg-mist px-6 py-12 text-center sm:px-10">
                <p className="font-heading text-lg font-bold tracking-tight text-ink">
                  No orders yet
                </p>
                <p className="mt-2 text-[14px] leading-6 text-stone">
                  When you place an order, it will appear here with status and
                  totals.
                </p>
                <Link href="/shop" className="shop-cta mt-8 inline-flex">
                  Browse the shop
                </Link>
              </div>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {orders.map((order) => {
                  const placed = order.published_at
                    ? new Date(order.published_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : null;
                  const city = order.fields["shipping-city"];
                  const country = order.fields["shipping-country"];

                  return (
                    <li key={order.uuid}>
                      <Link
                        href={`/order/${order.uuid}`}
                        className="group grid gap-4 py-6 transition-colors sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-heading text-[16px] font-bold tracking-tight text-ink transition-colors group-hover:text-teal">
                              {order.fields["order-number"] || "Order"}
                            </p>
                            <span
                              className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] capitalize ${orderStatusTone(order.fields.status)}`}
                            >
                              {orderStatusLabel(order.fields.status)}
                            </span>
                          </div>
                          <p className="text-[13px] text-stone">
                            {[placed, city, country].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                          <p className="text-[15px] font-semibold tabular-nums text-ink">
                            {formatMoney(
                              Number(order.fields.total ?? 0),
                              currencySymbol,
                            )}
                          </p>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone transition-colors group-hover:text-ink">
                            View
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
