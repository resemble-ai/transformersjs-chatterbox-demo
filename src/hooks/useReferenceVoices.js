import { useCallback, useEffect, useState } from 'react'
import {
  deleteReferenceVoice,
  getReferenceVoice,
  listReferenceVoices,
  saveReferenceVoice,
} from '../lib/indexed-db'

export function useReferenceVoices() {
  const [voices, setVoices] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const items = await listReferenceVoices()
      setVoices(items)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveVoice = useCallback(async (name, audioData) => {
    const voice = {
      id: crypto.randomUUID(),
      name: name.trim(),
      audioData,
    }
    await saveReferenceVoice(voice)
    await refresh()
    return voice.id
  }, [refresh])

  const removeVoice = useCallback(async (id) => {
    await deleteReferenceVoice(id)
    await refresh()
  }, [refresh])

  const loadVoiceAudio = useCallback(async (id) => {
    const voice = await getReferenceVoice(id)
    return voice?.audioData || null
  }, [])

  return {
    voices,
    loading,
    saveVoice,
    removeVoice,
    loadVoiceAudio,
    refresh,
  }
}
