"use client";

import { useState } from "react";
import axios from "axios";
import {
  LuMapPin,
  LuSearch,
} from "react-icons/lu";

import { useProjectStore } from "../../store/projectStore";

export default function SearchLocation() {
  const [query, setQuery] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const setSearchLocation =
    useProjectStore(
      (state) =>
        state.setSearchLocation
    );

  async function searchPlace() {
    if (!query.trim()) {
      return;
    }

    try {
      setLoading(true);

      const res =
        await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: {
              q: query,
              format: "json",
              limit: 1,
            },
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      if (
        res.data.length === 0
      ) {
        alert(
          "Location not found."
        );

        return;
      }

      const place = res.data[0];

      const lat =
        parseFloat(place.lat);

      const lng =
        parseFloat(place.lon);

      setSearchLocation({
        lat,
        lng,
      });

      console.log(
        "Location Found:",
        place.display_name
      );

      console.log(
        lat,
        lng
      );
    } catch (error) {
      console.error(error);

      alert(
        "Search failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      void searchPlace();
    }
  }

  return (
    <div
      className="
        flex
        flex-col
        gap-2
        sm:flex-row
      "
    >
      <div className="relative min-w-0 flex-1">
        <LuMapPin
          size={17}
          strokeWidth={1.8}
          className="
            pointer-events-none
            absolute
            left-3.5
            top-1/2
            -translate-y-1/2
          "
          style={{
            color:
              "var(--text-muted)",
          }}
        />

        <input
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value
            )
          }
          onKeyDown={
            handleKeyDown
          }
          placeholder="Search city, village, address or landmark"
          className="
            h-11
            w-full
            rounded-lg
            border
            pl-10
            pr-3.5
            text-sm
            outline-none
            transition
            focus:border-[var(--primary)]
            focus:ring-2
            focus:ring-[var(--focus-ring)]
          "
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
            color:
              "var(--text-primary)",
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          void searchPlace();
        }}
        disabled={
          loading ||
          !query.trim()
        }
        className="
          inline-flex
          h-11
          shrink-0
          items-center
          justify-center
          gap-2
          rounded-lg
          px-5
          text-sm
          font-semibold
          transition
          hover:opacity-90
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
        style={{
          backgroundColor:
            "var(--primary)",
          color:
            "var(--primary-foreground)",
        }}
      >
        <LuSearch
          size={16}
          strokeWidth={1.9}
        />

        {loading
          ? "Searching..."
          : "Search"}
      </button>
    </div>
  );
}