import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Search,
  ClipboardList,
  Briefcase,
  UserPlus,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">LocalHands</h1>
        <p className="text-sm text-gray-500">
          Verified skilled workers in The Gambia
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/directory"
          className="rounded-xl border bg-white p-4 space-y-2 hover:border-green-300 transition"
        >
          <Search className="h-6 w-6 text-green-700" />
          <p className="font-semibold text-sm">Find a worker</p>
          <p className="text-xs text-gray-500">Browse verified skills</p>
        </Link>
        <Link
          href="/post-job"
          className="rounded-xl border bg-white p-4 space-y-2 hover:border-green-300 transition"
        >
          <ClipboardList className="h-6 w-6 text-green-700" />
          <p className="font-semibold text-sm">Post a job</p>
          <p className="text-xs text-gray-500">Open job for workers</p>
        </Link>
        <Link
          href="/jobs"
          className="rounded-xl border bg-white p-4 space-y-2 hover:border-green-300 transition"
        >
          <Briefcase className="h-6 w-6 text-green-700" />
          <p className="font-semibold text-sm">My jobs</p>
          <p className="text-xs text-gray-500">Requests & claims</p>
        </Link>
        <Link
          href="/apply"
          className="rounded-xl border bg-white p-4 space-y-2 hover:border-green-300 transition"
        >
          <UserPlus className="h-6 w-6 text-green-700" />
          <p className="font-semibold text-sm">Apply as worker</p>
          <p className="text-xs text-gray-500">Get verified</p>
        </Link>
      </div>

      <div className="rounded-xl border border-green-100 bg-green-50 p-4 flex gap-3">
        <ShieldCheck className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-green-900">
            Workers are reviewed before they appear
          </p>
          <p className="text-xs text-green-800/80">
            Clear fees, ratings, and ID checks where required.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Link href="/auth" className="flex-1">
          <Button className="w-full">Sign in / Create account</Button>
        </Link>
        <Link href="/directory" className="flex-1">
          <Button variant="outline" className="w-full">
            Browse directory
          </Button>
        </Link>
      </div>

      <p className="text-center text-xs text-gray-400">
        <Link
          href="/welcome"
          className="inline-flex items-center gap-1 hover:text-green-700"
        >
          About LocalHands & app stores
          <ExternalLink className="h-3 w-3" />
        </Link>
        {" · "}
        <Link href="/privacy" className="hover:text-green-700">
          Privacy
        </Link>
      </p>
    </div>
  );
}
