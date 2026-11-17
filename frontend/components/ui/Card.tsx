interface CardProps {
  title: string;
  children: React.ReactNode;
}

export default function Card({
  title,
  children,
}: CardProps) {
  return (
    <section className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-md">
      <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
        {title}
      </h2>

      <div>
        {children}
      </div>
    </section>
  );
}