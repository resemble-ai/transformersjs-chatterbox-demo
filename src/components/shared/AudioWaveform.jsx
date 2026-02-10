import { useRef, useEffect } from 'react'

export default function AudioWaveform({ data, height = 64, color = '#8b5cf6', bgColor = 'transparent' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data || data.length === 0) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, rect.width, rect.height)

    const samples = data.length
    const barCount = Math.min(Math.floor(rect.width / 3), 200)
    const samplesPerBar = Math.floor(samples / barCount)
    const barWidth = rect.width / barCount
    const mid = rect.height / 2

    ctx.fillStyle = color

    for (let i = 0; i < barCount; i++) {
      let sum = 0
      const start = i * samplesPerBar
      for (let j = start; j < start + samplesPerBar && j < samples; j++) {
        sum += Math.abs(data[j])
      }
      const avg = sum / samplesPerBar
      const barHeight = Math.max(2, avg * rect.height * 0.8)

      ctx.fillRect(
        i * barWidth + 0.5,
        mid - barHeight / 2,
        barWidth - 1,
        barHeight,
      )
    }
  }, [data, height, color, bgColor])

  return (
    <canvas
      ref={canvasRef}
      className="w-full waveform-canvas rounded"
      style={{ height }}
    />
  )
}
