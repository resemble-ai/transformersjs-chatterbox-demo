# Chatterbox TTS — In-Browser Voice Cloning Demo

A showcase application for [Chatterbox TTS](https://github.com/resemble-ai/chatterbox) by Resemble AI, running **100% in the browser** via [Transformers.js](https://github.com/huggingface/transformers.js) v4. No server, no API keys — the entire model runs client-side using WebGPU or WASM.

<!--
To add screenshots, place images in a `screenshots/` directory:
  screenshots/home.png
  screenshots/playground.png
  screenshots/echo.png
  screenshots/voicecraft.png
  screenshots/narrator.png
-->

<p align="center">
  <img src="./screenshots/home.png" alt="Chatterbox TTS Home" width="720" />
</p>

## Features

- **Zero-shot voice cloning** — Record or upload a 5-10 second voice sample, then generate speech in that voice
- **Expressiveness control** — Adjust the exaggeration slider (0–1.5) to control how expressive the generated speech sounds
- **WebGPU acceleration** — Automatically detects and uses WebGPU when available, falls back to WASM
- **Offline after first load** — Model files (~1.5 GB) are cached by the browser after the initial download
- **Web Worker inference** — All model computation runs off the main thread for a smooth UI

## Demo Modes

### Playground

Full-featured TTS explorer. Type text, record a reference voice, adjust expressiveness, and generate speech. Displays real-time performance metrics (inference time, audio duration, real-time factor).

<p align="center">
  <img src="./screenshots/playground.png" alt="Playground" width="720" />
</p>

### Echo — Voice Message Maker

Create personalized voice message cards in three steps:

1. **Record** your voice (or upload a sample)
2. **Compose** your message — pick a themed card (Birthday, Thank You, Holiday, Congrats, Get Well, Love), write your text, and adjust expressiveness
3. **Preview & Share** — listen to the result and download as a WAV file

<p align="center">
  <img src="./screenshots/echo.png" alt="Echo" width="720" />
</p>

### VoiceCraft — Dialogue Creator

Build multi-character dialogues with different voices:

- Add characters, each with their own voice sample and color
- Write a script with per-line character assignment and expressiveness control
- Generate all lines sequentially, each using the correct speaker embedding
- View the dialogue as a color-coded timeline
- Export the entire conversation as a single WAV file with natural pauses between lines

<p align="center">
  <img src="./screenshots/voicecraft.png" alt="VoiceCraft" width="720" />
</p>

### Narrator — Story Reader

Turn text into narrated audio with automatic dialogue detection:

- Paste any story or pick from built-in samples (*The Fox and the Grapes*, *The Last Robot*, *Counting Stars*)
- Automatic dialogue detection via regex — identifies quoted speech and attributes characters
- Assign different voices to the narrator and each detected character
- Read-along display with paragraph-level highlighting during playback
- Navigate between paragraphs

<p align="center">
  <img src="./screenshots/narrator.png" alt="Narrator" width="720" />
</p>

## Getting Started

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** 9+
- A modern browser with **WebGPU** support (Chrome 113+, Edge 113+) for best performance. Falls back to **WASM** on older browsers.

### Installation

```bash
git clone https://github.com/resemble-ai/transformersjs-chatterbox-demo.git
cd transformersjs-chatterbox-demo
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview   # preview the build locally
```

The built files are in `dist/` and can be deployed to any static hosting (Vercel, Netlify, GitHub Pages, etc.).

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────┐
│                  Main Thread                     │
│                                                  │
│  React App ──► tts-client.js ──► Web Worker     │
│    (UI)        (RPC bridge)     (Chatterbox)     │
│                                                  │
│  Zustand Store ◄── events ◄── Worker messages    │
└─────────────────────────────────────────────────┘
```

1. **Web Worker** (`src/workers/tts.worker.js`) — Loads the Chatterbox ONNX model, handles all inference. The model has 4 ONNX sessions: `embed_tokens`, `speech_encoder`, `language_model` (quantized to q4/q4f16), and `conditional_decoder`.

2. **RPC Client** (`src/lib/tts-client.js`) — Singleton that provides a promise-based API over the worker's `postMessage` interface. Handles progress events, error propagation, and worker lifecycle.

3. **React Hooks** — `useTTS()` for model loading/generation, `useAudioRecorder()` for microphone recording with 24kHz resampling, `useAudioPlayer()` for playback with time tracking.

4. **State** — Zustand store with per-mode slices. Audio buffers are stored as `Float32Array` to avoid serialization overhead.

### Speaker Caching

Voice embeddings are computed once per speaker via `model.encode_speech()` and cached in the worker's memory. Subsequent generations with the same voice skip the encoding step entirely.

### Model Details

| Session | Size | Quantization |
|---------|------|-------------|
| Embed Tokens | ~61 MB | fp32 |
| Speech Encoder | ~591 MB | fp32 |
| Language Model | ~353 MB | q4 (WASM) / q4f16 (WebGPU) |
| Conditional Decoder | ~533 MB | fp32 |

The model is loaded from [`onnx-community/chatterbox-ONNX`](https://huggingface.co/onnx-community/chatterbox-ONNX) on Hugging Face and cached by the browser after the first download.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| [React](https://react.dev) | 19 | UI framework |
| [Vite](https://vite.dev) | 7 | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Styling |
| [Zustand](https://zustand.docs.pmnd.rs) | 5 | State management |
| [React Router](https://reactrouter.com) | 7 | Client-side routing |
| [Framer Motion](https://motion.dev) | 12 | Page transitions & animations |
| [Transformers.js](https://huggingface.co/docs/transformers.js) | 4.0.0-next.2 | In-browser ML inference |

## Project Structure

```
src/
├── main.jsx                          # Entry point
├── App.jsx                           # Router + layout shell
├── index.css                         # Tailwind + custom styles
├── workers/
│   └── tts.worker.js                 # Chatterbox model inference
├── lib/
│   ├── tts-client.js                 # Promise-based RPC to worker
│   ├── audio-recorder.js             # Mic recording + 24kHz resampling
│   ├── audio-utils.js                # WAV encoding, concat, silence
│   ├── audio-player.js               # AudioContext playback engine
│   └── constants.js                  # Model ID, sample rate, tags, templates
├── hooks/
│   ├── useTTS.js                     # Model load, generate, speaker encode
│   ├── useAudioRecorder.js           # Record / upload voice samples
│   ├── useAudioPlayer.js             # Play / pause / seek
│   └── useModelStatus.js             # Global model readiness
├── store/
│   └── app-store.js                  # Zustand store (model + per-mode state)
└── components/
    ├── layout/                       # AppShell, Sidebar, ModeHeader
    ├── shared/                       # ModelLoader, VoiceRecorder, AudioPlayer,
    │                                 # AudioWaveform, ExaggerationSlider, etc.
    ├── home/                         # Landing page with mode cards
    ├── playground/                   # TTS feature explorer
    ├── echo/                         # Voice message card maker
    ├── voicecraft/                   # Multi-character dialogue creator
    └── narrator/                     # Story reader with read-along
```

## Browser Compatibility

| Browser | WebGPU | WASM Fallback |
|---------|--------|---------------|
| Chrome 113+ | Yes | Yes |
| Edge 113+ | Yes | Yes |
| Firefox | No | Yes |
| Safari 18+ | Partial | Yes |

WebGPU provides significantly faster inference. The app auto-detects availability and falls back gracefully.

## Known Limitations

- **No paralinguistic tag support** — The Transformers.js ONNX port of Chatterbox does not currently support emotion/paralinguistic tags (e.g. `[laugh]`, `[sigh]`). Tags in input text will be ignored or read literally. This may be added in a future Transformers.js release.
- **First load is large** — The model weighs ~1.5 GB and must be downloaded on first visit. Subsequent visits use the browser cache.
- **Audio length** — Generation uses `max_new_tokens: 256`, which limits output to roughly 5-10 seconds per call. Longer text should be split into chunks.

## License

MIT

## Acknowledgments

- [Chatterbox](https://github.com/resemble-ai/chatterbox) by Resemble AI — the underlying TTS model
- [Transformers.js](https://github.com/huggingface/transformers.js) by Hugging Face — browser-based ML inference
- [ONNX Runtime Web](https://onnxruntime.ai) — the runtime powering WebGPU/WASM execution
