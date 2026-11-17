"use client";

import { useState } from "react";

export default function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-3">

      <input
        className="border p-3 rounded-lg flex-1"
        placeholder="Search City, Village or Address"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <button
        className="bg-blue-600 text-white px-6 rounded-lg"
      >
        Search
      </button>

    </div>
  );
}