"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Hand, CheckCircle2, Loader2, ImagePlus, X } from "lucide-react";
import Link from "next/link";
import { SKILLS, AREAS } from "@/lib/skills";

const MAX_FILES = 6;
const MAX_SIZE_MB = 5;

type Step = "form" | "success" | "need_auth";

export default function ApplyPage() {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStep("need_auth");
        setChecking(false);
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, location_area, bio, role, verification_status")
        .eq("id", user.id)
        .single();

      if (profile) {
        if (profile.full_name) setFullName(profile.full_name);
        if (profile.location_area) setLocation(profile.location_area);
        if (profile.bio) setBio(profile.bio);

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

    checkUser();
  }, []);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  }

  function addCustomSkill() {
    const s = customSkill.trim();
    if (!s) return;
    if (!selectedSkills.includes(s)) {
      setSelectedSkills((prev) => [...prev, s]);
    }
    setCustomSkill("");
  }

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    const next: File[] = [...files];
    for (const f of picked) {
      if (!f.type.startsWith("image/")) {
        setError("Only images are allowed for now (JPG, PNG, WebP).");
        continue;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Each image must be under ${MAX_SIZE_MB}MB.`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setError(`You can upload up to ${MAX_FILES} photos.`);
        break;
      }
      next.push(f);
    }

    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  async function uploadProofMedia(workerId: string) {
    const uploaded: { media_url: string; media_type: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${workerId}/${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("proof-media")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("proof-media").getPublicUrl(path);

      uploaded.push({ media_url: publicUrl, media_type: "image" });
    }

    if (uploaded.length > 0) {
      const rows = uploaded.map((u) => ({
        worker_id: workerId,
        media_url: u.media_url,
        media_type: u.media_type,
      }));

      const { error: insertError } = await supabase
        .from("proof_media")
        .insert(rows);

      if (insertError) throw new Error(insertError.message);
    }
  }

  async function submitApplication() {
    if (!userId) return;
    if (!fullName.trim() || !location || selectedSkills.length === 0) {
      setError("Please fill name, location and at least one skill.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName.trim(),
      location_area: location,
      bio: bio.trim() || null,
      role: "worker",
      verification_status: "pending",
      availability: "available",
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      setLoading(false);
      setError(profileError.message);
      return;
    }

    await supabase.from("worker_skills").delete().eq("worker_id", userId);

    const skillRows = selectedSkills.map((skill) => ({
      worker_id: userId,
      skill,
    }));

    const { error: skillsError } = await supabase
      .from("worker_skills")
      .insert(skillRows);

    if (skillsError) {
      setLoading(false);
      setError(skillsError.message);
      return;
    }

    try {
      if (files.length > 0) {
        await uploadProofMedia(userId);
      }
    } catch (e: any) {
      setLoading(false);
      setError(
        e?.message?.includes("Bucket") || e?.message?.includes("not found")
          ? "Storage bucket missing. Create a public bucket named proof-media in Supabase Storage."
          : e?.message || "Failed to upload proof photos."
      );
      return;
    }

    setLoading(false);
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
            Create an account with your email first, then complete your worker
            application.
          </p>
        </div>
        <Link href="/auth">
          <Button size="lg">Sign in with Email</Button>
        </Link>
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
            Your profile is under review. You can still add more proof photos
            from your Profile page.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/profile">
            <Button>View Profile</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Become a LocalHands Worker</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in your details and add photos of completed work for verification.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-5">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Full name *</label>
          <input
            type="text"
            placeholder="e.g. Lamin Jallow"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Area *</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="">Select your area</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Your skills * (select one or more)
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {SKILLS.map((skill) => {
              const active = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-green-400"
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="Add another skill..."
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSkill();
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomSkill}
              disabled={!customSkill.trim()}
            >
              Add
            </Button>
          </div>

          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedSkills.map((s) => (
                <Badge key={s} variant="success">
                  {s}
                  <button
                    type="button"
                    className="ml-1"
                    onClick={() => toggleSkill(s)}
                    aria-label={`Remove ${s}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            About you (optional)
          </label>
          <textarea
            rows={3}
            placeholder="Years of experience, what you are good at..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Proof of work (photos)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Upload photos of jobs you have completed. Helps admins verify you
            faster. Up to {MAX_FILES} images, max {MAX_SIZE_MB}MB each.
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
            className="w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-2 text-gray-500 hover:border-green-500 hover:text-green-700 transition-colors"
          >
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm font-medium">Tap to add photos</span>
          </button>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Proof ${i + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                  />
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          className="w-full"
          size="lg"
          onClick={submitApplication}
          disabled={
            loading || !fullName.trim() || !location || selectedSkills.length === 0
          }
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </Button>

        <p className="text-xs text-gray-400 text-center">
          After approval you will appear in the public directory.
        </p>
      </div>
    </div>
  );
}
