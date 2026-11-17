
"use client";

type Place = {
  id?: string | number;
  osm_id?: string | number;
  name?: string;
  lat?: number;
  lng?: number;
  distance?: number | null;
};

type SiteContext = {
  site?: {
    area?: number;
    centroid?: {
      latitude?: number;
      longitude?: number;
    };
  };
  nearby_infrastructure?: Record<string, Place[]>;
  facility_counts?: Record<string, number>;
  osm?: {
    status?: string;
    error?: string | null;
  };

};

const categories = [
  ["Hospitals", "hospitals"],
  ["Schools", "schools"],
  ["Colleges", "colleges"],
  ["Parks", "parks"],
  ["Bus stops", "bus_stops"],
  ["Police stations", "police"],
  ["Fire stations", "fire_stations"],
  ["Water bodies", "water_bodies"],
] as const;

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return typeof value === "number"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 5 })
    : String(value);
}

export default function SiteContextPanel({
  context,
}: {
  context: SiteContext;
}) {
  const site = context.site ?? {};
  const nearby = context.nearby_infrastructure ?? {};
  const counts = context.facility_counts ?? {};
  const osm = context.osm ?? {};

  const cardStyle = {
    borderColor: "var(--border)",
    backgroundColor: "var(--surface)",
  };

  return (
    <section
      className="space-y-5 rounded-xl border p-5 sm:p-6"
      style={cardStyle}
    >
      <div>
        <h2 className="text-lg font-semibold">
          Site Context & Nearby Infrastructure
        </h2>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Geographic information retrieved for the selected site.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Plot area", site.area === undefined ? "Not available" : `${display(site.area)} m²`],
          ["Centroid latitude", display(site.centroid?.latitude)],
          ["Centroid longitude", display(site.centroid?.longitude)],
          ["Map data status", display(osm.status)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border p-3"
            style={cardStyle}
          >
            <p
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {label}
            </p>
            <p className="mt-1 break-words text-sm font-semibold">
              {value}
            </p>
          </div>
        ))}
      </div>

      {osm.error && (
        <p className="rounded-lg border p-3 text-sm">
          Map data retrieval note: {osm.error}
        </p>
      )}

      <div>
        <h3 className="mb-3 font-semibold">Infrastructure counts</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map(([label, key]) => {
            const places = Array.isArray(nearby[key])
              ? nearby[key]
              : [];

            const count = counts[key] ?? places.length;

            return (
              <div
                key={key}
                className="rounded-lg border p-3"
                style={cardStyle}
              >
                <p
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {label}
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {display(count)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Nearby places</h3>
        <div className="space-y-2">
          {categories.map(([label, key]) => {
            const places = Array.isArray(nearby[key])
              ? nearby[key]
              : [];

            if (places.length === 0) return null;

            return (
              <details
                key={key}
                className="rounded-lg border p-3"
                style={cardStyle}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  {label} ({places.length})
                </summary>

                <div className="mt-3 space-y-3">
                  {places.map((place, index) => (
                    <div
                      key={`${key}-${place.osm_id ?? place.id ?? index}`}
                      className="border-t pt-3"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <p className="text-sm font-medium">
                        {display(place.name)}
                      </p>
                      <p
                        className="mt-1 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Coordinates: {display(place.lat)}, {display(place.lng)}
                      </p>
                      {place.distance !== null &&
                        place.distance !== undefined && (
                          <p
                            className="mt-1 text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Source-reported distance: {display(place.distance)} m
                          </p>
                        )}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}

          {!categories.some(
            ([, key]) =>
              Array.isArray(nearby[key]) && nearby[key].length > 0
          ) && (
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No nearby places were returned. Check map-data availability
              before interpreting empty results.
            </p>
          )}
        </div>
      </div>


    </section>
  );
}
