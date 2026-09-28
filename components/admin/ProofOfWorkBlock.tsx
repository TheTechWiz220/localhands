"use client";

import { useState } from "react";

type Props = {
  urls: string[];
};

export function ProofOfWorkBlock({ urls }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">Proof of work</p>
      {urls.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPreview(url)}
              className="rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 active:opacity-90"
              title="Tap to enlarge"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Proof ${i + 1}`}
                className="aspect-square object-cover rounded-lg border w-full pointer-events-none"
              />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          No proof photos uploaded yet. Ask them to add photos from Profile
          before you approve if needed.
        </p>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 text-white text-sm font-medium px-3 py-1 rounded-full bg-white/20"
            >
              Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Proof of work"
              className="w-full rounded-2xl object-contain max-h-[80vh] shadow-xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
