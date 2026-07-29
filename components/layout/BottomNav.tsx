"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";
const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/directory", label: "Find", icon: Search },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: User },
];
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
      <div className="max-w-lg mx-auto flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-0.5 px-3 py-1 text-xs", isActive ? "text-green-700 font-semibold" : "text-gray-500")}>
              <Icon className="h-5 w-5" /><span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
