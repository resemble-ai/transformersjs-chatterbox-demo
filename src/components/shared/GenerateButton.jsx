export default function GenerateButton({ onClick, disabled, generating, label = 'Generate Speech' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || generating}
      className={`w-full px-5 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
        disabled || generating
          ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          : 'bg-violet-600 hover:bg-violet-500 text-white'
      }`}
    >
      {generating ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
          </svg>
          Generating...
        </>
      ) : (
        label
      )}
    </button>
  )
}
