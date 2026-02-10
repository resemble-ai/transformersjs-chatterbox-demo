export default function ModeHeader({ title, description, children }) {
  return (
    <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-zinc-400 mt-0.5">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
