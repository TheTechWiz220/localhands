"use client";

import { useEffect, useState, useRef } from "react";
import { User, LogOut, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const MAX_FILES = 6;
const MAX_SIZE_MB = 5;

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  async function loadProof(uid: string) {
    const { data } = await supabase
      .from("proof_media")
      .select("media_url")
      .eq("worker_id", uid)
      .order("created_at", { ascending: false });

    setProofUrls((data || []).map((r: any) => r.media_url));
  }

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email || null);
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, verification_status")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name);
        setRole(profile.role);
        setStatus(profile.verification_status);
      }

      await loadProof(user.id);
      setLoading(false);
    }

    load();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    setUploading(true);
    setUploadError("");

    try {
      let count = proofUrls.length;

      for (const file of picked) {
        if (!file.type.startsWith("image/")) {
          setUploadError("Only images allowed (JPG, PNG, WebP).");
          continue;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          setUploadError(`Each image must be under ${MAX_SIZE_MB}MB.`);
          continue;
        }
        if (count >= MAX_FILES) {
          setUploadError(`Maximum ${MAX_FILES} proof photos.`);
          break;
        }

        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId}/${Date.now()}-${count}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("proof-media")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw new Error(uploadError.message);

        const {
          data: { publicUrl },
        } = supabase.storage.from("proof-media").getPublicUrl(path);

        const { error: insertError } = await supabase.from("proof_media").insert({
          worker_id: userId,
          media_url: publicUrl,
          media_type: "image",
        });

        if (insertError) throw new Error(insertError.message);
        count += 1;
      }

      await loadProof(userId);
    } catch (err: any) {
      setUploadError(
        err?.message?.includes("Bucket") || err?.message?.includes("not found")
          ? "Create a public Storage bucket named proof-media in Supabase."
          : err?.message || "Upload failed"
      );
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm text-gray-500">Manage your LocalHands account</p>
        </div>
        <div className="rounded-xl border bg-white py-10 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-lg">Not signed in</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Sign in to create or edit your profile.
          </p>
          <Link href="/auth">
            <Button>Sign in with Email</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-gray-500">Your LocalHands account</p>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl">
            {(fullName || email)[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{fullName || "No name set"}</p>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Role</p>
            <p className="font-medium capitalize">{role || "client"}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Status</p>
            <p className="font-medium capitalize">{status || "—"}</p>
          </div>
        </div>

        {role !== "worker" && (
          <Link href="/apply">
            <Button className="w-full">Apply as Worker</Button>
          </Link>
        )}

        {role === "worker" && status === "pending" && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            Your worker application is pending review.
          </p>
        )}

        {role === "worker" && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Proof of work</h3>
              <span className="text-xs text-gray-400">
                {proofUrls.length}/{MAX_FILES}
              </span>
            </div>

            {proofUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {proofUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`Proof ${i + 1}`}
                    className="aspect-square object-cover rounded-lg border"
                  />
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFilesSelected}
            />

            {proofUrls.length < MAX_FILES && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Add proof photos
                  </>
                )}
              </Button>
            )}

            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
