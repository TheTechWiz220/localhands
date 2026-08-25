"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

export function ProofGallery({
  urls,
  emptyLabel = "No proof photos uploaded yet.",
  onDelete,
  deletingUrl,
}: {
  urls: string[];
  emptyLabel?: string;
  /** If provided, shows a delete control on each thumbnail (owner profile only). */
  onDelete?: (url: string, index: number) => void;
  /** URL currently being deleted — disables that control. */
  deletingUrl?: string | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight" && openIndex !== null) {
        setOpenIndex((i) =>
          i === null ? null : (i + 1) % urls.length
        );
      }
      if (e.key === "ArrowLeft" && openIndex !== null) {
        setOpenIndex((i) =>
          i === null ? null : (i - 1 + urls.length) % urls.length
        );
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [openIndex, urls.length]);

  if (urls.length === 0) {
    return (
      <>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400"
            >
              Photo {i}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">{emptyLabel}</p>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} className="relative group">
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="relative aspect-square w-full rounded-lg border overflow-hidden focus:outline-none focus:ring-2 focus:ring-green-600"
              aria-label={`View proof photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Proof ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
            {onDelete && (
              <button
                type="button"
                disabled={deletingUrl === url}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(url, i);
                }}
                className="absolute top-1 right-1 z-10 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                aria-label={`Delete proof photo ${i + 1}`}
                title="Remove photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        {onDelete
          ? "Tap a photo to enlarge · trash icon removes it"
          : "Tap a photo to enlarge"}
      </p>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenIndex(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm">
              {openIndex + 1} / {urls.length}
            </span>
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              className="p-2 rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center px-2 pb-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {urls.length > 1 && (
              <button
                type="button"
                className="absolute left-2 p-2 rounded-full bg-black/40 text-white"
                onClick={() =>
                  setOpenIndex((i) =>
                    i === null ? 0 : (i - 1 + urls.length) % urls.length
                  )
                }
                aria-label="Previous"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urls[openIndex]}
              alt={`Proof ${openIndex + 1}`}
              className="max-h-[80vh] max-w-full object-contain rounded-lg"
            />

            {urls.length > 1 && (
              <button
                type="button"
                className="absolute right-2 p-2 rounded-full bg-black/40 text-white"
                onClick={() =>
                  setOpenIndex((i) =>
                    i === null ? 0 : (i + 1) % urls.length
                  )
                }
                aria-label="Next"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
