import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function ProfilePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Profile</h1><p className="text-sm text-gray-500">Manage your LocalHands account</p></div>
      <div className="rounded-xl border bg-white py-10 text-center">
        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><User className="h-8 w-8 text-gray-400" /></div>
        <h3 className="font-semibold text-lg">Not signed in</h3>
        <p className="text-sm text-gray-500 mt-1 mb-6">Sign in to create or edit your profile.</p>
        <Link href="/auth"><Button>Sign in with Phone</Button></Link>
      </div>
    </div>
  );
}
