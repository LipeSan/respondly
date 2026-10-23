"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Product } from "@/lib/shop";
import { ProductVisual } from "@/components/shop/ProductVisual";

const SLIDE_COUNT = 3;

type SlideSize = "card" | "large" | "thumb";

const IMAGE_SIZES: Record<SlideSize, string> = {
  card: "(min-width: 640px) 30vw, 100vw",
  large: "(min-width: 1024px) 40vw, 100vw",
  thumb: "80px",
};

function Slide({ product, index, size }: { product: Product; index: number; size: SlideSize }) {
  const src = product.images[index];
  if (src) {
    return (
      <div className="relative h-full overflow-hidden rounded-xl bg-white">
        <Image
          src={src}
          alt={`${product.name}, photo ${index + 1}`}
          fill
          sizes={IMAGE_SIZES[size]}
          // The files are already compressed AVIFs; re-encoding them through
          // the optimizer only adds a second round of artifacts.
          unoptimized
          className="object-contain"
          priority={size === "large" && index === 0}
        />
      </div>
    );
  }
  return <ProductVisual kind={product.visual} size={size} variant={index} />;
}

// First photo for small cards, falling back to the illustration.
export function ProductCover({ product }: { product: Product }) {
  if (!product.images[0]) return <ProductVisual kind={product.visual} />;
  return (
    <div className="h-44">
      <Slide product={product} index={0} size="card" />
    </div>
  );
}

function Arrow({
  direction,
  onClick,
  disabled,
  compact,
}: {
  direction: "prev" | "next";
  onClick(): void;
  disabled: boolean;
  compact: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous photo" : "Next photo"}
      onClick={onClick}
      disabled={disabled}
      className={`absolute top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition-opacity hover:text-gray-900 disabled:!opacity-0 sm:flex ${
        compact ? "h-8 w-8 opacity-0 focus-visible:opacity-100 group-hover:opacity-100" : "h-9 w-9"
      } ${direction === "prev" ? "left-3" : "right-3"}`}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={direction === "prev" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

/**
 * Swipeable photo gallery: native scroll-snap for touch, arrows and
 * thumbnails for mouse, arrow keys for keyboard. `compact` is the version on
 * the Shop cards: fixed height, arrows on hover, no thumbnails, and each
 * slide links to `href`.
 */
export function ProductGallery({
  product,
  badge,
  compact = false,
  href,
}: {
  product: Product;
  badge?: string;
  compact?: boolean;
  href?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(SLIDE_COUNT - 1, i));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: next * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
    setIndex(next);
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  const slideSize: SlideSize = compact ? "card" : "large";

  return (
    <div className={compact ? "" : "flex h-full flex-col gap-3"}>
      <div
        className={`group relative ${compact ? "h-44" : "h-72 sm:h-96 lg:h-auto lg:min-h-96 lg:flex-1"}`}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${product.name} photos`}
        tabIndex={compact ? undefined : 0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") goTo(index - 1);
          if (e.key === "ArrowRight") goTo(index + 1);
        }}
      >
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex h-full snap-x snap-mandatory overflow-x-auto rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <div
              key={i}
              className="h-full w-full shrink-0 snap-center"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDE_COUNT}`}
            >
              {href ? (
                <Link href={href} className="block h-full" tabIndex={i === index ? 0 : -1} aria-label={`View ${product.name}`}>
                  <Slide product={product} index={i} size={slideSize} />
                </Link>
              ) : (
                <Slide product={product} index={i} size={slideSize} />
              )}
            </div>
          ))}
        </div>

        {badge ? (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-gray-900 px-2 py-0.5 text-xs font-medium text-white">
            {badge}
          </span>
        ) : null}
        <Arrow direction="prev" onClick={() => goTo(index - 1)} disabled={index === 0} compact={compact} />
        <Arrow direction="next" onClick={() => goTo(index + 1)} disabled={index === SLIDE_COUNT - 1} compact={compact} />

        <div
          className={`pointer-events-none absolute left-1/2 flex -translate-x-1/2 gap-1.5 ${compact ? "bottom-1.5" : "bottom-3 sm:hidden"}`}
          aria-hidden="true"
        >
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-gray-900" : "w-1.5 bg-gray-900/30"}`} />
          ))}
        </div>
      </div>

      {compact ? null : (
        <div className="hidden gap-3 sm:flex">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={`h-16 w-20 overflow-hidden rounded-lg ring-offset-2 transition ${
                i === index ? "ring-2 ring-green-500" : "opacity-70 hover:opacity-100"
              }`}
            >
              <Slide product={product} index={i} size="thumb" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
