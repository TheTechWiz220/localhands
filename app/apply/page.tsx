"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Hand, CheckCircle2, Loader2, ImagePlus, X } from "lucide-react";
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
  const [bio, setBio] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const list = e.target.files;
    if (!list) return;
    const next: File[] = [...files];
    const nextPreviews: string[] = [...previews];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (!f.type.startsWith("image/")) {
        setError("Only images are allowed for now (JPG, PNG, WebP).");
        continue;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Each image must be under ${MAX_SIZE_MB}MB.`);
        continue;
      }
      if (next.length >= MAX_FILES) break;
      next.push(f);
      nextPreviews.push(URL.createObjectURL(f));
    }
    setFiles(next);
    setPreviews(nextPreviews);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadProofMedia(userId: string) {
    const uploaded: { media_url: string; media_type: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}-${i}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("proof-media")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("proof-media").getPublicUrl(path);

      uploaded.push({ media_url: publicUrl, media_type: "image" });
    }

    if (uploaded.length === 0) return;

    const rows = uploaded.map((u) => ({
      worker_id: userId,
      media_url: u.media_url,
      media_type: u.media_type,
    }));

    const { error: insertError } = await supabase
      .from("proof_media")
      .insert(rows);

    if (insertError) throw new Error(insertError.message);
  }

  async function submitApplication() {
    if (!confirmAdult) {
      setError("You must confirm that you are 18 years or older.");
      return;
    }
    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName.trim(),
      location_area: location,
      bio: bio.trim() || null,
      role: "worker",
      verification_status: "pending",
      is_verified: false,
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
            from Profile. We check ID in person before approval so clients can
            trust the directory.
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
        <h1 className="text-2xl font-bold">Become a LocalHands worker</h1>
        <p className="text-sm text-gray-500 mt-1">
          Show your skills and proof of work. After ID check in person, you
          appear in the directory for clients across The Gambia.
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
          <label className="text-sm font-medium mb-1.5 block">Your area *</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="">Where do you mainly work?</option>
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
            <Button type="button" variant="outline" onClick={addCustomSkill}>
              Add
            </Button>
          </div>

          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedSkills.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">About you</label>
          <textarea
            rows={3}
            placeholder="e.g. 5 years phone repair in Serrekunda. Available weekdays..."
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
            Photos of jobs you have finished help us verify you faster. Up to{" "}
            {MAX_FILES} images, max {MAX_SIZE_MB}MB each.
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
            <span className="text-sm">Tap to add photos</span>
          </button>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Preview ${i + 1}`}
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

        <label className="flex items-start gap-3 rounded-lg border bg-gray-50 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmAdult}
            onChange={(e) => setConfirmAdult(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
          />
          <span className="text-sm text-gray-700">
            I confirm that I am <strong>18 years or older</strong>. LocalHands
            will review my national ID in person before approval.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          className="w-full"
          size="lg"
          onClick={submitApplication}
          disabled={
            loading ||
            !fullName.trim() ||
            !location ||
            selectedSkills.length === 0 ||
            !confirmAdult
          }
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
