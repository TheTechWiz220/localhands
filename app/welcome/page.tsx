import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Search,
  ShieldCheck,
  Star,
  HandCoins,
  MapPin,
  ClipboardList,
  Users,
  Wrench,
  Briefcase,
  Building2,
} from "lucide-react";

export const metadata = {
  title: "LocalHands | Verified skilled workers in The Gambia",
  description:
    "Find and hire verified skilled workers. Clear pricing, ratings, and trusted local work. App Store and Google Play coming soon.",
};

function StoreButton({
  label,
  sub,
}: {
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      disabled
      className="flex items-center gap-3 rounded-xl bg-gray-900 text-white px-4 py-3 w-full sm:w-auto min-w-[200px] opacity-90 cursor-not-allowed"
    >
      <span className="text-2xl leading-none" aria-hidden>
        {label.includes("App") ? "" : ""}
      </span>
      <span className="text-left">
        <span className="block text-[10px] uppercase tracking-wide text-gray-300">
          {sub}
        </span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-[10px] text-amber-300 mt-0.5">
          Coming soon
        </span>
      </span>
    </button>
  );
}

export default function WelcomePage() {
  return (
    <div className="flex flex-col pb-10">
      <section className="bg-gradient-to-b from-green-600 to-green-700 text-white px-4 py-12">
        <div className="max-w-lg mx-auto text-center space-y-5">
          <p className="text-green-100 text-sm font-medium tracking-wide">
            A product of The Techwiz
          </p>
          <h1 className="text-3xl font-bold leading-tight">
            Verified skilled workers
            <br />
            in The Gambia
          </h1>
          <p className="text-green-50 text-base leading-relaxed">
            LocalHands connects clients with verified trades and skills — clear
            pricing, ratings, and a structured way to get work done.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-black text-white px-5 py-3 opacity-95 cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden>
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 2.89 1.98-.07.05-1.73 1.01-1.71 3.02.03 2.4 2.11 3.2 2.14 3.21-.02.06-.33 1.14-.99 2.25zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <span className="text-left">
                <span className="block text-[10px] text-gray-300">Download on the</span>
                <span className="block text-sm font-semibold leading-tight">App Store</span>
                <span className="block text-[10px] text-amber-300">Coming soon</span>
              </span>
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-black text-white px-5 py-3 opacity-95 cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
                <path fill="#ea4335" d="M3.6 2.4l9.5 9.5-2.1 2.1L1.6 4.6c.4-.9 1.2-1.5 2-1.5.0 0 .0 0 0 0z" />
                <path fill="#fbbc04" d="M1.6 19.4l9.4-9.4 2.1 2.1-9.5 9.5c-.8 0-1.6-.6-2-1.5z" />
                <path fill="#4285f4" d="M20.5 10.3l-3.2-1.8-2.8 2.8 2.8 2.8 3.2-1.8c.9-.5.9-1.5 0-2z" />
                <path fill="#34a853" d="M13.1 11.9L3.6 21.4c-.1 0-.2.0-.3.0L13.1 11.9z" />
                <path fill="#34a853" d="M13.1 11.9L3.3 2.2c.1 0 .2 0 .3 0l9.5 9.7z" />
              </svg>
              <span className="text-left">
                <span className="block text-[10px] text-gray-300">Get it on</span>
                <span className="block text-sm font-semibold leading-tight">Google Play</span>
                <span className="block text-[10px] text-amber-300">Coming soon</span>
              </span>
            </button>
          </div>

          <p className="text-green-100 text-xs pt-1">
            Available now on the web · Install to your phone home screen
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
            <Link href="/">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-green-700 hover:bg-green-50"
              >
                Open LocalHands
              </Button>
            </Link>
            <Link href="/directory">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white text-white hover:bg-green-600 bg-transparent"
              >
                <Search className="mr-2 h-5 w-5" />
                Find a Worker
              </Button>
            </Link>
          </div>
          <p className="text-green-100/90 text-xs">
            Built in The Gambia · Empowering Your Digital Potential
          </p>
        </div>
      </section>

      <section className="px-4 py-8 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              icon: ShieldCheck,
              title: "Verified",
              text: "Workers reviewed before they appear",
            },
            {
              icon: Star,
              title: "Rated",
              text: "Mutual ratings after each job",
            },
            {
              icon: HandCoins,
              title: "Clear fees",
              text: "Net pay shown before accept",
            },
            {
              icon: MapPin,
              title: "Local",
              text: "Greater Banjul and beyond",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-xl border bg-white p-3.5 space-y-1"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-green-700" />
                <span className="font-semibold text-sm">{title}</span>
              </div>
              <p className="text-xs text-gray-500 leading-snug">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-6 max-w-lg mx-auto w-full space-y-4">
        <h2 className="text-xl font-bold text-center">How it works</h2>
        <div className="space-y-3">
          {[
            {
              step: "1",
              title: "Find or post",
              text: "Browse verified workers or post an open job with your budget and area.",
            },
            {
              step: "2",
              title: "Agree in-app",
              text: "Request, counter, or claim. Price and platform fee stay transparent.",
            },
            {
              step: "3",
              title: "Complete & rate",
              text: "Track payment, mark the job done, and leave a rating both ways.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="flex gap-3 rounded-xl border bg-white p-4"
            >
              <div className="h-8 w-8 shrink-0 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                {s.step}
              </div>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-gray-600 mt-0.5">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-8 max-w-lg mx-auto w-full space-y-3">
        <h2 className="text-xl font-bold text-center mb-2">Who it's for</h2>
        <div className="rounded-xl border bg-white p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-700">
            <Building2 className="h-5 w-5" />
            <h3 className="font-semibold">Clients & businesses</h3>
          </div>
          <p className="text-sm text-gray-600">
            Need a repair, install, design, or extra hands? Find verified people,
            agree the price, and hire with more trust than a random WhatsApp
            forward.
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-700">
            <Briefcase className="h-5 w-5" />
            <h3 className="font-semibold">Skilled workers</h3>
          </div>
          <p className="text-sm text-gray-600">
            Build a verified profile, show proof of work, claim open jobs, and
            collect ratings that travel with you.
          </p>
        </div>
      </section>

      <section className="px-4 py-6 max-w-lg mx-auto w-full">
        <div className="rounded-xl bg-green-50 border border-green-100 p-5 text-center space-y-3">
          <Wrench className="h-8 w-8 text-green-700 mx-auto" />
          <h2 className="font-bold text-lg">Skills we support</h2>
          <p className="text-sm text-gray-600">
            Phone & electronics repair · solar · construction · electrical ·
            design & content · IT install · and more as we grow.
          </p>
        </div>
      </section>

      <section className="px-4 py-8 max-w-lg mx-auto text-center space-y-4">
        <Users className="h-10 w-10 text-green-600 mx-auto" />
        <h2 className="text-2xl font-bold">Use it on the web today</h2>
        <p className="text-gray-600 text-sm">
          App Store and Google Play listings are coming soon. Until then, open
          LocalHands in your browser and install it to your home screen.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              Open the app
            </Button>
          </Link>
          <Link href="/auth">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Create account
            </Button>
          </Link>
        </div>
      </section>

      <footer className="px-4 pt-4 pb-2 max-w-lg mx-auto w-full border-t text-center space-y-1">
        <p className="text-sm font-medium text-gray-800">LocalHands</p>
        <p className="text-xs text-gray-500">
          A product of The Techwiz · Empowering Your Digital Potential
        </p>
        <p className="text-xs text-gray-400 space-x-2">
          <a
            href="mailto:thetechwiz220@gmail.com"
            className="hover:text-green-700"
          >
            thetechwiz220@gmail.com
          </a>
          <span>·</span>
          <Link href="/terms" className="hover:text-green-700">
            Terms
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-green-700">
            Privacy Policy
          </Link>
        </p>
      </footer>
    </div>
  );
}
