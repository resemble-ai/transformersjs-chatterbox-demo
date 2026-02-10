export const MODEL_ID = 'onnx-community/chatterbox-ONNX'
export const SAMPLE_RATE = 24000
export const DEFAULT_EXAGGERATION = 0.5
export const MIN_EXAGGERATION = 0
export const MAX_EXAGGERATION = 1.5

export const PARALINGUISTIC_TAGS = [
  { tag: '[laugh]', label: 'Laugh' },
  { tag: '[sigh]', label: 'Sigh' },
  { tag: '[cough]', label: 'Cough' },
  { tag: '[sniffle]', label: 'Sniffle' },
  { tag: '[groan]', label: 'Groan' },
  { tag: '[gasp]', label: 'Gasp' },
  { tag: '[yawn]', label: 'Yawn' },
  { tag: '[clearing throat]', label: 'Clear Throat' },
]

export const ECHO_TEMPLATES = [
  { id: 'birthday', label: 'Birthday', emoji: '🎂', gradient: 'from-pink-600 to-purple-600' },
  { id: 'thankyou', label: 'Thank You', emoji: '💜', gradient: 'from-violet-600 to-indigo-600' },
  { id: 'holiday', label: 'Holiday', emoji: '🎄', gradient: 'from-green-600 to-emerald-600' },
  { id: 'congrats', label: 'Congrats', emoji: '🎉', gradient: 'from-amber-500 to-orange-600' },
  { id: 'getwell', label: 'Get Well', emoji: '🌻', gradient: 'from-yellow-500 to-lime-500' },
  { id: 'love', label: 'Love', emoji: '❤️', gradient: 'from-rose-600 to-red-600' },
]

export const SAMPLE_STORIES = [
  {
    id: 'fox',
    title: 'The Fox and the Grapes',
    text: `A hungry Fox came upon a vineyard where clusters of ripe grapes hung from a tall trellis.

"Those grapes look absolutely delicious," he said to himself. He backed up and took a running leap, snapping at the nearest bunch, but missed.

He tried again and again, jumping higher each time, but the grapes were always just out of reach.

Finally, exhausted and frustrated, the Fox turned away. "Those grapes are probably sour anyway," he muttered as he walked off. "Who wants sour grapes?"

And so it is with many people. What they cannot have, they pretend to despise.`,
  },
  {
    id: 'robot',
    title: 'The Last Robot',
    text: `The city had been empty for years. Rain fell on cracked pavement, weeds grew through the sidewalks, and silence filled every room.

Except for Unit Seven.

"Good morning," it said to no one, as it had every day for three thousand, two hundred and fourteen days. It swept the lobby floor, arranged the wilted flowers, and checked the mailbox.

"No mail today," Unit Seven reported. It paused by the window. "The clouds look lovely."

A bird landed on the windowsill. Unit Seven tilted its head. "Hello," it said. "Would you like to come inside? I could make tea."

The bird chirped once and flew away. Unit Seven watched it go, something flickering in its circuits that it could not name.

"Perhaps tomorrow," it whispered.`,
  },
  {
    id: 'stars',
    title: 'Counting Stars',
    text: `"How many stars are there?" asked Maya, lying on the grass.

Her grandfather smiled. "More than all the grains of sand on every beach."

"That's impossible," Maya said. "Nobody could count that high."

"You're right," he agreed. "But that doesn't mean we shouldn't try."

They lay together in comfortable silence, the Milky Way stretching above them like spilled paint across a dark canvas.

"Grandpa?" Maya whispered.

"Yes?"

"I counted forty-seven."

He laughed softly. "That's a very good start."`,
  },
]

export const CHARACTER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]
