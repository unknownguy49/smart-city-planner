import AppLayout from "../../components/layout/AppLayout";

import SearchLocation from "../../components/map/SearchLocation";
import MapWrapper from "../../components/map/MapWrapper";
import LandInfo from "../../components/map/LandInfo";
import LandAnalysis from "../../components/map/LandAnalysis";
import NearbyInfrastructure from "../../components/map/NearbyInfrastructure";
import MapLegend from "../../components/map/MapLegend";
import SaveLandButton from "../../components/map/SaveLandButton";
import InterventionPanel from "../../components/map/InterventionPanel";

export default function MapPage() {
  return (
    <AppLayout>
      <div className="min-w-0 space-y-4 sm:space-y-5 lg:space-y-6">

        <section
          className="
            rounded-2xl
            border
            p-4
            sm:p-6
            lg:p-7
          "
          style={{
            backgroundColor:
              "var(--surface)",
            borderColor:
              "var(--border)",
          }}
        >
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div
              className="
                flex
                h-10
                w-10
                sm:h-11
                sm:w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
              "
              style={{
                backgroundColor:
                  "var(--primary-soft)",
                color:
                  "var(--primary)",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6.5 9 3l6 3.5L21 3v14.5L15 21l-6-3.5L3 21V6.5Z" />
                <path d="M9 3v14.5" />
                <path d="M15 6.5V21" />
              </svg>
            </div>

            <div>
              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.14em]
                "
                style={{
                  color:
                    "var(--primary)",
                }}
              >
                Site Planning
              </p>

              <h1
                className="
                  mt-1
                  text-xl
                  font-bold
                  leading-tight
                  tracking-tight
                  sm:text-2xl
                  lg:text-3xl
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Land & Site Planner
              </h1>

              <p
                className="
                  mt-2
                  max-w-3xl
                  text-sm
                  leading-6
                "
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                Search for a location, define
                your land parcel on the map and
                review the surrounding
                infrastructure before saving
                the site for analysis.
              </p>
            </div>
          </div>
        </section>

        <section
          className="
            rounded-xl
            border
            p-3.5
            sm:p-4
            lg:p-5
          "
          style={{
            backgroundColor:
              "var(--surface)",
            borderColor:
              "var(--border)",
          }}
        >
          <div className="mb-3 flex items-center gap-2.5">
            <div
              className="
                flex
                h-8
                w-8
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />
                <path d="m20 20-4-4" />
              </svg>
            </div>

            <div>
              <h2
                className="
                  text-sm
                  font-semibold
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Find a Planning Location
              </h2>

              <p
                className="
                  mt-0.5
                  text-xs
                "
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Search by city, address or
                landmark.
              </p>
            </div>
          </div>

          <SearchLocation />
        </section>

        <section
          className="
            grid
            grid-cols-1
            gap-6
            xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]
          "
        >
          <div className="min-w-0 space-y-4">

            <div
              className="
                overflow-hidden
                rounded-xl
                border
              "
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
                  flex-wrap
                  items-center
                  justify-between
                  gap-2
                  border-b
                  px-3.5
                  py-3
                  sm:flex-nowrap
                  sm:gap-4
                  sm:px-5
                  sm:py-3.5
                "
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",
                  borderColor:
                    "var(--border)",
                }}
              >
                <div>
                  <h2
                    className="
                      text-sm
                      font-semibold
                    "
                    style={{
                      color:
                        "var(--text-primary)",
                    }}
                  >
                    Interactive Site Map
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-xs
                    "
                    style={{
                      color:
                        "var(--text-muted)",
                    }}
                  >
                    Draw the land boundary you
                    want to analyze.
                  </p>
                </div>

                <div
                  className="
                    hidden
                    items-center
                    gap-2
                    rounded-lg
                    border
                    px-2.5
                    py-1.5
                    sm:flex
                  "
                  style={{
                    backgroundColor:
                      "var(--surface)",
                    borderColor:
                      "var(--border)",
                    color:
                      "var(--text-muted)",
                  }}
                >
                  <span
                    className="
                      h-2
                      w-2
                      rounded-full
                    "
                    style={{
                      backgroundColor:
                        "var(--success)",
                    }}
                  />

                  <span
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.08em]
                    "
                  >
                    Map Ready
                  </span>
                </div>
              </div>

              <MapWrapper />
            </div>

            <InterventionPanel />

          </div>

          <aside className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-1">


            <LandInfo />

            <LandAnalysis />

            <NearbyInfrastructure />

            <MapLegend />

            <div className="sm:col-span-2 xl:col-span-1">
              <SaveLandButton />
            </div>

          </aside>
        </section>

      </div>
    </AppLayout>
  );
}