import Link from "next/link";
import { Hand } from "lucide-react";
export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-green-700">
          <Hand className="h-6 w-6" />
          <span className="text-lg">LocalHands</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-green-700">Admin</Link>
          <Link href="/auth" className="text-sm font-medium text-green-700 hover:underline">Sign in</Link>
        </div>
      </div>
    </header>
  );
}
