"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuBot,
  LuBuilding2,
  LuChartBar,
  LuFileText,
  LuFolder,
  LuHouse,
  LuMap,
  LuSettings,
} from "react-icons/lu";

import ThemeToggle from "../theme/ThemeToggle";

import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { LuLogOut, LuUserRound } from "react-icons/lu";
import { useAuth } from "@/contexts/AuthContext";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
}

const workspaceItems: MenuItem[] = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LuHouse,
  },
  {
    name: "Projects",
    href: "/projects",
    icon: LuFolder,
  },
  {
    name: "Site Planning",
    href: "/map",
    icon: LuMap,
  },
  {
    name: "AI Analysis",
    href: "/planner",
    icon: LuBot,
  },
];

const outputItems: MenuItem[] = [
  {
    name: "Reports",
    href: "/reports",
    icon: LuFileText,
  },
];

const systemItems: MenuItem[] = [
  {
    name: "Settings",
    href: "/settings",
    icon: LuSettings,
  },
];

function isItemActive(
  pathname: string,
  href: string
) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function Sidebar({ open,onClose }: { open:boolean;onClose:()=>void }) {
  const pathname = usePathname();

  const router = useRouter();
const { user, signOut } = useAuth();
const [loggingOut, setLoggingOut] = useState(false);

async function handleLogout() {
  if (loggingOut) return;

  setLoggingOut(true);

  try {
    await signOut();

    // Use a full navigation so the public homepage loads
    // after Firebase has completed signing out.
    window.location.replace("/");
  } catch (error) {
    console.error("Logout failed:", error);
    setLoggingOut(false);
  }
}

const displayName = user?.displayName || user?.email || "User";

  useEffect(()=>{
    onClose();
  },[pathname]);

  useEffect(()=>{
    if(!open) return;
    const previous=document.body.style.overflow;
    const handleKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape") onClose();
    };
    document.body.style.overflow="hidden";
    window.addEventListener("keydown",handleKeyDown);
    return ()=>{
      document.body.style.overflow=previous;
      window.removeEventListener("keydown",handleKeyDown);
    };
  },[open,onClose]);

  const renderMenuItem = (
    item: MenuItem
  ) => {
    const active = isItemActive(
      pathname,
      item.href
    );

    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        aria-current={
          active ? "page" : undefined
        }
        className="
          group
          relative
          flex
          min-h-11
          items-center
          gap-3
          rounded-xl
          px-3.5
          text-sm
          font-medium
          transition-all
          duration-150
        "
        style={{
          backgroundColor: active
            ? "var(--primary)"
            : "transparent",
          color: active
            ? "var(--primary-foreground)"
            : "var(--text-secondary)",
          boxShadow: active
            ? "0 4px 12px rgba(37, 99, 235, 0.20)"
            : "none",
        }}
      >
        <Icon
          size={18}
          strokeWidth={
            active ? 2 : 1.8
          }
          className="
            shrink-0
            transition-transform
            duration-150
            group-hover:scale-105
          "
          aria-hidden="true"
        />

        <span className="truncate">
          {item.name}
        </span>
      </Link>
    );
  };

  const renderSection = (
    title: string,
    items: MenuItem[],
    marginTop = ""
  ) => {
    return (
      <div className={marginTop}>
        <p
          className="
            mb-2
            px-3
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.14em]
          "
          style={{
            color: "var(--text-muted)",
          }}
        >
          {title}
        </p>

        <div className="space-y-1">
          {items.map(renderMenuItem)}
        </div>
      </div>
    );
  };

  return (
    <>
    <button
      type="button"
      aria-label="Close navigation"
      onClick={onClose}
      className={`fixed inset-0 z-[2100] bg-black/55 transition-opacity duration-200 lg:hidden ${open?"opacity-100":"pointer-events-none opacity-0"}`}
    />
    <aside
      id="app-sidebar"
      aria-label="Main navigation"
      role={open ? "dialog" : undefined}
      aria-modal={open ? true : undefined}
      className={`fixed inset-y-0 left-0 z-[2200] flex h-[100dvh] w-[min(86vw,280px)] shrink-0 -translate-x-full flex-col border-r transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[260px] lg:translate-x-0 ${open?"translate-x-0":""}`}
      style={{
        backgroundColor:
          "var(--surface)",
        borderColor:
          "var(--border)",
      }}
    >
      <div
        className="
          flex
          h-[76px]
          shrink-0
          items-center
          border-b
          px-5
        "
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <Link
          href="/dashboard"
          className="
            flex
            items-center
            gap-3
            rounded-xl
            focus-visible:outline-none
          "
          aria-label="Smart City Planner home"
        >
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
            "
            style={{
              backgroundColor:
                "var(--primary)",
              color:
                "var(--primary-foreground)",
              boxShadow:
                "0 4px 12px rgba(37, 99, 235, 0.22)",
            }}
          >
            <LuBuilding2
              size={21}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <p
              className="
                truncate
                text-[14px]
                font-bold
                leading-5
                tracking-tight
              "
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Smart City
            </p>

            <p
              className="
                truncate
                text-[13px]
                font-medium
                leading-5
              "
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              Planner
            </p>
          </div>
        </Link>
      </div>

      <div
        className="
          flex-1
          overflow-y-auto
          px-3
          py-6
        "
      >
        <nav
          aria-label="Primary navigation"
          className="space-y-1"
        >
          {renderSection(
            "Workspace",
            workspaceItems
          )}

          {renderSection(
            "Output",
            outputItems,
            "mt-8"
          )}

          {renderSection(
            "System",
            systemItems,
            "mt-8"
          )}
        </nav>
      </div>

      <div
        className="
          shrink-0
          border-t
          p-3
        "
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <div
          className="
            flex
            items-center
            justify-between
            rounded-xl
            border
            px-3
            py-2.5
          "
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
          }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
              "
              style={{
                backgroundColor:
                  "var(--primary-soft)",
                color:
                  "var(--primary)",
              }}
            >
              <LuChartBar
                size={16}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <p
                className="
                  truncate
                  text-xs
                  font-semibold
                  leading-4
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Planning Workspace
              </p>

              <p
                className="
                  truncate
                  text-[10px]
                  leading-4
                "
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Theme & appearance
              </p>
            </div>
          </div>

          <ThemeToggle />
        </div>
      </div>

      {user && (
        <div
          className="shrink-0 border-t p-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="overflow-hidden rounded-2xl border"
            style={{
              backgroundColor: "var(--surface-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex min-w-0 items-center gap-3 px-3.5 py-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                style={{
                  backgroundColor: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
                aria-hidden="true"
              >
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-semibold leading-5"
                  style={{ color: "var(--text-primary)" }}
                  title={displayName}
                >
                  {displayName}
                </p>
                <p
                  className="truncate text-xs leading-4"
                  style={{ color: "var(--text-muted)" }}
                  title={user.email || "Signed in"}
                >
                  {user.email || "Signed in"}
                </p>
              </div>
            </div>

            <div className="border-t p-1.5" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)] hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LuLogOut size={17} strokeWidth={1.9} aria-hidden="true" />
                <span>{loggingOut ? "Logging out..." : "Log out"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}