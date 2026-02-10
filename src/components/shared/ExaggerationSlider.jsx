import { MIN_EXAGGERATION, MAX_EXAGGERATION } from '../../lib/constants'

export default function ExaggerationSlider({ value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-zinc-300">Emotion Exaggeration</label>
        <span className="text-xs tabular-nums text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={MIN_EXAGGERATION}
        max={MAX_EXAGGERATION}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-violet-500"
      />
      <div className="flex justify-between text-[10px] text-zinc-600">
        <span>Neutral</span>
        <span>Expressive</span>
      </div>
    </div>
  )
}
