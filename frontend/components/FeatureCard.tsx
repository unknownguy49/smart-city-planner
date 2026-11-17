type Props = {
  emoji: string;
  title: string;
  description: string;
};

export default function FeatureCard({
  emoji,
  title,
  description,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">

      <div className="text-5xl">{emoji}</div>

      <h2 className="text-xl font-bold mt-5">
        {title}
      </h2>

      <p className="text-gray-500 mt-3">
        {description}
      </p>

    </div>
  );
}