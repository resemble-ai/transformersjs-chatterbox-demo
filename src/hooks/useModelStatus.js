import { useAppStore } from '../store/app-store'

export function useModelStatus() {
  const modelStatus = useAppStore((s) => s.modelStatus)
  const loadProgress = useAppStore((s) => s.loadProgress)
  const modelDevice = useAppStore((s) => s.modelDevice)
  const modelDtype = useAppStore((s) => s.modelDtype)
  const webgpuAvailable = useAppStore((s) => s.webgpuAvailable)
  const modelError = useAppStore((s) => s.modelError)

  return {
    isIdle: modelStatus === 'idle',
    isLoading: modelStatus === 'loading',
    isReady: modelStatus === 'ready',
    isError: modelStatus === 'error',
    modelStatus,
    loadProgress,
    modelDevice,
    modelDtype,
    webgpuAvailable,
    modelError,
  }
}
