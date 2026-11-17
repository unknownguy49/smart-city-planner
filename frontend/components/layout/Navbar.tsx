"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuBot,
  LuFolder,
  LuHouse,
  LuMap,
  LuMenu,
  LuPlus,
} from "react-icons/lu";

const mobileItems=[
  {name:"Overview",href:"/dashboard",icon:LuHouse},
  {name:"Projects",href:"/projects",icon:LuFolder},
  {name:"Sites",href:"/map",icon:LuMap},
  {name:"AI",href:"/planner",icon:LuBot},
];

export default function Navbar({ onMenuClick }: { onMenuClick:()=>void }) {
  const pathname=usePathname();

  return (
    <>
      <header
        className="
          sticky
          top-0
          z-[2000]
          flex
          h-16
          shrink-0
          items-center
          justify-between
          border-b
          px-5
          sm:px-6
          lg:px-7
        "
        style={{
          backgroundColor:"var(--surface)",
          borderColor:"var(--border)",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            aria-controls="app-sidebar"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors hover:bg-[var(--surface-hover)] lg:hidden"
            style={{borderColor:"var(--border)",color:"var(--text-primary)"}}
          >
            <LuMenu size={21} />
          </button>
          <Link href="/dashboard" className="min-w-0 rounded-lg focus-visible:outline-none">
            <span className="truncate text-sm font-semibold tracking-tight" style={{color:"var(--text-primary)"}}>
              Smart City Planner
            </span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/dashboard"
            className="
              inline-flex
              h-9
              items-center
              justify-center
              rounded-lg
              border
              px-3.5
              text-sm
              font-medium
              transition-colors
              duration-150
              hover:bg-[var(--surface-hover)]
              max-lg:hidden
            "
            style={{
              borderColor:"var(--border)",
              color:"var(--text-secondary)",
              backgroundColor:"var(--surface)",
            }}
          >
            Dashboard
          </Link>

          <Link
            href="/projects/new"
            className="
              inline-flex
              h-9
              items-center
              gap-2
              rounded-lg
              px-3.5
              text-sm
              font-semibold
              transition-colors
              duration-150
              hover:bg-[var(--primary-hover)]
            "
            style={{
              backgroundColor:"var(--primary)",
              color:"var(--primary-foreground)",
            }}
          >
            <LuPlus size={16} strokeWidth={2} aria-hidden="true" />
            <span className="max-sm:hidden">New Project</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </header>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-[2000] grid grid-cols-4 border-t px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 lg:hidden"
        style={{
          backgroundColor:"var(--surface)",
          borderColor:"var(--border)",
        }}
      >
        {mobileItems.map(item=>{
          const active=item.href==="/dashboard"
            ? pathname==="/dashboard"
            : pathname===item.href || pathname.startsWith(item.href+"/");
          const Icon=item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active?"page":undefined}
              className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors"
              style={{color:active?"var(--primary)":"var(--text-muted)"}}
            >
              <Icon size={19} strokeWidth={active?2.2:1.8} aria-hidden="true" />
              <span className="max-w-full truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
