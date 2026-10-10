import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Volume2, Eraser, Check } from 'lucide-react';
import type { ShapeName } from './content';
import { countRounds, letterRounds, memoryDeck, orderRounds, shapeRounds, traceCoverage, traceRounds, wordRounds, type ChoiceRound, type GameResult, type Level } from './logic';
import { seeded } from './random';
import { playRight, playTryAgain, say } from './feedback';

export type GameProps = { level: Level; seed: number; hint: number; onProgress: (done: number, total: number) => void; onFinish: (result: GameResult) => void };

/** Runs `effect` when the hint counter goes up, not on first render. */
function useHint(hint: number, effect: () => void) {
  const last = useRef(hint);
  useEffect(() => { if (hint > last.current) effect(); last.current = hint; });
}

/* ---------- Choice games: Letter Sounds, Count and Choose, Shape Match ---------- */

type ChoiceProps<T> = GameProps & {
  rounds: ChoiceRound<T>[];
  question: (round: ChoiceRound<T>) => string;
  spoken: (round: ChoiceRound<T>) => string;
  prompt: (round: ChoiceRound<T>, solved: boolean, hinted: boolean) => ReactNode;
  option: (value: string) => ReactNode;
  optionLabel: (value: string) => string;
};

function ChoiceGame<T>({ rounds, question, spoken, prompt, option, optionLabel, hint, onProgress, onFinish }: ChoiceProps<T>) {
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const score = useRef({ firstTry: 0, hints: 0 });
  // Taps can arrive faster than React re-renders; this ref closes the round at once.
  const answered = useRef(false);
  const round = rounds[index];
  useEffect(() => { answered.current = false; onProgress(index, rounds.length); say(spoken(round)); }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  useHint(hint, () => {
    if (solved) return;
    const extra = round.options.find(o => o !== round.answer && !wrong.includes(o) && !removed.includes(o));
    score.current.hints++;
    if (extra) setRemoved(r => [...r, extra]);
  });
  const choose = (value: string) => {
    if (answered.current || wrong.includes(value)) return;
    if (value !== round.answer) { playTryAgain(); setWrong(w => (w.includes(value) ? w : [...w, value])); return; }
    answered.current = true; playRight(); setSolved(true);
    if (!wrong.length && !removed.length) score.current.firstTry++;
    window.setTimeout(() => {
      if (index + 1 >= rounds.length) onFinish({ firstTry: score.current.firstTry, total: rounds.length, hints: score.current.hints });
      else { setIndex(index + 1); setWrong([]); setRemoved([]); setSolved(false); }
    }, 1100);
  };
  return <div className="gm-choice">
    <p className="gm-question">{question(round)} <button className="gm-say" aria-label="Say it again" onClick={() => say(spoken(round))}><Volume2 size={22} /></button></p>
    <div className="gm-prompt">{prompt(round, solved, removed.length > 0)}</div>
    <div className="gm-options" role="group" aria-label="Choices">
      {round.options.filter(o => !removed.includes(o)).map(o => <button key={o} aria-label={optionLabel(o)}
        className={`gm-option ${solved && o === round.answer ? 'is-right' : ''} ${wrong.includes(o) ? 'is-wrong' : ''}`}
        disabled={wrong.includes(o)} onClick={() => choose(o)}>{option(o)}</button>)}
    </div>
    <p className="gm-feedback" role="status">{solved ? 'Yes! Well done!' : wrong.length ? 'Try again. You can do it!' : ''}</p>
  </div>;
}

export function LetterSounds(props: GameProps) {
  const rounds = useMemo(() => letterRounds(props.level, seeded(props.seed)), [props.level, props.seed]);
  return <ChoiceGame {...props} rounds={rounds}
    question={() => 'What sound does it start with?'}
    spoken={r => r.prompt.word}
    prompt={(r, solved) => <><span className="gm-picture" role="img" aria-label={r.prompt.word}>{r.prompt.picture}</span>
      {solved && <span className="gm-word"><b>{r.prompt.word[0]}</b>{r.prompt.word.slice(1)}</span>}</>}
    option={o => <span className="gm-letter">{o}</span>} optionLabel={o => `Letter ${o}`} />;
}

export function CountAndChoose(props: GameProps) {
  const rounds = useMemo(() => countRounds(props.level, seeded(props.seed)), [props.level, props.seed]);
  return <ChoiceGame {...props} rounds={rounds}
    question={() => 'How many can you count?'}
    spoken={() => 'How many can you count?'}
    prompt={(r, solved, hinted) => <div className="gm-count" role="img" aria-label={solved ? `${r.prompt.count} pictures` : 'Pictures to count'}>
      {Array.from({ length: r.prompt.count }, (_, i) => <span key={i}>{r.prompt.thing}{(hinted || solved) && <small>{i + 1}</small>}</span>)}
    </div>}
    option={o => <span className="gm-number">{o}</span>} optionLabel={o => `Number ${o}`} />;
}

const SHAPE_PATHS: Record<ShapeName, ReactNode> = {
  circle: <circle cx="50" cy="50" r="40" />,
  square: <rect x="14" y="14" width="72" height="72" />,
  rectangle: <rect x="6" y="26" width="88" height="48" />,
  triangle: <polygon points="50,10 92,88 8,88" />,
  star: <polygon points="50,6 61,38 95,38 67,58 78,92 50,71 22,92 33,58 5,38 39,38" />,
  heart: <path d="M50 88 C10 60 4 30 26 18 C40 10 50 22 50 30 C50 22 60 10 74 18 C96 30 90 60 50 88Z" />,
  oval: <ellipse cx="50" cy="50" rx="44" ry="28" />,
  diamond: <polygon points="50,6 90,50 50,94 10,50" />,
  pentagon: <polygon points="50,6 93,38 77,90 23,90 7,38" />,
  hexagon: <polygon points="28,10 72,10 94,50 72,90 28,90 6,50" />,
};
const SHAPE_COLOURS = ['#e85d75', '#3a86ff', '#f4a51c', '#2a9d8f', '#8f5bd9', '#ef6f2e'];

export function ShapeMatch(props: GameProps) {
  const rounds = useMemo(() => shapeRounds(props.level, seeded(props.seed)), [props.level, props.seed]);
  return <ChoiceGame {...props} rounds={rounds}
    question={r => `Find the ${r.prompt}.`}
    spoken={r => `Find the ${r.prompt}`}
    prompt={r => <span className="gm-shape-name">{r.prompt}</span>}
    option={o => <svg viewBox="0 0 100 100" className="gm-shape" aria-hidden="true" style={{ fill: SHAPE_COLOURS[o.length % SHAPE_COLOURS.length] }}>{SHAPE_PATHS[o as ShapeName]}</svg>}
    optionLabel={o => o} />;
}

/* ---------- Build a Word ---------- */

export function BuildAWord({ level, seed, hint, onProgress, onFinish }: GameProps) {
  const rounds = useMemo(() => wordRounds(level, seeded(seed)), [level, seed]);
  const [index, setIndex] = useState(0);
  const [used, setUsed] = useState<number[]>([]);
  const [shake, setShake] = useState<number | null>(null);
  const [hinted, setHinted] = useState<number | null>(null);
  const missed = useRef(false);
  const placed = useRef<number[]>([]);
  const score = useRef({ firstTry: 0, hints: 0 });
  const round = rounds[index];
  const built = used.map(i => round.tiles[i]).join('');
  const done = built === round.word;
  useEffect(() => { placed.current = []; onProgress(index, rounds.length); say(round.word); }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextTile = () => round.tiles.findIndex((c, i) => !used.includes(i) && c === round.word[built.length]);
  useHint(hint, () => { if (!done) { score.current.hints++; missed.current = true; setHinted(nextTile()); } });
  const tap = (i: number) => {
    const sofar = placed.current;
    if (sofar.length === round.word.length || sofar.includes(i)) return;
    if (round.tiles[i] !== round.word[sofar.length]) { playTryAgain(); missed.current = true; setShake(i); window.setTimeout(() => setShake(null), 450); return; }
    const next = [...sofar, i]; placed.current = next; setUsed(next); setHinted(null);
    if (next.length === round.word.length) {
      playRight(); window.setTimeout(() => say(round.word), 250);
      if (!missed.current) score.current.firstTry++;
      window.setTimeout(() => {
        if (index + 1 >= rounds.length) onFinish({ ...score.current, total: rounds.length });
        else { setIndex(index + 1); setUsed([]); missed.current = false; }
      }, 1400);
    }
  };
  return <div className="gm-word-game">
    <p className="gm-question">Spell the word. <button className="gm-say" aria-label="Say the word" onClick={() => say(round.word)}><Volume2 size={22} /></button></p>
    <span className="gm-picture" role="img" aria-label={done ? round.word : 'Picture to spell'}>{round.picture}</span>
    <div className="gm-slots" aria-label={`Spelled so far: ${built || 'nothing yet'}`}>{round.word.split('').map((_, i) => <span key={i} className={built[i] ? 'is-filled' : ''}>{built[i] ?? ''}</span>)}</div>
    <div className="gm-tiles" role="group" aria-label="Letters">
      {round.tiles.map((c, i) => <button key={i} aria-label={`Letter ${c}`} disabled={used.includes(i)} onClick={() => tap(i)}
        className={`gm-tile ${shake === i ? 'is-shake' : ''} ${hinted === i ? 'is-hint' : ''}`}>{c}</button>)}
    </div>
    <p className="gm-feedback" role="status">{done ? `Yes! ${round.word}!` : ''}</p>
  </div>;
}

/* ---------- Number Order ---------- */

export function NumberOrder({ level, seed, hint, onProgress, onFinish }: GameProps) {
  const rounds = useMemo(() => orderRounds(level, seeded(seed)), [level, seed]);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [shake, setShake] = useState<number | null>(null);
  const [hinted, setHinted] = useState<number | null>(null);
  const missed = useRef(false);
  const order = useRef<number[]>([]);
  const score = useRef({ firstTry: 0, hints: 0 });
  const round = rounds[index];
  const done = placed.length === round.numbers.length;
  useEffect(() => { order.current = []; onProgress(index, rounds.length); say('Tap the numbers from smallest to biggest'); }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  useHint(hint, () => { if (!done) { score.current.hints++; missed.current = true; setHinted(round.numbers[placed.length]); } });
  const tap = (n: number) => {
    const sofar = order.current;
    if (sofar.length === round.numbers.length || sofar.includes(n)) return;
    if (n !== round.numbers[sofar.length]) { playTryAgain(); missed.current = true; setShake(n); window.setTimeout(() => setShake(null), 450); return; }
    const next = [...sofar, n]; order.current = next; setPlaced(next); setHinted(null); say(String(n));
    if (next.length === round.numbers.length) {
      playRight(); if (!missed.current) score.current.firstTry++;
      window.setTimeout(() => {
        if (index + 1 >= rounds.length) onFinish({ ...score.current, total: rounds.length });
        else { setIndex(index + 1); setPlaced([]); missed.current = false; }
      }, 1200);
    }
  };
  return <div className="gm-order">
    <p className="gm-question">Tap the numbers from smallest to biggest.</p>
    <ol className="gm-line" aria-label="Numbers in order">{round.numbers.map((_, i) => <li key={i} className={placed[i] !== undefined ? 'is-filled' : ''}>{placed[i] ?? ''}</li>)}</ol>
    <div className="gm-tiles" role="group" aria-label="Numbers">
      {round.shuffled.map(n => <button key={n} aria-label={`Number ${n}`} disabled={placed.includes(n)} onClick={() => tap(n)}
        className={`gm-tile ${shake === n ? 'is-shake' : ''} ${hinted === n ? 'is-hint' : ''}`}>{n}</button>)}
    </div>
    <p className="gm-feedback" role="status">{done ? 'Perfect order!' : ''}</p>
  </div>;
}

/* ---------- Memory Match ---------- */

export function MemoryMatch({ level, seed, hint, onProgress, onFinish }: GameProps) {
  const deck = useMemo(() => memoryDeck(level, seeded(seed)), [level, seed]);
  const pairs = deck.length / 2;
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [peek, setPeek] = useState(false);
  const misses = useRef(0), hints = useRef(0);
  const openNow = useRef<number[]>([]), matchedNow = useRef<number[]>([]), peeking = useRef(false);
  useEffect(() => { onProgress(matched.length / 2, pairs); }, [matched.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useHint(hint, () => { hints.current++; peeking.current = true; setPeek(true); window.setTimeout(() => { peeking.current = false; setPeek(false); }, 1500); });
  const flip = (id: number) => {
    const opened = openNow.current;
    if (peeking.current || opened.length === 2 || opened.includes(id) || matchedNow.current.includes(id)) return;
    const next = [...opened, id]; openNow.current = next; setOpen(next);
    if (next.length < 2) return;
    const [a, b] = next.map(i => deck[i]);
    if (a.picture === b.picture) {
      playRight();
      const all = [...matchedNow.current, ...next]; matchedNow.current = all; openNow.current = []; setMatched(all); setOpen([]);
      if (all.length === deck.length) window.setTimeout(() => onFinish({ firstTry: Math.max(0, pairs - misses.current), total: pairs, hints: hints.current }), 900);
    } else { misses.current++; window.setTimeout(() => { playTryAgain(); openNow.current = []; setOpen([]); }, 900); }
  };
  return <div className="gm-memory">
    <p className="gm-question">Find the matching pairs.</p>
    <div className={`gm-cards gm-cards-${deck.length}`}>
      {deck.map(card => { const shown = peek || open.includes(card.id) || matched.includes(card.id); return <button key={card.id}
        className={`gm-card ${shown ? 'is-open' : ''} ${matched.includes(card.id) ? 'is-matched' : ''}`}
        aria-label={shown ? card.picture : 'Hidden card'} onClick={() => flip(card.id)}>{shown ? card.picture : '?'}</button>; })}
    </div>
    <p className="gm-feedback" role="status">{matched.length / 2} of {pairs} pairs found</p>
  </div>;
}

/* ---------- Trace It ---------- */

const TRACE_SIZE = 480;
const glyphFont = `bold ${Math.round(TRACE_SIZE * 0.78)}px Inter, Arial, sans-serif`;

export function TraceIt({ level, seed, hint, onProgress, onFinish }: GameProps) {
  const rounds = useMemo(() => traceRounds(level, seeded(seed)), [level, seed]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [strongGuide, setStrongGuide] = useState(false);
  const guide = useRef<HTMLCanvasElement>(null), ink = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false), cleared = useRef(false), finished = useRef(false);
  const score = useRef({ firstTry: 0, hints: 0 });
  const glyph = rounds[index];
  useEffect(() => {
    finished.current = false;
    onProgress(index, rounds.length); say(`Trace ${/\d/.test(glyph) ? 'the number' : 'the letter'} ${glyph}`);
    const g = guide.current?.getContext('2d'), k = ink.current?.getContext('2d');
    if (!g || !k) return;
    g.clearRect(0, 0, TRACE_SIZE, TRACE_SIZE); k.clearRect(0, 0, TRACE_SIZE, TRACE_SIZE);
    g.font = glyphFont; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000';
    g.fillText(glyph, TRACE_SIZE / 2, TRACE_SIZE * 0.54);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  useHint(hint, () => { score.current.hints++; cleared.current = true; setStrongGuide(true); });
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return [(e.clientX - r.left) * TRACE_SIZE / r.width, (e.clientY - r.top) * TRACE_SIZE / r.height] as const; };
  // Done moves on without tracing (a teacher's choice), so only real tracing counts as right first time.
  const finishRound = (traced: boolean) => {
    if (finished.current) return;
    finished.current = true;
    playRight(); setDone(true); if (traced && !cleared.current) score.current.firstTry++;
    window.setTimeout(() => {
      if (index + 1 >= rounds.length) onFinish({ ...score.current, total: rounds.length });
      else { setIndex(index + 1); setDone(false); setStrongGuide(false); cleared.current = false; }
    }, 1300);
  };
  const check = () => {
    const g = guide.current?.getContext('2d'), k = ink.current?.getContext('2d');
    if (!g || !k || finished.current) return;
    const coverage = traceCoverage(g.getImageData(0, 0, TRACE_SIZE, TRACE_SIZE).data, k.getImageData(0, 0, TRACE_SIZE, TRACE_SIZE).data);
    if (coverage >= 0.6) finishRound(true);
  };
  const clear = () => { cleared.current = true; ink.current?.getContext('2d')?.clearRect(0, 0, TRACE_SIZE, TRACE_SIZE); };
  return <div className="gm-trace">
    <p className="gm-question">Trace the {/\d/.test(glyph) ? 'number' : 'letter'} with your finger.</p>
    <div className={`gm-trace-board ${strongGuide ? 'is-hint' : ''} ${done ? 'is-done' : ''}`}>
      <canvas ref={guide} width={TRACE_SIZE} height={TRACE_SIZE} className="gm-trace-guide" aria-label={`The ${glyph} to trace`} role="img" />
      <canvas ref={ink} width={TRACE_SIZE} height={TRACE_SIZE} className="gm-trace-ink"
        onPointerDown={e => { if (done) return; e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; const k = e.currentTarget.getContext('2d')!; const [x, y] = point(e); k.lineWidth = 44; k.lineCap = 'round'; k.lineJoin = 'round'; k.strokeStyle = '#2a9d8f'; k.beginPath(); k.moveTo(x, y); k.lineTo(x, y); k.stroke(); }}
        onPointerMove={e => { if (!drawing.current) return; const k = e.currentTarget.getContext('2d')!; const [x, y] = point(e); k.lineTo(x, y); k.stroke(); }}
        onPointerUp={() => { drawing.current = false; check(); }} onPointerCancel={() => { drawing.current = false; }} />
    </div>
    <div className="gm-trace-actions">
      <button className="gm-small" onClick={clear} disabled={done}><Eraser size={18} />Clear</button>
      <button className="gm-small" onClick={() => !done && finishRound(false)} disabled={done}><Check size={18} />Done</button>
    </div>
    <p className="gm-feedback" role="status">{done ? 'Beautiful tracing!' : ''}</p>
  </div>;
}
