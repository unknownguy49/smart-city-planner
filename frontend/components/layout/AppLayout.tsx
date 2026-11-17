"use client";

import { useCallback,useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import ReportSnapshotBridge from "../reports/ReportSnapshotBridge";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const closeSidebar=useCallback(()=>setSidebarOpen(false),[]);
  const openSidebar=useCallback(()=>setSidebarOpen(true),[]);

  return (
    <div
      className="flex min-h-screen w-full"
      style={{
        backgroundColor:"var(--background)",
        color:"var(--text-primary)",
      }}
    >
      <ReportSnapshotBridge />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={openSidebar} />
        <main
          className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:py-7 lg:pb-7"
          style={{ backgroundColor:"var(--background)" }}
        >
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
