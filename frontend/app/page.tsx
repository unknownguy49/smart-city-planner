
"use client";

import Link from "next/link";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { LuBuilding2 } from "react-icons/lu";

const features = [
  {
    number: "01",
    title: "AI Multi-Agent Planning",
    description:
      "Get planning insights from specialized architecture, civil engineering, sustainability, municipal, and citizen-focused agents.",
  },
  {
    number: "02",
    title: "Intelligent Site Analysis",
    description:
      "Select a land parcel and evaluate its area, surrounding infrastructure, site context, and planning constraints.",
  },
  {
    number: "03",
    title: "Regulation-Aware Planning",
    description:
      "Use relevant municipal rules and planning constraints to help assess the feasibility of proposed layouts.",
  },
  {
    number: "04",
    title: "Conceptual Floor Plans",
    description:
      "Explore space allocation, floor layouts, building configurations, and alternative planning scenarios.",
  },
  {
    number: "05",
    title: "Sustainability Assessment",
    description:
      "Evaluate environmental considerations, accessibility, infrastructure needs, and sustainable development options.",
  },
  {
    number: "06",
    title: "Saved Projects & Reports",
    description:
      "Keep your projects, analyses, designs, scenarios, and reports together for later review.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)] transition-colors">
      {/* Navigation */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <nav className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <Link href="/" aria-label="Smart City Planner home" className="flex min-w-0 shrink items-center gap-2.5 sm:gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.22)",
              }}
            >
              <LuBuilding2 size={20} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[13px] font-bold leading-5 tracking-tight text-[var(--text-primary)] sm:text-sm">
                Smart City
              </span>
              <span className="text-xs font-medium leading-4 text-[var(--text-secondary)] sm:text-[13px] sm:leading-5">
                Planner
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <ThemeToggle />

            <Link
              href="/login"
              className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:px-4 sm:text-sm"
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-4 sm:text-sm"
            >
              <span className="sm:hidden">Sign up</span>
              <span className="hidden sm:inline">Get started</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero section */}
      <section className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute left-0 top-10 -z-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl sm:h-72 sm:w-72" />

        <div className="relative">
          <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/10 px-3.5 py-2 text-xs text-blue-400 sm:mb-6 sm:px-4 sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            AI-powered urban planning
          </div>

          <h1 className="max-w-[13ch] text-[clamp(2.5rem,8vw,4.5rem)] font-black leading-[1.06] tracking-tight">
            Plan smarter.
            <span className="block text-blue-500">Build sustainably.</span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-7 text-[var(--text-secondary)] sm:mt-6 sm:text-lg sm:leading-8">
            Turn land parcels into informed planning decisions. Smart City
            Planner combines multi-agent AI, geospatial context, municipal
            regulations, and conceptual design tools in one workspace.
          </p>

          <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row sm:mt-9 sm:gap-4">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-6"
            >
              Start planning →
            </Link>

            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:px-6"
            >
              Sign in to workspace
            </Link>
          </div>

          <p className="mt-4 max-w-xl text-[11px] leading-5 text-[var(--text-muted)] sm:mt-5 sm:text-xs sm:leading-6">
            AI-generated recommendations support planning decisions and require
            appropriate professional and regulatory verification.
          </p>
        </div>

        {/* Planning preview */}
        <div className="relative">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl shadow-blue-950/15 sm:rounded-3xl sm:p-6 lg:p-7">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Planning Intelligence
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Conceptual project preview
                </p>
              </div>

              <span className="rounded-full bg-blue-600/10 px-3 py-1 text-xs text-blue-400">
                AI-assisted
              </span>
            </div>

            <div className="my-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:my-6">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3.5 sm:rounded-2xl sm:p-4">
                <p className="text-xs text-[var(--text-muted)]">
                  Site context
                </p>
                <p className="mt-2 text-base font-bold sm:text-lg">Geospatial</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Land and surroundings
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3.5 sm:rounded-2xl sm:p-4">
                <p className="text-xs text-[var(--text-muted)]">
                  Planning approach
                </p>
                <p className="mt-2 text-base font-bold sm:text-lg">Multi-agent</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Multiple perspectives
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3.5 sm:rounded-2xl sm:p-4">
              <p className="mb-4 text-sm font-semibold">
                Planning workflow
              </p>

              {[
                ["01", "Site & land analysis"],
                ["02", "Regulations & constraints"],
                ["03", "AI planning assessment"],
                ["04", "Layouts & alternatives"],
              ].map(([number, title], index) => (
                <div
                  key={number}
                  className="flex min-w-0 items-center gap-2.5 py-2 sm:gap-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-xs font-bold text-blue-400">
                    {number}
                  </span>

                  <span className="min-w-0 text-xs text-[var(--text-secondary)] sm:text-sm">
                    {title}
                  </span>

                  {index < 3 && (
                    <span className="ml-auto text-xs text-[var(--text-muted)]">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-[var(--border)] bg-[var(--surface-secondary)]"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-500">
              Platform features
            </p>

            <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              Everything you need to explore a planning proposal
            </h2>

            <p className="mt-4 leading-7 text-[var(--text-muted)]">
              A connected workflow from site selection and analysis to
              conceptual layouts, scenarios, and reports.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-blue-500/40 sm:rounded-2xl sm:p-6"
              >
                <p className="text-sm font-bold text-blue-500">
                  {feature.number}
                </p>

                <h3 className="mt-4 text-lg font-bold">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
          Ready to plan your next project?
        </h2>

        <p className="mx-auto mt-4 max-w-xl leading-7 text-[var(--text-muted)]">
          Create an account to access your planning workspace and keep your
          project work organized.
        </p>

        <Link
          href="/signup"
          className="mt-8 inline-flex rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white hover:bg-blue-700"
        >
          Create your account →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-4 py-5 text-center text-xs leading-5 text-[var(--text-muted)] sm:px-6 sm:py-6 sm:text-sm">
        Smart City Planner · AI-assisted urban planning
      </footer>
    </main>
  );
}
