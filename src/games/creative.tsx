import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Check } from 'lucide-react';
import type { GameProps } from './games';
import { isSolved, puzzleSide, scrambled, swapPieces } from './logic';
import { sample, seeded } from './random';
import { playRight, playTryAgain, say } from './feedback';

/* ---------- Colouring ---------- */

type Region = { id: string; label: string; shape: ReactElement };
type Picture = { name: string; regions: Region[] };

// Simple outline pictures; each region can be filled with a colour.
const PICTURES: Picture[] = [
  { name: 'house', regions: [
    { id: 'sky', label: 'sky', shape: <rect x="0" y="0" width="200" height="150" /> },
    { id: 'sun', label: 'sun', shape: <circle cx="165" cy="32" r="18" /> },
    { id: 'ground', label: 'grass', shape: <rect x="0" y="150" width="200" height="50" /> },
    { id: 'wall', label: 'wall', shape: <rect x="50" y="85" width="100" height="80" /> },
    { id: 'roof', label: 'roof', shape: <polygon points="40,88 100,40 160,88" /> },
    { id: 'chimney', label: 'chimney', shape: <rect x="122" y="48" width="14" height="26" /> },
    { id: 'door', label: 'door', shape: <rect x="88" y="120" width="24" height="45" /> },
    { id: 'window1', label: 'left window', shape: <rect x="60" y="100" width="20" height="20" /> },
    { id: 'window2', label: 'right window', shape: <rect x="120" y="100" width="20" height="20" /> },
  ] },
  { name: 'fish', regions: [
    { id: 'water', label: 'water', shape: <rect x="0" y="0" width="200" height="200" /> },
    { id: 'tail', label: 'tail', shape: <polygon points="140,100 185,70 185,130" /> },
    { id: 'body', label: 'body', shape: <ellipse cx="95" cy="100" rx="55" ry="35" /> },
    { id: 'fin', label: 'fin', shape: <polygon points="85,68 110,45 115,72" /> },
    { id: 'stripe', label: 'stripe', shape: <path d="M100 70 Q112 100 100 130 L112 128 Q124 100 112 72Z" /> },
    { id: 'eye', label: 'eye', shape: <circle cx="62" cy="92" r="7" /> },
    { id: 'bubble1', label: 'big bubble', shape: <circle cx="35" cy="45" r="10" /> },
    { id: 'bubble2', label: 'small bubble', shape: <circle cx="22" cy="20" r="6" /> },
    { id: 'plant', label: 'water plant', shape: <path d="M150 200 Q140 170 155 150 Q165 175 158 200Z" /> },
  ] },
  { name: 'flower', regions: [
    { id: 'bg', label: 'background', shape: <rect x="0" y="0" width="200" height="200" /> },
    ...[0, 60, 120, 180, 240, 300].map((a, i) => ({ id: `petal${i}`, label: `petal ${i + 1}`, shape: <ellipse cx="100" cy="58" rx="15" ry="26" transform={`rotate(${a} 100 82)`} /> })),
    { id: 'centre', label: 'centre', shape: <circle cx="100" cy="82" r="16" /> },
    { id: 'stem', label: 'stem', shape: <rect x="96" y="104" width="8" height="66" /> },
    { id: 'leaf', label: 'leaf', shape: <path d="M104 140 Q135 120 145 135 Q128 152 104 148Z" /> },
    { id: 'pot', label: 'pot', shape: <polygon points="70,165 130,165 122,198 78,198" /> },
  ] },
];
const PALETTE = ['#e63946', '#f4a51c', '#ffd60a', '#52b788', '#2a9d8f', '#3a86ff', '#7b2cbf', '#ff8fab', '#8d5524', '#adb5bd', '#ffffff', '#1d1d1d'];

export function Colouring({ level, seed, onProgress, onFinish }: GameProps) {
  const pictures = useMemo(() => sample(PICTURES, level === 'kg' ? 2 : 3, seeded(seed)), [level, seed]);
  const [index, setIndex] = useState(0);
  const [colour, setColour] = useState(PALETTE[0]);
  const [fills, setFills] = useState<Record<string, string>>({});
  const finished = useRef(false);
  const picture = pictures[index];
  const coloured = picture.regions.filter(r => fills[r.id]).length;
  useEffect(() => { finished.current = false; onProgress(index, pictures.length); say(`Let's colour the ${picture.name}`); }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = () => {
    if (finished.current) return;
    finished.current = true; playRight();
    if (index + 1 >= pictures.length) onFinish({ firstTry: pictures.length, total: pictures.length, hints: 0, creative: true });
    else { setIndex(index + 1); setFills({}); }
  };
  return <div className="gm-colouring">
    <p className="gm-question">Pick a colour, then tap the {picture.name}.</p>
    <div className="gm-colour-area">
      <svg viewBox="0 0 200 200" className="gm-colour-picture" role="img" aria-label={`A ${picture.name} to colour, ${coloured} of ${picture.regions.length} parts coloured`}>
        {picture.regions.map(r => <g key={r.id} role="button" aria-label={`Colour the ${r.label}`} tabIndex={0}
          onClick={() => setFills(f => ({ ...f, [r.id]: colour }))} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setFills(f => ({ ...f, [r.id]: colour })); }}
          style={{ fill: fills[r.id] ?? '#fff' }}>{r.shape}</g>)}
      </svg>
      <div className="gm-palette" role="radiogroup" aria-label="Colours">
        {PALETTE.map(c => <button key={c} role="radio" aria-checked={colour === c} aria-label={`Colour ${c}`} className={colour === c ? 'is-on' : ''} style={{ background: c }} onClick={() => setColour(c)} />)}
      </div>
    </div>
    <div className="gm-trace-actions">
      <button className="gm-small" onClick={() => setFills({})}>Start again</button>
      <button className="gm-small gm-primary" onClick={next} disabled={coloured === 0}><Check size={18} />{index + 1 >= pictures.length ? 'Finished' : 'Next picture'}</button>
    </div>
  </div>;
}

