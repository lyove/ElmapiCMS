import Image from "next/image";
import { assetAlt, firstAsset } from "@/lib/assets";
import type { ContentEntry, TestimonialFields } from "@/lib/types";

export function Testimonial({
  testimonial,
}: {
  testimonial: ContentEntry<TestimonialFields>;
}) {
  const avatar = firstAsset(testimonial.fields.avatar);

  return (
    <figure className="mx-auto max-w-4xl text-center">
      <blockquote className="font-heading text-2xl font-semibold leading-snug tracking-[-0.025em] text-ink sm:text-4xl sm:leading-tight lg:text-5xl">
        “{testimonial.fields.quote}”
      </blockquote>
      <figcaption className="mt-8 flex items-center justify-center gap-3">
        {avatar?.url ? (
          <Image
            src={avatar.url}
            alt={assetAlt(avatar, testimonial.fields["member-name"] || "Member")}
            width={48}
            height={48}
            className="size-12 rounded-full object-cover"
          />
        ) : null}
        <span className="text-left">
          <strong className="block text-sm text-ink">
            {testimonial.fields["member-name"]}
          </strong>
          <span className="text-xs text-muted-foreground">
            {testimonial.fields["member-role"]}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
