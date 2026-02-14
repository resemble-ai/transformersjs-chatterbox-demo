import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { encodeWAV } from '../lib/audio-utils'

function parseBatchText(input) {
  return input
    .split(/\n\s*\n/g)
    .map((x) => x.trim())
    .filter(Boolean)
}

export function useTTSQueue({ generateChunked, ensureSpeaker, abortGeneration }) {
  const [jobs, setJobs] = useState([])
  const [running, setRunning] = useState(false)
  const abortRef = useRef(false)
  const runningRef = useRef(false)
  const jobsRef = useRef([])
  const nextJobNumberRef = useRef(1)

  useEffect(() => {
    jobsRef.current = jobs
  }, [jobs])

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
      .map((text) => ({
        id: crypto.randomUUID(),
        title: `Job ${nextJobNumberRef.current++}`,
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
    if (runningRef.current) return
    setJobs([])
  }, [])

  const start = useCallback(async (speakerId, exaggeration) => {
    if (runningRef.current) return

    runningRef.current = true
    abortRef.current = false
    setRunning(true)

    const resetProcessingJobs = jobsRef.current.map((job) => (
      job.status === 'processing'
        ? { ...job, status: 'queued' }
        : job
    ))
    jobsRef.current = resetProcessingJobs
    setJobs(resetProcessingJobs)

    try {
      await ensureSpeaker(speakerId)

      while (!abortRef.current) {
        const currentJob = jobsRef.current.find((j) => j.status === 'queued')

        if (!currentJob) break

        const nextJobs = jobsRef.current.map((j) => (
          j.id === currentJob.id
            ? { ...j, status: 'processing', error: null }
            : j
        ))
        jobsRef.current = nextJobs
        setJobs(nextJobs)

        try {
          const result = await generateChunked(currentJob.text, speakerId, exaggeration)
          if (!result) {
            throw new Error('Generation aborted')
          }

          const wavBlob = encodeWAV(result.waveform)
          const url = URL.createObjectURL(wavBlob)

          const updated = jobsRef.current.map((j) => (
            j.id === currentJob.id
              ? { ...j, status: 'done', output: { url, waveform: result.waveform }, error: null }
              : j
          ))
          jobsRef.current = updated
          setJobs(updated)
        } catch (error) {
          const updated = jobsRef.current.map((j) => (
            j.id === currentJob.id
              ? { ...j, status: 'failed', error: error.message }
              : j
          ))
          jobsRef.current = updated
          setJobs(updated)
        }
      }
    } finally {
      runningRef.current = false
      setRunning(false)
    }
  }, [ensureSpeaker, generateChunked])

  const stop = useCallback(() => {
    abortRef.current = true
    runningRef.current = false
    abortGeneration?.()
    setRunning(false)
  }, [abortGeneration])

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
