import { useCallback, useMemo, useRef, useState } from 'react'
import { encodeWAV } from '../lib/audio-utils'

function parseBatchText(input) {
  return input
    .split(/\n\s*\n/g)
    .map((x) => x.trim())
    .filter(Boolean)
}

export function useTTSQueue({ generateChunked, ensureSpeaker }) {
  const [jobs, setJobs] = useState([])
  const [running, setRunning] = useState(false)
  const abortRef = useRef(false)

  const counts = useMemo(() => {
    return jobs.reduce((acc, job) => {
      acc.total += 1
      acc[job.status] += 1
      return acc
    }, { total: 0, queued: 0, processing: 0, done: 0, failed: 0 })
  }, [jobs])

  const addTexts = useCallback((texts) => {
    const newJobs = texts
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text, index) => ({
        id: crypto.randomUUID(),
        title: `Job ${index + 1}`,
        text,
        status: 'queued',
        output: null,
        error: null,
      }))

    if (newJobs.length === 0) return
    setJobs((prev) => [...prev, ...newJobs])
  }, [])

  const addBatchText = useCallback((input) => {
    const parts = parseBatchText(input)
    addTexts(parts)
  }, [addTexts])

  const addTextFiles = useCallback(async (files) => {
    const results = await Promise.all(files.map(async (file) => {
      const text = await file.text()
      return {
        id: crypto.randomUUID(),
        title: file.name,
        text: text.trim(),
        status: 'queued',
        output: null,
        error: null,
      }
    }))

    setJobs((prev) => [...prev, ...results.filter((x) => x.text)])
  }, [])

  const clearFinished = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status !== 'done' && j.status !== 'failed'))
  }, [])

  const clearAll = useCallback(() => {
    if (running) return
    setJobs([])
  }, [running])

  const start = useCallback(async (speakerId, exaggeration) => {
    if (running) return
    abortRef.current = false
    setRunning(true)

    try {
      await ensureSpeaker(speakerId)

      while (!abortRef.current) {
        let currentJob = null
        setJobs((prev) => {
          const nextIndex = prev.findIndex((j) => j.status === 'queued')
          if (nextIndex === -1) return prev
          currentJob = prev[nextIndex]
          const next = [...prev]
          next[nextIndex] = { ...next[nextIndex], status: 'processing', error: null }
          return next
        })

        if (!currentJob) break

        try {
          const result = await generateChunked(currentJob.text, speakerId, exaggeration)
          if (!result) {
            throw new Error('Generation aborted')
          }

          const wavBlob = encodeWAV(result.waveform)
          const url = URL.createObjectURL(wavBlob)

          setJobs((prev) => prev.map((j) => (
            j.id === currentJob.id
              ? { ...j, status: 'done', output: { url, waveform: result.waveform }, error: null }
              : j
          )))
        } catch (error) {
          setJobs((prev) => prev.map((j) => (
            j.id === currentJob.id
              ? { ...j, status: 'failed', error: error.message }
              : j
          )))
        }
      }
    } finally {
      setRunning(false)
    }
  }, [ensureSpeaker, generateChunked, running])

  const stop = useCallback(() => {
    abortRef.current = true
    setRunning(false)
  }, [])

  return {
    jobs,
    running,
    counts,
    addTexts,
    addBatchText,
    addTextFiles,
    start,
    stop,
    clearFinished,
    clearAll,
  }
}
