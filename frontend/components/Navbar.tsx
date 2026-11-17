export default function Navbar() {
  return (
    <nav className="w-full flex justify-between items-center px-10 py-5 bg-white shadow-md">

      <h1 className="text-2xl font-bold text-blue-700">
        Smart City Planner
      </h1>

      <div className="space-x-4">

        <button className="px-5 py-2 rounded-lg border">
          Login
        </button>

        <button className="px-5 py-2 rounded-lg bg-blue-600 text-white">
          Start Project
        </button>

      </div>

    </nav>
  );
}