"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { assetAlt } from "@/lib/assets";
import type { ElmapiAsset } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  title,
}: {
  images: ElmapiAsset[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const active = images[activeIndex] ?? images[0];

  const goTo = useCallback(
    (index: number) => {
      if (index === activeIndex || index < 0 || index >= images.length) return;
      setFading(true);
      window.setTimeout(() => {
        setActiveIndex(index);
        setFading(false);
      }, 120);
    },
    [activeIndex, images.length],
  );

  useEffect(() => {
    if (images.length < 2) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        goTo((activeIndex + 1) % images.length);
      }
      if (event.key === "ArrowLeft") {
        goTo((activeIndex - 1 + images.length) % images.length);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, goTo, images.length]);

  if (!active?.url) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-mist text-stone sm:aspect-square">
        No image
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] overflow-hidden bg-mist sm:aspect-square">
        <Image
          key={active.uuid}
          src={active.url}
          alt={assetAlt(active, title)}
          fill
          priority
          className={cn(
            "object-cover transition-opacity duration-200",
            fading ? "opacity-0" : "opacity-100",
          )}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />

        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() =>
                goTo((activeIndex - 1 + images.length) % images.length)
              }
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center border border-white/70 bg-white/85 text-ink backdrop-blur-sm transition-colors hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => goTo((activeIndex + 1) % images.length)}
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center border border-white/70 bg-white/85 text-ink backdrop-blur-sm transition-colors hover:bg-white"
            >
              ›
            </button>
            <p className="absolute bottom-3 right-3 bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
              {activeIndex + 1} / {images.length}
            </p>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((image, index) => (
            <button
              key={image.uuid}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`View image ${index + 1}`}
              aria-current={index === activeIndex}
              className={cn(
                "relative aspect-square overflow-hidden border bg-mist transition-colors",
                index === activeIndex
                  ? "border-ink"
                  : "border-transparent hover:border-border",
              )}
            >
              {image.url ? (
                <Image
                  src={image.url}
                  alt={assetAlt(image, `${title} ${index + 1}`)}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
