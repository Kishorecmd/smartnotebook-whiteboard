export type GameCategory = 'phonics' | 'maths' | 'memory' | 'creative';
export type GameId = 'letters' | 'words' | 'count' | 'order' | 'shapes' | 'memory' | 'trace';

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
  { id: 'trace', title: 'Trace It', category: 'creative', skill: 'Letter and number formation', description: 'Trace big letters and numbers with a finger.', emoji: '✏️' },
];

export const gameById = (id: GameId) => GAMES.find(g => g.id === id)!;
