import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Search,
  ShieldCheck,
  Wrench,
  MapPin,
  Users,
  ClipboardList,
  HandCoins,
  Star,
  Briefcase,
  Building2,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col pb-8">
      {/* Hero */}
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
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <Link href="/directory">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-green-700 hover:bg-green-50"
              >
                <Search className="mr-2 h-5 w-5" />
                Find a Worker
              </Button>
            </Link>
            <Link href="/post-job">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white text-white hover:bg-green-600 bg-transparent"
              >
                <ClipboardList className="mr-2 h-5 w-5" />
                Post a Job
              </Button>
            </Link>
          </div>
          <p className="text-green-100/90 text-xs pt-1">
            Built in The Gambia · Empowering Your Digital Potential
          </p>
        </div>
      </section>

      {/* Trust strip */}
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

      {/* How it works */}
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

      {/* For clients / workers */}
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
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/directory">
              <Button size="sm">Find a Worker</Button>
            </Link>
            <Link href="/post-job">
              <Button size="sm" variant="outline">
                Post a Job
              </Button>
            </Link>
            <Link href="/auth">
              <Button size="sm" variant="ghost">
                Sign in
              </Button>
            </Link>
          </div>
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
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/apply">
              <Button size="sm">Apply as Worker</Button>
            </Link>
            <Link href="/auth">
              <Button size="sm" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Skills examples */}
      <section className="px-4 py-6 max-w-lg mx-auto w-full">
        <div className="rounded-xl bg-green-50 border border-green-100 p-5 text-center space-y-3">
          <Wrench className="h-8 w-8 text-green-700 mx-auto" />
          <h2 className="font-bold text-lg">Skills we support</h2>
          <p className="text-sm text-gray-600">
            Phone & electronics repair · solar · construction · electrical ·
            design & content · IT install · and more as we grow.
          </p>
          <Link href="/directory">
            <Button variant="outline" size="sm" className="mt-1">
              <Search className="mr-1.5 h-4 w-4" />
              Browse directory
            </Button>
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-10 max-w-lg mx-auto text-center space-y-4">
        <Users className="h-10 w-10 text-green-600 mx-auto" />
        <h2 className="text-2xl font-bold">Ready to start?</h2>
        <p className="text-gray-600 text-sm">
          Create an account, find a worker, or apply to get verified.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth">
            <Button size="lg" className="w-full sm:w-auto">
              Create account / Sign in
            </Button>
          </Link>
          <Link href="/directory">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Find a Worker
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 pt-4 pb-2 max-w-lg mx-auto w-full border-t text-center space-y-1">
        <p className="text-sm font-medium text-gray-800">LocalHands</p>
        <p className="text-xs text-gray-500">
          A product of The Techwiz · Empowering Your Digital Potential
        </p>
        <p className="text-xs text-gray-400">
          <a
            href="mailto:thetechwiz220@gmail.com"
            className="hover:text-green-700"
          >
            thetechwiz220@gmail.com
          </a>
        </p>
      </footer>
    </div>
  );
}
