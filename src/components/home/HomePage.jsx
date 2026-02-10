import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ModelLoader from '../shared/ModelLoader'
import { useModelStatus } from '../../hooks/useModelStatus'

const modes = [
  {
    to: '/playground',
    title: 'Playground',
    description: 'Explore all Chatterbox features. Record your voice, adjust expressiveness, and generate speech.',
    gradient: 'from-violet-600 to-purple-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    ),
  },
  {
    to: '/echo',
    title: 'Echo',
    description: 'Create personalized voice message cards for birthdays, holidays, and more.',
    gradient: 'from-pink-600 to-rose-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    to: '/voicecraft',
    title: 'VoiceCraft',
    description: 'Build multi-character dialogues with different voices and export as audio.',
    gradient: 'from-cyan-600 to-blue-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/narrator',
    title: 'Narrator',
    description: 'Turn stories into narrated audiobooks with character voices and read-along.',
    gradient: 'from-amber-600 to-orange-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function HomePage() {
  const { isReady } = useModelStatus()

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-3">
          <span className="text-gradient bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400">
            Chatterbox TTS
          </span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          100% in-browser text-to-speech with zero-shot voice cloning and expressiveness control.
          Powered by{' '}
          <a
            href="https://github.com/huggingface/transformers.js"
            target="_blank"
            rel="noopener"
            className="text-violet-400 hover:text-violet-300"
          >
            Transformers.js
          </a>
        </p>
      </motion.div>

      <div className="max-w-lg mx-auto mb-12">
        <ModelLoader />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {modes.map((mode) => (
          <motion.div key={mode.to} variants={item}>
            <Link
              to={mode.to}
              className={`block p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-all group ${
                !isReady ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-4 text-white group-hover:scale-105 transition-transform`}
              >
                {mode.icon}
              </div>
              <h3 className="text-lg font-semibold mb-1">{mode.title}</h3>
              <p className="text-sm text-zinc-400">{mode.description}</p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
