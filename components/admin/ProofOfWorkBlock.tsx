"use client";

type Props = {
  urls: string[];
};

export function ProofOfWorkBlock({ urls }: Props) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">Proof of work</p>
      {urls.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`Proof ${i + 1}`}
              className="aspect-square object-cover rounded-lg border"
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          No proof photos uploaded yet. Ask them to add photos from Profile
          before you approve if needed.
        </p>
      )}
    </div>
  );
}
