"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bug, CalendarDays, ChevronRight, Loader2, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  currency: string;
  tester_limit: number;
  starts_at: string | null;
  ends_at: string | null;
}

export default function TestingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("testing_campaigns")
        .select("id,title,description,reward_amount,currency,tester_limit,starts_at,ends_at")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setCampaigns((data as Campaign[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <section className="rounded-2xl bg-green-700 text-white p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium opacity-90">
          <Bug className="h-4 w-4" /> LocalHands Testing
        </div>
        <h1 className="text-2xl font-bold">Test real apps. Find real issues. Get rewarded.</h1>
        <p className="text-sm text-green-50">Join remote testing campaigns and help builders improve products used in The Gambia and beyond.</p>
        <div className="flex items-center gap-2 text-xs pt-1"><ShieldCheck className="h-4 w-4" /> No special QA certification required to start.</div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div><h2 className="text-xl font-bold">Open campaigns</h2><p className="text-sm text-gray-500">Pick a campaign that matches your device and experience.</p></div>
        </div>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="h-7 w-7 animate-spin mx-auto text-green-600" /></div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            <Bug className="h-8 w-8 mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No testing campaigns are open yet.</p>
            <p className="text-sm text-gray-500 mt-1">Check back soon for the first LocalHands bug hunt.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/testing/${campaign.id}`} className="block rounded-xl border bg-white p-4 hover:border-green-300 transition-colors">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{campaign.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{campaign.description || "Help us test this product and report issues clearly."}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs text-gray-500">
                  <span className="font-semibold text-green-700">{campaign.currency} {Number(campaign.reward_amount || 0).toLocaleString()} / valid finding</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Up to {campaign.tester_limit} testers</span>
                  {campaign.ends_at && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Ends {new Date(campaign.ends_at).toLocaleDateString("en-GB")}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
