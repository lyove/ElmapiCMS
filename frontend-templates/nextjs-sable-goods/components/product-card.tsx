import Image from "next/image";
import Link from "next/link";
import { assetAlt, firstAsset } from "@/lib/assets";
import { productPrice } from "@/lib/product";
import { formatMoney } from "@/lib/format";
import type { ContentEntry, ProductFields } from "@/lib/types";

export function ProductCard({
  product,
  currencySymbol = "$",
}: {
  product: ContentEntry<ProductFields>;
  currencySymbol?: string;
}) {
  const image = firstAsset(product.fields["primary-image"]);
  const slug = product.fields.slug || product.uuid;
  const inStock = product.fields["in-stock"] !== false;
  const price = productPrice(product);

  return (
    <article className="group">
      <Link href={`/shop/${slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-mist">
          {image?.url ? (
            <Image
              src={image.url}
              alt={assetAlt(image, product.fields.title || "Product")}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone">
              No image
            </div>
          )}
        </div>
        <div className="mt-4 space-y-1.5 text-center sm:text-left">
          <h3 className="font-heading text-[15px] font-bold tracking-tight text-ink transition-colors group-hover:text-teal">
            {product.fields.title}
          </h3>
          <p className="price-label">
            Price {formatMoney(price, currencySymbol)}
          </p>
          {product.fields.summary ? (
            <p className="line-clamp-2 text-[13px] leading-5 text-stone">
              {product.fields.summary}
            </p>
          ) : null}
          {!inStock ? (
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone">
              Out of stock
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
