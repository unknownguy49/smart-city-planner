import AppLayout from "../../../components/layout/AppLayout";
import ProjectForm from "../../../components/forms/ProjectForm";

export default function NewProjectPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl space-y-7">

        <section
          className="
            rounded-2xl
            border
            p-6
            sm:p-7
          "
          style={{
            backgroundColor:
              "var(--surface)",
            borderColor:
              "var(--border)",
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="
                flex
                h-11
                w-11
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
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v18" />
                <path d="M3 12h18" />
                <path d="M5 5h4v4H5z" />
                <path d="M15 15h4v4h-4z" />
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
                Project Setup
              </p>

              <h1
                className="
                  mt-1
                  text-2xl
                  font-bold
                  tracking-tight
                  sm:text-3xl
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Create New Project
              </h1>

              <p
                className="
                  mt-2
                  max-w-2xl
                  text-sm
                  leading-6
                "
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                Define the basic development
                requirements before moving to
                site selection and spatial
                planning.
              </p>
            </div>
          </div>
        </section>

        <ProjectForm />

      </div>
    </AppLayout>
  );
}