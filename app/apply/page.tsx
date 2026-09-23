"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Hand, CheckCircle2, Loader2, ImagePlus, X, Camera } from "lucide-react";
import Link from "next/link";
import { SKILLS, AREAS } from "@/lib/skills";

type Step = "form" | "success" | "need_auth";

const MAX_FILES = 6;
const MAX_SIZE_MB = 5;

export default function ApplyPage() {
  const [step, setStep] = useState<Step>("form");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmAdult, setConfirmAdult] = useState(false);
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [proofUploadedUrls, setProofUploadedUrls] = useState<string[]>([]);
  const [proofUploading, setProofUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [avatarUploadedUrl, setAvatarUploadedUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStep("need_auth");
        setChecking(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        if (profile.full_name) setFullName(profile.full_name);
        if (profile.location_area) setLocation(profile.location_area);
        if (profile.bio) setBio(profile.bio);
        if (profile.whatsapp_phone) setWhatsapp(profile.whatsapp_phone);
        if (profile.avatar_url) {
          setExistingAvatarUrl(profile.avatar_url);
          setAvatarPreview(profile.avatar_url);
        }
        if (
          profile.role === "worker" &&
          (profile.verification_status === "pending" ||
            profile.verification_status === "verified")
        ) {
          setStep("success");
        }
      }
      setChecking(false);
    }
    init();
  }, [supabase]);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function addCustomSkill() {
    const s = customSkill.trim();
    if (!s) return;
    if (!selectedSkills.includes(s)) setSelectedSkills((prev) => [...prev, s]);
    setCustomSkill("");
  }

  async function uploadAvatarFile(userId: string, file: File): Promise<string> {
    const name = file.name || "avatar.jpg";
    let ext = name.split(".").pop()?.toLowerCase() || "jpg";
    if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) ext = "jpg";
    const contentType =
      file.type && file.type.startsWith("image/")
        ? file.type
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: storageError } = await supabase.storage
      .from("proof-media")
      .upload(path, file, { cacheControl: "3600", upsert: true, contentType });
    if (storageError) throw new Error(storageError.message || "Storage upload failed");
    const { data: { publicUrl } } = supabase.storage.from("proof-media").getPublicUrl(path);
    return `${publicUrl}?t=${Date.now()}`;
  }

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage =
      (file.type && file.type.startsWith("image/")) ||
      /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!isImage) {
      setError("Avatar must be an image (JPG, PNG, WebP).");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Avatar must be under ${MAX_SIZE_MB}MB.`);
      e.target.value = "";
      return;
    }
    setError("");
    setAvatarFile(file);
    setAvatarUploadedUrl(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (result) setAvatarPreview(result);
    };
    reader.readAsDataURL(file);
    setAvatarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sign in again, then add your photo.");
        setAvatarUploading(false);
        e.target.value = "";
        return;
      }
      const publicUrl = await uploadAvatarFile(user.id, file);
      setAvatarUploadedUrl(publicUrl);
      setAvatarPreview(publicUrl);
      setError("");
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      setAvatarUploadedUrl(null);
      setError(
        err?.message?.includes("fetch")
          ? "Photo could not upload. Check your connection and try again, or submit without a photo."
          : `Photo upload failed: ${err?.message || "unknown error"}. You can still submit and add a photo later from Profile.`
      );
    }
    setAvatarUploading(false);
    e.target.value = "";
  }

  function clearAvatar() {
    setAvatarFile(null);
    setAvatarUploadedUrl(null);
    setAvatarPreview(existingAvatarUrl);
  }

  function isImageFile(f: File) {
    if (f.type && f.type.startsWith("image/")) return true;
    return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name || "");
  }

  async function uploadOneProofFile(userId: string, file: File, index: number): Promise<string> {
    const name = file.name || `proof-${index}.jpg`;
    let ext = name.split(".").pop()?.toLowerCase() || "jpg";
    if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) ext = "jpg";
    const contentType =
      file.type && file.type.startsWith("image/")
        ? file.type
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
    const path = `${userId}/proof-${Date.now()}-${index}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("proof-media")
      .upload(path, file, { upsert: true, contentType, cacheControl: "3600" });
    if (uploadError) throw new Error(uploadError.message);
    const {
      data: { publicUrl },
    } = supabase.storage.from("proof-media").getPublicUrl(path);
    return `${publicUrl}?t=${Date.now()}`;
  }

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    e.target.value = "";

    const room = MAX_FILES - files.length;
    if (room <= 0) {
      setError(`Maximum ${MAX_FILES} proof photos.`);
      return;
    }

    const batch = incoming.slice(0, room);
    const localFiles: File[] = [];
    let skipped = 0;
    let lastError = "";

    for (const f of batch) {
      if (!isImageFile(f)) {
        skipped += 1;
        lastError = "Only images are allowed (JPG, PNG, WebP).";
        continue;
      }
      if (f.size > 0 && f.size > MAX_SIZE_MB * 1024 * 1024) {
        skipped += 1;
        lastError = `Each image must be under ${MAX_SIZE_MB}MB.`;
        continue;
      }
      localFiles.push(f);
    }

    if (localFiles.length === 0) {
      if (lastError) setError(lastError);
      return;
    }

    // Placeholder slots until public URL is ready — avoids broken blob previews on Android
    const startIndex = files.length;
    const placeholders = localFiles.map(() => "");
    setFiles((prev) => [...prev, ...localFiles].slice(0, MAX_FILES));
    setPreviews((prev) => [...prev, ...placeholders].slice(0, MAX_FILES));
    setProofUploadedUrls((prev) => [...prev, ...placeholders].slice(0, MAX_FILES));
    setError("");
    setProofUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProofUploading(false);
      setError("Sign in again, then add proof photos.");
      return;
    }

    // Same path as avatar: upload to storage, preview = public HTTPS URL (stable on Android)
    for (let i = 0; i < localFiles.length; i++) {
      const globalIndex = startIndex + i;
      try {
        const publicUrl = await uploadOneProofFile(user.id, localFiles[i], globalIndex);
        setPreviews((prev) => {
          const next = [...prev];
          if (globalIndex < next.length) next[globalIndex] = publicUrl;
          return next;
        });
        setProofUploadedUrls((prev) => {
          const next = [...prev];
          if (globalIndex < next.length) next[globalIndex] = publicUrl;
          return next;
        });
      } catch (err: any) {
        console.error("Proof upload failed:", err);
        skipped += 1;
        lastError =
          err?.message?.includes("fetch") || err?.message?.includes("network")
            ? "Could not upload photo. Check connection and try again."
            : `Photo upload failed: ${err?.message || "unknown error"}`;
        // Drop failed slot so user can retry
        setFiles((prev) => prev.filter((_, idx) => idx !== globalIndex));
        setPreviews((prev) => prev.filter((_, idx) => idx !== globalIndex));
        setProofUploadedUrls((prev) => prev.filter((_, idx) => idx !== globalIndex));
      }
    }

    setProofUploading(false);
    if (skipped > 0 && lastError) setError(lastError);
  }

  function removeFile(index: number) {
    setPreviews((prev) => {
      const url = prev[index];
      if (url && url.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
      }
      return prev.filter((_, i) => i !== index);
    });
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setProofUploadedUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadProofMedia(userId: string) {
    const ready = proofUploadedUrls.filter((u) => !!u && u.startsWith("http"));
    if (ready.length > 0) {
      const rows = ready.map((media_url) => ({
        worker_id: userId,
        media_url: media_url.split("?")[0],
        media_type: "image",
      }));
      const { error: insertError } = await supabase.from("proof_media").insert(rows);
      if (insertError) throw new Error(insertError.message);
      return;
    }
    // Fallback: upload remaining files that were not eagerly uploaded
    const uploaded: { media_url: string; media_type: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name || `proof-${i}.jpg`;
      let ext = name.split(".").pop()?.toLowerCase() || "jpg";
      if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) ext = "jpg";
      const contentType =
        file.type && file.type.startsWith("image/")
          ? file.type
          : ext === "png"
            ? "image/png"
            : ext === "webp"
              ? "image/webp"
              : "image/jpeg";
      const path = `${userId}/${Date.now()}-${i}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("proof-media")
        .upload(path, file, { upsert: false, contentType, cacheControl: "3600" });
      if (uploadError) throw new Error(uploadError.message);
      const { data: { publicUrl } } = supabase.storage.from("proof-media").getPublicUrl(path);
      uploaded.push({ media_url: publicUrl, media_type: "image" });
    }
    if (uploaded.length === 0) return;
    const rows = uploaded.map((u) => ({
      worker_id: userId,
      media_url: u.media_url,
      media_type: u.media_type,
    }));
    const { error: insertError } = await supabase.from("proof_media").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  async function submitApplication() {
    if (!confirmAdult) {
      setError("You must confirm that you are 18 years or older.");
      return;
    }
    setError("");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setStep("need_auth");
      return;
    }
    const userId = user.id;
    if (!fullName.trim() || !location || selectedSkills.length === 0) {
      setLoading(false);
      setError("Please fill in name, area, and at least one skill.");
      return;
    }
    let avatarUrl: string | null = avatarUploadedUrl || existingAvatarUrl || null;
    let avatarWarning = "";
    if (avatarFile && !avatarUploadedUrl) {
      try {
        avatarUrl = await uploadAvatarFile(userId, avatarFile);
        setAvatarUploadedUrl(avatarUrl);
      } catch (e: any) {
        console.error("Avatar upload on submit failed:", e);
        avatarWarning =
          "Profile photo could not upload. Application still submitted — add a photo later from Profile.";
        avatarUrl = existingAvatarUrl;
      }
    }
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName.trim(),
      location_area: location,
      bio: bio.trim() || null,
      whatsapp_phone: whatsapp.trim() || null,
      avatar_url: avatarUrl,
      role: "worker",
      verification_status: "pending",
      is_verified: false,
      updated_at: new Date().toISOString(),
    });
    if (profileError) {
      setLoading(false);
      setError(
        profileError.message.includes("whatsapp")
          ? "WhatsApp field missing — contact support or run the profiles migration."
          : profileError.message
      );
      return;
    }
    await supabase.from("worker_skills").delete().eq("worker_id", userId);
    const skillRows = selectedSkills.map((skill) => ({ worker_id: userId, skill }));
    const { error: skillsError } = await supabase.from("worker_skills").insert(skillRows);
    if (skillsError) {
      setLoading(false);
      setError(skillsError.message);
      return;
    }
    try {
      if (files.length > 0 || proofUploadedUrls.some((u) => u.startsWith("http"))) {
        await uploadProofMedia(userId);
      }
    } catch (e: any) {
      console.error("Proof media upload failed:", e);
      if (!avatarWarning) {
        avatarWarning =
          e?.message?.includes("Bucket") || e?.message?.includes("not found")
            ? "Storage bucket issue — proof photos skipped. Application still submitted."
            : "Some proof photos could not upload. Application still submitted.";
      }
    }
    setLoading(false);
    if (avatarWarning) setError(avatarWarning);
    setStep("success");
  }

  if (checking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (step === "need_auth") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-700">
          <Hand className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sign in to apply</h1>
          <p className="text-gray-500 mt-2">
            Create an account with your email first, then complete your worker application.
          </p>
        </div>
        <Link href="/auth"><Button size="lg">Sign in with Email</Button></Link>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Application submitted</h1>
          <p className="text-gray-500 mt-2">
            Your profile is under review. We will contact you to schedule a short in-person verification (ID + suitability check). Only after that meeting do you appear as Verified for clients.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/profile"><Button>View Profile</Button></Link>
          <Link href="/"><Button variant="outline">Go Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Become a LocalHands worker</h1>
        <p className="text-sm text-gray-500 mt-1">
          Show your skills and proof of work. We review your ID and meet you in person before approval — so clients can trust the directory, including for work inside homes.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-5">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Profile photo</label>
          <p className="text-xs text-gray-500 mb-3">A clear face photo helps clients recognise you. Optional but recommended.</p>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover border bg-gray-100"
                  onError={() => {
                    setAvatarPreview(null);
                    setAvatarFile(null);
                    setError("That photo could not be displayed. Try JPG or PNG.");
                  }}
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-2xl">
                  {(fullName || "W")[0].toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center shadow border-2 border-white"
                title="Upload photo"
                disabled={avatarUploading}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelected} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Button type="button" variant="outline" size="sm" disabled={avatarUploading} onClick={() => avatarInputRef.current?.click()}>
                {avatarUploading ? (<><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Uploading...</>) : avatarUploadedUrl || avatarPreview ? "Change photo" : "Add photo"}
              </Button>
              {(avatarFile || avatarUploadedUrl) && !avatarUploading && (
                <button type="button" onClick={clearAvatar} className="text-xs text-gray-500 hover:text-red-600 text-left">Remove new photo</button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Full name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Area</label>
          <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Select your area</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">WhatsApp number</label>
          <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="e.g. 87 770 0011 or +220 87 770 0011" className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Skills</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {SKILLS.map((skill) => (
              <Badge
                key={skill}
                variant={selectedSkills.includes(skill) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleSkill(skill)}
              >
                {skill}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="Add custom skill"
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
            />
            <Button type="button" variant="outline" size="sm" onClick={addCustomSkill}>Add</Button>
          </div>
          {selectedSkills.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{selectedSkills.length} skill(s) selected</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">About you</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="e.g. 5 years phone repair in Serrekunda. Available weekdays..."
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Proof of work (photos)</label>
          <p className="text-xs text-gray-500 mb-2">
            Photos of jobs you have finished help us verify you faster. Up to 6 images, max 5MB each.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFilesSelected}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={proofUploading || files.length >= MAX_FILES}
            className="w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-2 text-gray-500 hover:border-green-500 hover:text-green-700 transition-colors disabled:opacity-50"
          >
            {proofUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <span className="text-sm">Uploading photos...</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm">Tap to add photos</span>
              </>
            )}
          </button>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {previews.map((src, i) => (
                <div key={`proof-${i}-${src ? src.slice(-20) : "pending"}`} className="relative aspect-square">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={`Proof ${i + 1}`}
                      className="w-full h-full object-cover rounded-lg border bg-gray-100"
                    />
                  ) : (
                    <div className="w-full h-full rounded-lg border bg-gray-100 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmAdult}
            onChange={(e) => setConfirmAdult(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-gray-700">
            I confirm that I am <strong>18 years or older</strong>. LocalHands will review my national ID and complete an in-person assessment before approval.
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button
          className="w-full"
          size="lg"
          disabled={loading || avatarUploading || proofUploading}
          onClick={submitApplication}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            "Submit application"
          )}
        </Button>
      </div>
    </div>
  );
}
