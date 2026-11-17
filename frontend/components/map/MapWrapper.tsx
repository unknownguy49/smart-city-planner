"use client";

import dynamic from "next/dynamic";

const MapSelector = dynamic(
  () => import("./MapSelector"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[360px] items-center justify-center">
        Loading Map...
      </div>
    ),
  }
);

export default function MapWrapper() {
  return (
    <div className="site-planning-map">
      <MapSelector />
    </div>
  );
}
