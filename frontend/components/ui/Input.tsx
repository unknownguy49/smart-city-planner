interface InputProps {
  label: string;
  placeholder: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}

export default function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: InputProps) {
  return (
    <div className="mb-5">
      <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>

      <input
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] transition focus:border-[var(--primary)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        placeholder={placeholder}
        value={value}
        type={type}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}