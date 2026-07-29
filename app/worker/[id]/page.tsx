import { MapPin, Star, ShieldCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { workers } from "@/lib/data";
export default async function WorkerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const worker = workers.find((w) => w.id === id) || workers[0];
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex gap-4 items-start">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-2xl">{worker.full_name[0]}</div>
        <div>
          <div className="flex items-center gap-2 flex-wrap"><h1 className="text-xl font-bold">{worker.full_name}</h1><Badge variant="success"><ShieldCheck className="h-3.5 w-3.5 mr-1 inline" />Verified</Badge></div>
          <div className="flex items-center gap-1 text-gray-500 mt-1"><MapPin className="h-4 w-4" />{worker.location_area}</div>
          <div className="flex items-center gap-3 mt-2 text-sm"><span className="flex items-center gap-1 text-amber-600 font-medium"><Star className="h-4 w-4 fill-current" />{worker.rating}</span><span className="text-gray-500">{worker.jobs_done} jobs completed</span></div>
        </div>
      </div>
      <div className="flex gap-3"><Button className="flex-1">Request this person</Button><Button variant="outline" size="icon"><MessageCircle className="h-5 w-5" /></Button></div>
      <div className="rounded-xl border bg-white p-4"><h3 className="font-semibold mb-2">About</h3><p className="text-sm text-gray-600">{worker.bio}</p></div>
      <div className="rounded-xl border bg-white p-4"><h3 className="font-semibold mb-2">Skills</h3><div className="flex flex-wrap gap-2">{worker.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div></div>
      <div className="rounded-xl border bg-white p-4"><h3 className="font-semibold mb-2">Proof of Work</h3>
        <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map((i) => <div key={i} className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">Photo {i}</div>)}</div>
        <p className="text-xs text-gray-400 mt-2">Workers upload photos of completed jobs here.</p></div>
      <div className="rounded-xl border bg-white p-4"><h3 className="font-semibold mb-3">Recent Ratings</h3>
        <div className="space-y-3 text-sm">
          <div className="border-b pb-3"><div className="flex text-amber-600"><Star className="h-3.5 w-3.5 fill-current" /><Star className="h-3.5 w-3.5 fill-current" /><Star className="h-3.5 w-3.5 fill-current" /><Star className="h-3.5 w-3.5 fill-current" /><Star className="h-3.5 w-3.5 fill-current" /></div>
            <p className="mt-1">Fixed my phone screen the same day. Very professional.</p><p className="text-xs text-gray-400 mt-1">— Client in Kololi</p></div>
          <div><div className="flex text-amber-600"><Star className="h-3.5 w-3.5 fill-current" /><Star className="h-3.5 w-3.5 fill-current" /><Star className="h-3.5 w-3.5 fill-current" /><Star className="h-3.5 w-3.5 fill-current" /><Star className="h-3.5 w-3.5" /></div>
            <p className="mt-1">Good solar installation work.</p><p className="text-xs text-gray-400 mt-1">— Client in Brusubi</p></div>
        </div></div>
    </div>
  );
}
