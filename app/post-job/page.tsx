"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
const SKILLS = ["Phone & Electronics Repair", "Solar Installation", "Electrical", "Plumbing", "Delivery & Errands", "Cleaning & Home Help", "Tailoring", "Farm Labour", "Land Clearing", "Construction & Masonry", "General Labour"];
const AREAS = ["Kololi", "Brusubi", "Bijilo", "Senegambia", "Bakau", "Fajara", "Serrekunda", "Kanifing", "Brikama", "Banjul", "Basse", "Other"];
export default function PostJobPage() {
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Post a Job</h1><p className="text-sm text-gray-500">Describe what you need.</p></div>
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div><label className="text-sm font-medium mb-1.5 block">Title</label><input type="text" placeholder="e.g. Fix Samsung screen" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600" /></div>
        <div><label className="text-sm font-medium mb-1.5 block">Skill needed</label><select value={skill} onChange={(e) => setSkill(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600"><option value="">Select skill</option>{SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        <div><label className="text-sm font-medium mb-1.5 block">Location</label><select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600"><option value="">Select area</option>{AREAS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
        <div><label className="text-sm font-medium mb-1.5 block">Description</label><textarea rows={4} placeholder="What needs to be done?" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600 resize-none" /></div>
        <Button className="w-full" disabled={!title || !skill || !location || !description}>Post Job</Button>
      </div>
    </div>
  );
}
