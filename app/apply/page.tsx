"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Hand, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

const SKILLS = [
  "Phone & Electronics Repair",
  "Solar Installation",
  "Electrical",
  "Plumbing",
  "Delivery & Errands",
  "Cleaning & Home Help",
  "Tailoring",
  "Farm Labour",
  "Land Clearing",
  "Construction & Masonry",
  "General Labour",
  "Content Creation",
];

const AREAS = [
  "Kololi",
  "Brusubi",
  "Bijilo",
  "Senegambia",
  "Bakau",
  "Fajara",
  "Serrekunda",
  "Kanifing",
  "Brikama",
  "Banjul",
  "Basse",
  "Other",
];

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

      // Prefill if profile already exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, location_area, bio, role, verification_status")
        .eq("id", user.id)
        .single();

      if (profile) {
        if (profile.full_name) setFullName(profile.full_name);
        if (profile.location_area) setLocation(profile.location_area);
        if (profile.bio) setBio(profile.bio);

        // Already a pending or verified worker
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

  async function submitApplication() {
    if (!userId) return;
    if (!fullName.trim() || !location || selectedSkills.length === 0) {
      setError("Please fill name, location and at least one skill.");
      return;
    }

    setLoading(true);
    setError("");

    // Upsert profile as worker + pending
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

    // Replace skills
    await supabase.from("worker_skills").delete().eq("worker_id", userId);

    const skillRows = selectedSkills.map((skill) => ({
      worker_id: userId,
      skill,
    }));

    const { error: skillsError } = await supabase
      .from("worker_skills")
      .insert(skillRows);

    setLoading(false);

    if (skillsError) {
      setError(skillsError.message);
      return;
    }

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
            Create an account with your phone number first, then complete your
            worker application.
          </p>
        </div>
        <Link href="/auth">
          <Button size="lg">Sign in with Phone</Button>
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
            Your profile is under review. Once an admin verifies you, you will
            appear in the directory and can receive job requests.
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
          Fill in your details. An admin will review and verify your profile.
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
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedSkills.map((s) => (
                <Badge key={s} variant="success">
                  {s}
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
            rows={4}
            placeholder="Years of experience, what you are good at, areas you cover..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
          />
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
