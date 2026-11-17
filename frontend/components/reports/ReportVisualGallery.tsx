"use client";

import { useEffect, useState } from "react";

import {
  LuBuilding2,
  LuCircleCheck,
  LuFileImage,
  LuImage,
  LuMap,
  LuMaximize2,
} from "react-icons/lu";

import {
  getReportVisuals,
  type ReportVisuals,
} from "../../lib/reportVisualStore";

interface ReportVisualGalleryProps {
  projectId: number | string;
}

export default function ReportVisualGallery({
  projectId,
}: ReportVisualGalleryProps) {
  const [visuals, setVisuals] = useState<ReportVisuals | null>(
    null
  );

  const [preview, setPreview] = useState<{
    src: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    const loadVisuals = async () => {
      try {
        const result = await getReportVisuals(projectId);

        if (active) {
          setVisuals(result);
        }
      } catch (error) {
        console.error(
          "[Reports] Failed to load generated visuals:",
          error
        );

        if (active) {
          setVisuals(null);
        }
      }
    };

    const handleUpdate = () => {
      void loadVisuals();
    };

    void loadVisuals();

    window.addEventListener(
      "smart-city:report-visuals-updated",
      handleUpdate
    );

    return () => {
      active = false;

      window.removeEventListener(
        "smart-city:report-visuals-updated",
        handleUpdate
      );
    };
  }, [projectId]);

  useEffect(() => {
    if (!preview) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [preview]);

  if (!visuals) {
    return null;
  }

  const hasArchitectureMap = Boolean(visuals.architectureMap);
  const hasScenarioMap = Boolean(visuals.scenarioMap);
  const hasBuilding3D = Boolean(visuals.building3D);
  const floorPlans = visuals.floorPlans ?? [];
  const hasFloors = floorPlans.length > 0;

  const visualCount =
    Number(hasArchitectureMap) +
    Number(hasScenarioMap) +
    Number(hasBuilding3D) +
    floorPlans.length;

  if (visualCount === 0) {
    return null;
  }

  const openPreview = (src: string, title: string) => {
    setPreview({ src, title });
  };

  return (
    <>
      <section
        className="mt-5 overflow-hidden rounded-2xl border shadow-sm sm:mt-8"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
      >
        {/* Header */}
        <div
          className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-secondary)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "var(--primary-soft)",
                color: "var(--primary)",
              }}
            >
              <LuFileImage size={21} strokeWidth={1.8} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold sm:text-lg">
                  Generated Visuals
                </h2>

                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    backgroundColor: "var(--primary-soft)",
                    color: "var(--primary)",
                  }}
                >
                  {visualCount}{" "}
                  {visualCount === 1 ? "visual" : "visuals"}
                </span>
              </div>

              <p
                className="mt-1 max-w-xl text-sm leading-5"
                style={{ color: "var(--text-muted)" }}
              >
                Site layout, architectural floor plans, and
                scenario visualizations captured from your
                planning workspace.
              </p>
            </div>
          </div>

          <div
            className="flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text-muted)",
            }}
          >
            <LuCircleCheck
              size={15}
              style={{
                color: "var(--success)",
              }}
            />
            Saved snapshots
          </div>
        </div>

        <div className="space-y-5 p-3 sm:space-y-7 sm:p-6">
          {/* Architecture site map */}
          {hasArchitectureMap && visuals.architectureMap && (
            <section>
              <SectionHeading
                icon={<LuMap size={17} />}
                title="Architecture Site Map"
                description="Generated site layout and planning constraints."
              />

              <ImageCard
                src={visuals.architectureMap}
                alt="Generated architecture site map"
                title="Site layout"
                onPreview={() =>
                  openPreview(
                    visuals.architectureMap!,
                    "Architecture Site Map"
                  )
                }
              />
            </section>
          )}

          {/* Floor plans */}
          {hasFloors && (
            <section>
              <SectionHeading
                icon={<LuBuilding2 size={17} />}
                title="Architectural Floors"
                description={`${floorPlans.length} saved ${floorPlans.length === 1 ? "floor plan" : "floor plans"
                  } from the generated building design.`}
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {floorPlans.map((floor, index) => (
                  <article
                    key={`${floor.floor}-${floor.label}-${index}`}
                    className="group overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--surface)",
                    }}
                  >
                    <div
                      className="flex items-center justify-between gap-3 border-b px-4 py-3"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--surface-secondary)",
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: "var(--primary-soft)",
                            color: "var(--primary)",
                          }}
                        >
                          <LuBuilding2 size={17} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold">
                            {floor.label}
                          </h3>
                          <p
                            className="mt-0.5 text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Architectural floor plan
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openPreview(floor.image, floor.label)
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--text-secondary)",
                          backgroundColor: "var(--surface)",
                        }}
                        aria-label={`Preview ${floor.label}`}
                        title="Enlarge floor plan"
                      >
                        <LuMaximize2 size={15} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openPreview(floor.image, floor.label)
                      }
                      className="block w-full cursor-zoom-in text-left"
                      aria-label={`Open ${floor.label} preview`}
                    >
                      <div
                        className="flex min-h-[180px] items-center justify-center p-2.5 sm:min-h-[280px] sm:p-5"
                        style={{ backgroundColor: "#ffffff" }}
                      >
                        <img
                          src={floor.image}
                          alt={`${floor.label} floor plan`}
                          loading="lazy"
                          className="max-h-[360px] w-full object-contain transition-transform duration-200 group-hover:scale-[1.01] sm:max-h-[480px]"
                        />
                      </div>
                    </button>

                    <div
                      className="flex items-center justify-between gap-3 border-t px-4 py-3"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--surface-secondary)",
                      }}
                    >
                      <span
                        className="flex items-center gap-2 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <LuImage size={14} />
                        Captured floor image
                      </span>

                      <span
                        className="text-xs font-semibold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Floor {floor.floor}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {hasBuilding3D && visuals.building3D && (
            <section>
              <SectionHeading
                icon={<LuBuilding2 size={17} />}
                title="3D Building Snapshot"
                description="Captured view of the interactive 3D building model."
              />
              <ImageCard
                src={visuals.building3D}
                alt="Interactive 3D building model snapshot"
                title="3D building model"
                onPreview={() => openPreview(visuals.building3D!, "3D Building Model")}
              />
            </section>
          )}

          {/* Scenario map */}
          {hasScenarioMap && visuals.scenarioMap && (
            <section>
              <SectionHeading
                icon={<LuMap size={17} />}
                title="Scenario Map"
                description="Visual representation of the selected planning scenario."
              />

              <ImageCard
                src={visuals.scenarioMap}
                alt="Generated scenario map"
                title="Planning scenario"
                onPreview={() =>
                  openPreview(
                    visuals.scenarioMap!,
                    "Scenario Map"
                  )
                }
              />
            </section>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-start gap-2 border-t px-4 py-3 text-xs leading-5 sm:px-6 sm:py-3.5"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-secondary)",
            color: "var(--text-muted)",
          }}
        >
          <LuCircleCheck
            size={15}
            style={{
              color: "var(--success)",
            }}
          />

          <p>
            These are saved visual snapshots. They are displayed as
            captured and are not regenerated by opening this gallery.
          </p>
        </div>
      </section>

      {/* Full-screen preview */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${preview.title} preview`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreview(null);
            }
          }}
        >
          <div
            className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
            }}
          >
            <div
              className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <LuImage
                  size={18}
                  style={{ color: "var(--primary)" }}
                />

                <h3 className="truncate text-sm font-semibold">
                  {preview.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg border px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-75"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                Close
              </button>
            </div>

            <div className="overflow-auto p-3 sm:p-5">
              <img
                src={preview.src}
                alt={preview.title}
                className="mx-auto h-auto max-h-[78vh] w-full object-contain"
                style={{ backgroundColor: "#ffffff" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: "var(--primary-soft)",
          color: "var(--primary)",
        }}
      >
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-bold sm:text-base">{title}</h3>
        <p
          className="mt-1 text-xs leading-5 sm:text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function ImageCard({
  src,
  alt,
  title,
  onPreview,
}: {
  src: string;
  alt: string;
  title: string;
  onPreview: () => void;
}) {
  return (
    <div
      className="group overflow-hidden rounded-xl border"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
      }}
    >
      <button
        type="button"
        onClick={onPreview}
        className="block w-full cursor-zoom-in text-left"
        aria-label={`Enlarge ${title}`}
      >
        <div
          className="relative flex min-h-[180px] items-center justify-center p-2.5 sm:min-h-[360px] sm:p-5"
          style={{ backgroundColor: "#ffffff" }}
        >
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="max-h-[420px] w-full object-contain sm:max-h-[620px]"
          />

          <span className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <LuMaximize2 size={14} />
            Enlarge preview
          </span>
        </div>
      </button>

      <div
        className="flex items-center justify-between gap-3 border-t px-4 py-3"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-secondary)",
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <LuImage
            size={15}
            className="shrink-0"
            style={{ color: "var(--primary)" }}
          />

          <span className="truncate text-xs font-semibold">
            {title}
          </span>
        </div>

        <button
          type="button"
          onClick={onPreview}
          className="shrink-0 text-xs font-semibold hover:underline"
          style={{ color: "var(--primary)" }}
        >
          View
        </button>
      </div>
    </div>
  );
}