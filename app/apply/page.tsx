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

  // TEMP RESTORE - full eager version will follow in next commit
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
      <p className="text-gray-500">Updating form — please wait a moment and refresh.</p>
    </div>
  );
}
