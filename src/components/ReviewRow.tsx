import type { ReactNode } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/date";

export type ReviewRowData = {
  rating: number;
  authorName?: string | null;
  comment?: string | null;
  createdAt: string;
  replyText?: string | null;
  lastError?: string | null;
};

export function Stars({ n, size = "h-3.5 w-3.5" }: { n: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`${size} ${i <= n ? "text-yellow-400" : "text-gray-200"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

// One review in a list: stars, author, date, comment, and the reply (if any).
// Renders as a link when `href` is given, otherwise as a button.
export function ReviewRow({
  review,
  badge,
  href,
  onClick,
}: {
  review: ReviewRowData;
  badge?: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "group flex w-full items-start justify-between gap-4 rounded-xl px-3 py-4 text-left transition-colors hover:bg-gray-50";
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Stars n={review.rating} />
          <span className="text-sm font-medium text-gray-900">{review.authorName || "Anonymous"}</span>
          <span className="text-xs text-gray-400">{formatDateTime(review.createdAt)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{review.comment || "No comment, rating only."}</p>
        {review.replyText ? (
          <p className="mt-2 line-clamp-2 border-l-2 border-gray-200 pl-3 text-sm text-gray-500">{review.replyText}</p>
        ) : null}
        {review.lastError ? <p className="mt-2 line-clamp-2 text-xs text-red-600">{review.lastError}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        <svg
          className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </div>
    </>
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
