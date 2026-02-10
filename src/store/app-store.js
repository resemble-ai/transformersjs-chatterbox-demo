import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // Model state
  modelStatus: 'idle', // idle | loading | ready | error
  modelDevice: null,
  modelDtype: null,
  webgpuAvailable: null,
  loadProgress: [],
  modelError: null,

  setModelStatus: (status) => set({ modelStatus: status }),
  setModelDevice: (device) => set({ modelDevice: device }),
  setModelDtype: (dtype) => set({ modelDtype: dtype }),
  setWebGPUAvailable: (available) => set({ webgpuAvailable: available }),
  setLoadProgress: (progress) => set({ loadProgress: progress }),
  setModelError: (error) => set({ modelError: error }),

  // Speaker cache (track which speaker IDs have been encoded)
  encodedSpeakers: {},
  setSpeakerEncoded: (id, audioData) =>
    set((s) => ({ encodedSpeakers: { ...s.encodedSpeakers, [id]: audioData } })),

  // Playground state
  playground: {
    text: 'Hello! Welcome to Chatterbox. [laugh] This is pretty cool, right?',
    exaggeration: 0.5,
    voiceAudio: null,
    generatedAudio: null,
    generating: false,
    inferenceTime: null,
  },
  setPlayground: (update) =>
    set((s) => ({ playground: { ...s.playground, ...update } })),

  // Echo state
  echo: {
    step: 0, // 0=record, 1=compose, 2=preview
    voiceAudio: null,
    text: '',
    templateId: 'birthday',
    generatedAudio: null,
    generating: false,
  },
  setEcho: (update) =>
    set((s) => ({ echo: { ...s.echo, ...update } })),

  // VoiceCraft state
  voicecraft: {
    characters: [],
    lines: [],
    generatedClips: {},
    fullAudio: null,
    generating: false,
    currentLineIndex: -1,
  },
  setVoiceCraft: (update) =>
    set((s) => ({ voicecraft: { ...s.voicecraft, ...update } })),

  // Narrator state
  narrator: {
    storyId: null,
    customText: '',
    segments: [],
    characters: [],
    voiceAssignments: {},
    generatedClips: {},
    fullAudio: null,
    generating: false,
    currentSegment: -1,
    playbackPosition: 0,
  },
  setNarrator: (update) =>
    set((s) => ({ narrator: { ...s.narrator, ...update } })),
}))
