"use client";

import { useEffect, useState, useRef } from "react";
import {
  User,
  LogOut,
  Loader2,
  ImagePlus,
  Camera,
  Pencil,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ProofGallery } from "@/components/image-lightbox";
import { SKILLS, AREAS } from "@/lib/skills";

const MAX_FILES = 6;
const MAX_SIZE_MB = 5;

type ProofItem = {
  id: string;
  media_url: string;
};

function skillsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].map((s) => s.trim()).sort();
  const sb = [...b].map((s) => s.trim()).sort();
  return sa.every((s, i) => s === sb[i]);
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = "/proof-media/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  let path = url.slice(i + marker.length);
  path = path.split("?")[0];
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [locationArea, setLocationArea] = useState<string>("");
  const [whatsappPhone, setWhatsappPhone] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [skills, setSkills] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [proofItems, setProofItems] = useState<ProofItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();
  const nameLocked = status === "verified";
  const isWorker = role === "worker" || role === "admin";
  const proofUrls = proofItems.map((p) => p.media_url);

  async function loadProof(uid: string) {
    const { data } = await supabase
      .from("proof_media")
      .select("id, media_url")
      .eq("worker_id", uid)
      .order("created_at", { ascending: false });

    setProofItems(
      (data || []).map((r: any) => ({
        id: r.id as string,
        media_url: r.media_url as string,
      }))
    );
  }

  async function loadSkills(uid: string) {
    const { data } = await supabase
      .from("worker_skills")
      .select("skill")
      .eq("worker_id", uid);
    setSkills((data || []).map((r: any) => r.skill as string));
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
        .select(
          "full_name, role, verification_status, avatar_url, location_area, whatsapp_phone, bio"
        )
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name);
        setRole(profile.role);
        setStatus(profile.verification_status);
        setAvatarUrl(profile.avatar_url || null);
        setLocationArea(profile.location_area || "");
        setWhatsappPhone(profile.whatsapp_phone || "");
        setBio(profile.bio || "");
        setEditName(profile.full_name || "");
        setEditArea(profile.location_area || "");
        setEditWhatsapp(profile.whatsapp_phone || "");
        setEditBio(profile.bio || "");
      }

      const pendingName = localStorage.getItem("lh_full_name");
      if (
        pendingName &&
        (!profile?.full_name || profile.full_name.trim() === "")
      ) {
        await supabase
          .from("profiles")
          .update({
            full_name: pendingName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        setFullName(pendingName);
        setEditName(pendingName);
        localStorage.removeItem("lh_full_name");
      }

      await loadSkills(user.id);
      await loadProof(user.id);
      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEditor() {
    setEditName(fullName || "");
    setEditArea(locationArea || "");
    setEditWhatsapp(whatsappPhone || "");
    setEditBio(bio || "");
    setEditSkills([...skills]);
    setCustomSkill("");
    setEditing(true);
    setSaveMsg("");
    setSaveError("");
  }

  function toggleSkill(skill: string) {
    setEditSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  }

  function addCustomSkill() {
    const s = customSkill.trim();
    if (!s) return;
    if (!editSkills.includes(s)) {
      setEditSkills((prev) => [...prev, s]);
    }
    setCustomSkill("");
  }

  async function saveProfile() {
    if (!userId) return;

    if (!nameLocked && !editName.trim()) {
      setSaveError("Please enter your name.");
      return;
    }

    if (isWorker && editSkills.length === 0) {
      setSaveError("Select at least one skill.");
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveMsg("");

    const skillsChanged = isWorker && !skillsEqual(skills, editSkills);
    const needsReReview = skillsChanged && status === "verified";

    const updates: Record<string, unknown> = {
      location_area: editArea || null,
      whatsapp_phone: editWhatsapp.trim() || null,
      bio: editBio.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (!nameLocked) {
      updates.full_name = editName.trim();
    }

    if (needsReReview) {
      updates.verification_status = "pending";
      updates.is_verified = false;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      setSaving(false);
      setSaveError(
        error.message.includes("whatsapp")
          ? "Add whatsapp_phone column — run the SQL in Supabase."
          : error.message
      );
      return;
    }

    if (skillsChanged) {
      await supabase.from("worker_skills").delete().eq("worker_id", userId);
      const skillRows = editSkills.map((skill) => ({
        worker_id: userId,
        skill,
      }));
      const { error: skillsError } = await supabase
        .from("worker_skills")
        .insert(skillRows);
      if (skillsError) {
        setSaving(false);
        setSaveError(skillsError.message);
        return;
      }
      setSkills([...editSkills]);
    }

    if (!nameLocked) setFullName(editName.trim());
    setLocationArea(editArea);
    setWhatsappPhone(editWhatsapp.trim());
    setBio(editBio.trim());
    if (needsReReview) setStatus("pending");

    setSaving(false);
    setEditing(false);
    setSaveMsg(
      needsReReview
        ? "Profile saved. Skills changed — your profile is back under review and will not appear in Find until approved again."
        : "Profile updated."
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function deleteProof(url: string) {
    if (!userId) return;
    const item = proofItems.find((p) => p.media_url === url);
    if (!item) return;

    const ok = window.confirm(
      "Remove this proof photo? You can add a new one anytime. Your verified status will not change."
    );
    if (!ok) return;

    setDeletingUrl(url);
    setUploadError("");

    const { error } = await supabase
      .from("proof_media")
      .delete()
      .eq("id", item.id)
      .eq("worker_id", userId);

    if (error) {
      setDeletingUrl(null);
      setUploadError(
        error.message.includes("policy") || error.message.includes("permission")
          ? "Could not delete. Run the proof_media delete policy in Supabase (see chat)."
          : error.message
      );
      return;
    }

    const path = storagePathFromPublicUrl(url);
    if (path) {
      await supabase.storage.from("proof-media").remove([path]);
    }

    setProofItems((prev) => prev.filter((p) => p.id !== item.id));
    setDeletingUrl(null);
  }

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError("");
    setAvatarUploading(true);

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Only images allowed (JPG, PNG, WebP).");
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`Image must be under ${MAX_SIZE_MB}MB.`);
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from("proof-media")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (storageError) throw new Error(`Storage: ${storageError.message}`);

      const {
        data: { publicUrl },
      } = supabase.storage.from("proof-media").getPublicUrl(path);

      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: urlWithBust,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) throw new Error(`Profile: ${updateError.message}`);

      setAvatarUrl(urlWithBust);
    } catch (err: any) {
      setAvatarError(err?.message || "Avatar upload failed");
    }

    setAvatarUploading(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    setUploading(true);
    setUploadError("");

    try {
      let count = proofItems.length;

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

        const { error: uploadErr } = await supabase.storage
          .from("proof-media")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadErr) throw new Error(uploadErr.message);

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
      setUploadError(err?.message || "Upload failed");
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
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover border"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl">
                {(fullName || email)[0].toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center shadow border-2 border-white"
              title="Change photo"
            >
              {avatarUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarSelected}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{fullName || "No name set"}</p>
            <p className="text-sm text-gray-500">{email}</p>
            {locationArea && (
              <p className="text-xs text-gray-400 mt-0.5">{locationArea}</p>
            )}
            {whatsappPhone && (
              <p className="text-xs text-green-700 mt-0.5">WA: {whatsappPhone}</p>
            )}
            {!editing && (
              <button
                type="button"
                className="text-xs text-green-700 mt-1 hover:underline inline-flex items-center gap-1"
                onClick={openEditor}
              >
                <Pencil className="h-3 w-3" />
                {isWorker
                  ? "Edit profile, bio & skills"
                  : "Edit name, area & WhatsApp"}
              </button>
            )}
          </div>
        </div>

        {avatarError && <p className="text-sm text-red-600">{avatarError}</p>}

        {!editing && bio && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">About</p>
            <p className="leading-relaxed whitespace-pre-wrap">{bio}</p>
          </div>
        )}

        {!editing && isWorker && skills.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {editing && (
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
            <div>
              <label className="text-xs font-medium mb-1 block">Full name *</label>
              {nameLocked ? (
                <>
                  <input
                    type="text"
                    value={fullName || ""}
                    disabled
                    className="w-full px-3 py-2 rounded-lg border bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Name is locked after verification. Contact admin to change
                    it.
                  </p>
                </>
              ) : (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Area</label>
              <select
                value={editArea}
                onChange={(e) => setEditArea(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="">Select area</option>
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">
                WhatsApp number
              </label>
              <input
                type="tel"
                value={editWhatsapp}
                onChange={(e) => setEditWhatsapp(e.target.value)}
                placeholder="e.g. 2207XXXXXXX or 7XXXXXXX"
                className="w-full px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Shared only after a job is accepted — not on public profiles.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">About you</label>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder={
                  isWorker
                    ? "e.g. Founder of LocalHands. Web, design, digital setup for small businesses..."
                    : "Optional short intro"
                }
                className="w-full px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
              />
            </div>

            {isWorker && (
              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  Skills * (select one or more)
                </label>
                {status === "verified" && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1.5 mb-2">
                    Changing skills will remove you from Find until admin
                    approves again.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map((skill) => {
                    const active = editSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
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
                <div className="flex gap-2 mt-2">
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
                    className="flex-1 px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomSkill}
                  >
                    Add
                  </Button>
                </div>
                {editSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editSkills.map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" /> Save
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {saveMsg && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg p-2">
            {saveMsg}
          </p>
        )}

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

        {role !== "worker" && role !== "admin" && (
          <Link href="/apply">
            <Button className="w-full">Apply as Worker</Button>
          </Link>
        )}

        {role === "worker" && status === "pending" && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            Your worker application is pending review. You will not appear in
            Find until approved.
          </p>
        )}

        {role === "worker" && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Proof of work</h3>
              <span className="text-xs text-gray-400">
                {proofItems.length}/{MAX_FILES}
              </span>
            </div>

            <ProofGallery
              urls={proofUrls}
              emptyLabel="No proof photos yet — add screenshots of your work."
              onDelete={deleteProof}
              deletingUrl={deletingUrl}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFilesSelected}
            />

            {proofItems.length < MAX_FILES && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={uploading || !!deletingUrl}
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

        <p className="text-center text-xs text-gray-400 pt-2">
          <Link href="/terms" className="hover:text-green-700">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-green-700">
            Privacy Policy
          </Link>
        </p>

        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
