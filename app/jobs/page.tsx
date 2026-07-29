import { Briefcase, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function JobsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">My Jobs</h1><p className="text-sm text-gray-500">Requests and history</p></div>
        <Link href="/post-job"><Button size="sm"><Plus className="h-4 w-4 mr-1" />Post Job</Button></Link>
      </div>
      <div className="rounded-xl border bg-white py-12 text-center">
        <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="font-semibold text-lg">No jobs yet</h3>
        <p className="text-sm text-gray-500 mt-1 mb-6">When you request a worker or post a job, they will appear here.</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/directory"><Button variant="outline">Find a Worker</Button></Link>
          <Link href="/post-job"><Button>Post a Job</Button></Link>
        </div>
      </div>
    </div>
  );
}