/* ---------- Picture Puzzle ---------- */

const PUZZLE_PICTURES: [string, string][] = [['🦁', '#ffd166'], ['🐘', '#8ecae6'], ['🌈', '#bde0fe'], ['🚂', '#ffafcc'], ['🦋', '#caffbf'], ['🐢', '#a0c4ff']];
const PUZZLE_SIZE = 480;

function puzzleImage(emoji: string, background: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PUZZLE_SIZE;
  const g = canvas.getContext('2d');
  if (!g) return '';
  g.fillStyle = background; g.fillRect(0, 0, PUZZLE_SIZE, PUZZLE_SIZE);
  g.fillStyle = '#ffffff55'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc((i * 97) % PUZZLE_SIZE, (i * 151) % PUZZLE_SIZE, 40 + i * 6, 0, Math.PI * 2); g.fill(); }
  g.font = `${PUZZLE_SIZE * 0.72}px "Noto Color Emoji", "Segoe UI Emoji", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(emoji, PUZZLE_SIZE / 2, PUZZLE_SIZE * 0.54);
  return canvas.toDataURL();
}

export function PicturePuzzle({ level, seed, hint, onProgress, onFinish }: GameProps) {
  const side = puzzleSide(level), pieces = side * side;
  const rounds = useMemo(() => { const rng = seeded(seed); return sample(PUZZLE_PICTURES, 3, rng).map(p => ({ picture: p, order: scrambled(pieces, rng) })); }, [seed, pieces]);
  const [index, setIndex] = useState(0);
  const [order, setOrder] = useState(rounds[0].order);
  const [picked, setPicked] = useState<number | null>(null);
  const [hinted, setHinted] = useState<number | null>(null);
  const [image, setImage] = useState('');
  const state = useRef({ order: rounds[0].order, done: false, hints: 0, firstTry: 0, swaps: 0 });
  useEffect(() => {
    const round = rounds[index];
    state.current = { ...state.current, order: round.order, done: false, swaps: 0 };
    setOrder(round.order); setPicked(null); setHinted(null); setImage(puzzleImage(...round.picture));
    onProgress(index, rounds.length); say('Swap the pieces to fix the picture');
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastHint = useRef(hint);
  useEffect(() => {
    if (hint <= lastHint.current) return; lastHint.current = hint;
    const wrong = state.current.order.findIndex((p, slot) => p !== slot);
    if (wrong >= 0) { state.current.hints++; setHinted(wrong); setPicked(null); }
  }, [hint]);
  const tap = (slot: number) => {
    const s = state.current;
    if (s.done) return;
    if (picked === null) { setPicked(slot); return; }
    if (picked === slot) { setPicked(null); return; }
    const next = swapPieces(s.order, picked, slot);
    s.order = next; s.swaps++; setOrder(next); setPicked(null); setHinted(null);
    if (!isSolved(next)) { if (next[slot] !== slot && next[picked] !== picked) playTryAgain(); return; }
    s.done = true; playRight();
    // Right first time means no more swaps than a perfect solve could need.
    if (s.swaps <= pieces) s.firstTry++;
    window.setTimeout(() => {
      if (index + 1 >= rounds.length) onFinish({ firstTry: s.firstTry, total: rounds.length, hints: s.hints });
      else setIndex(index + 1);
    }, 1300);
  };
  const solved = isSolved(order);
  return <div className="gm-puzzle">
    <p className="gm-question">Tap two pieces to swap them.</p>
    <div className={`gm-puzzle-board ${solved ? 'is-done' : ''}`} style={{ gridTemplateColumns: `repeat(${side}, 1fr)` }}>
      {order.map((piece, slot) => <button key={slot} aria-label={`Piece ${slot + 1}${picked === slot ? ', picked' : ''}`} onClick={() => tap(slot)}
        className={`gm-piece ${picked === slot ? 'is-picked' : ''} ${hinted === slot ? 'is-hint' : ''}`}
        style={{ backgroundImage: image ? `url(${image})` : undefined, backgroundSize: `${side * 100}% ${side * 100}%`, backgroundPosition: `${(piece % side) * 100 / (side - 1)}% ${Math.floor(piece / side) * 100 / (side - 1)}%` }} />)}
    </div>
    <p className="gm-feedback" role="status">{solved ? 'You fixed the picture!' : picked !== null ? 'Now tap where it goes.' : ''}</p>
  </div>;
}
