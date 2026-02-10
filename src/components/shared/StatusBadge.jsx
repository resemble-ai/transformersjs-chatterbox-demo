export default function StatusBadge({ status }) {
  const config = {
    idle: { color: 'bg-zinc-600', text: 'Not Loaded' },
    loading: { color: 'bg-amber-500 animate-pulse', text: 'Loading...' },
    ready: { color: 'bg-green-500', text: 'Ready' },
    error: { color: 'bg-red-500', text: 'Error' },
  }

  const { color, text } = config[status] || config.idle

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {text}
    </span>
  )
}
