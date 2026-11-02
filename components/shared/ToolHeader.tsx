/**
 * 工具页统一标题区
 */
export default function ToolHeader({
  title,
  description,
  features,
}: {
  title: string
  description: string
  features: string[]
}) {
  return (
    <header className="container-responsive pt-8 pb-6 md:pt-12 md:pb-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
          {title}
        </h1>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {description}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
          {features.map((feature) => (
            <span
              key={feature}
              className="px-3 py-1 rounded-full bg-white text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </header>
  )
}
