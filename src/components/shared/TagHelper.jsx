import { PARALINGUISTIC_TAGS } from '../../lib/constants'

export default function TagHelper({ onInsert }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
        Paralinguistic Tags
      </label>
      <div className="flex flex-wrap gap-1.5">
        {PARALINGUISTIC_TAGS.map(({ tag, label }) => (
          <button
            key={tag}
            onClick={() => onInsert(tag)}
            className="px-2.5 py-1 rounded-md bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
