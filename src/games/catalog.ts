export type GameCategory = 'phonics' | 'maths' | 'memory' | 'creative';
export type GameId = 'letters' | 'words' | 'count' | 'order' | 'shapes' | 'memory' | 'puzzle' | 'trace' | 'colouring' | 'drawing';
/** Activities that open the whiteboard instead of a game screen. */
export const BOARD_ACTIVITIES: GameId[] = ['drawing'];

export type GameInfo = { id: GameId; title: string; category: GameCategory; skill: string; description: string; emoji: string };

export const CATEGORIES: { id: GameCategory; title: string }[] = [
  { id: 'phonics', title: 'Phonics & Language' },
  { id: 'maths', title: 'Maths & Numbers' },
  { id: 'memory', title: 'Memory & Puzzles' },
  { id: 'creative', title: 'Creative' },
];

export const GAMES: GameInfo[] = [
  { id: 'letters', title: 'Letter Sounds', category: 'phonics', skill: 'First sounds', description: 'Hear a word and tap the letter it starts with.', emoji: '🔤' },
  { id: 'words', title: 'Build a Word', category: 'phonics', skill: 'Blending', description: 'Tap the letters in order to spell the picture.', emoji: '🧩' },
  { id: 'count', title: 'Count and Choose', category: 'maths', skill: 'Counting', description: 'Count the pictures and tap the number.', emoji: '🔢' },
  { id: 'order', title: 'Number Order', category: 'maths', skill: 'Sequencing', description: 'Tap the numbers from smallest to biggest.', emoji: '📶' },
  { id: 'shapes', title: 'Shape Match', category: 'maths', skill: 'Shapes', description: 'Hear a shape name and find it.', emoji: '🔷' },
  { id: 'memory', title: 'Memory Match', category: 'memory', skill: 'Memory', description: 'Turn over two cards at a time to find the pairs.', emoji: '🃏' },
  { id: 'puzzle', title: 'Picture Puzzle', category: 'memory', skill: 'Problem solving', description: 'Swap the pieces to put the picture back together.', emoji: '🧩' },
  { id: 'trace', title: 'Trace It', category: 'creative', skill: 'Letter and number formation', description: 'Trace big letters and numbers with a finger.', emoji: '✏️' },
  { id: 'colouring', title: 'Colouring', category: 'creative', skill: 'Colours and fine motor', description: 'Pick a colour and tap to fill in a picture.', emoji: '🎨' },
  { id: 'drawing', title: 'Free Drawing', category: 'creative', skill: 'Drawing', description: 'Open the whiteboard with crayons ready.', emoji: '🖍️' },
];

export const gameById = (id: GameId) => GAMES.find(g => g.id === id)!;
