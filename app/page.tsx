import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, Wrench, MapPin, Users } from "lucide-react";
export default function HomePage() {
  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-b from-green-600 to-green-700 text-white px-4 py-12">
        <div className="max-w-lg mx-auto text-center space-y-6">
          <h1 className="text-3xl font-bold leading-tight">Verified Skills.<br />Real Work.<br />LocalHands.</h1>
          <p className="text-green-100 text-lg">Find trusted skilled workers across The Gambia.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/directory"><Button size="lg" className="w-full sm:w-auto bg-white text-green-700 hover:bg-green-50"><Search className="mr-2 h-5 w-5" />Find a Worker</Button></Link>
            <Link href="/auth"><Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-green-600">I Have Skills</Button></Link>
          </div>
        </div>
      </section>
      <section className="px-4 py-10 max-w-lg mx-auto space-y-6">
        <div className="flex items-start gap-4"><div className="bg-green-100 p-3 rounded-full"><ShieldCheck className="h-6 w-6 text-green-700" /></div><div><h3 className="font-semibold text-lg">Verified Workers</h3><p className="text-sm text-gray-600">Every worker is reviewed with real proof of work.</p></div></div>
        <div className="flex items-start gap-4"><div className="bg-green-100 p-3 rounded-full"><MapPin className="h-6 w-6 text-green-700" /></div><div><h3 className="font-semibold text-lg">Local to You</h3><p className="text-sm text-gray-600">Kololi, Brusubi, Brikama, Basse and more.</p></div></div>
        <div className="flex items-start gap-4"><div className="bg-green-100 p-3 rounded-full"><Wrench className="h-6 w-6 text-green-700" /></div><div><h3 className="font-semibold text-lg">Urban & Rural</h3><p className="text-sm text-gray-600">Phone repair, solar, farm labour, construction...</p></div></div>
      </section>
      <section className="px-4 py-12 max-w-lg mx-auto text-center">
        <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-3">Have a skill?</h2>
        <p className="text-gray-600 mb-6">Join LocalHands and start receiving job requests.</p>
        <Link href="/auth"><Button size="lg">Create Worker Profile</Button></Link>
      </section>
    </div>
  );
}
