import { useEffect, useState, type ComponentType } from 'react';
import { X, Lightbulb, Volume2, VolumeX, RotateCcw, Play, Eye, PartyPopper } from 'lucide-react';
import { BOARD_ACTIVITIES, CATEGORIES, GAMES, gameById, type GameCategory, type GameId } from './catalog';
import { BuildAWord, CountAndChoose, LetterSounds, MemoryMatch, NumberOrder, ShapeMatch, TraceIt, type GameProps } from './games';
import { Colouring, PicturePuzzle } from './creative';
import { encouragement, type GameResult, type Level } from './logic';
import { randomSeed } from './random';
import { playFinish, setSoundOn, soundOn } from './feedback';
import './games.css';

const COMPONENTS: Record<Exclude<GameId, 'drawing'>, ComponentType<GameProps>> = { letters: LetterSounds, words: BuildAWord, count: CountAndChoose, order: NumberOrder, shapes: ShapeMatch, memory: MemoryMatch, puzzle: PicturePuzzle, trace: TraceIt, colouring: Colouring };
const LEVELS: [Level, string][] = [['kg', 'KG (LKG and UKG)'], ['g1', 'Grade 1 and 2']];

type LibraryProps = { defaultLevel: Level; close: () => void; onPlay: (id: GameId, level: Level, withClass: boolean) => void; onDraw: () => void };

/** Where a teacher chooses a game: preview it alone, or play it with the class in Student Mode. */
export function GamesLibrary({ defaultLevel, close, onPlay, onDraw }: LibraryProps) {
  const [category, setCategory] = useState<GameCategory | 'all'>('all');
  const [level, setLevel] = useState<Level>(defaultLevel);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [close]);
  const games = GAMES.filter(g => category === 'all' || g.category === category);
  return <div className="gm-overlay" role="dialog" aria-modal="true" aria-label="Learning games">
    <header className="gm-library-header">
      <div><h2>Learning games</h2><p>No sign-in or internet needed. Nothing about the children is saved.</p></div>
      <label>Level<select value={level} onChange={e => setLevel(e.target.value as Level)}>{LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <button className="gm-icon" aria-label="Close learning games" onClick={close}><X size={26} /></button>
    </header>
    <nav className="gm-filters" aria-label="Game categories">
      {[{ id: 'all' as const, title: 'All games' }, ...CATEGORIES].map(c => <button key={c.id} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.title}</button>)}
    </nav>
    <ul className="gm-grid">
      {games.map(g => <li key={g.id} className={`gm-tile-card gm-cat-${g.category}`}>
        <span className="gm-tile-emoji" aria-hidden="true">{g.emoji}</span>
        <h3>{g.title}</h3>
        <p>{g.description}</p>
        <small>{CATEGORIES.find(c => c.id === g.category)!.title} · {g.skill}</small>
        <div className="gm-tile-actions">
          {BOARD_ACTIVITIES.includes(g.id)
            ? <button className="gm-small gm-primary" onClick={onDraw}><Play size={18} />Open drawing board</button>
            : <><button className="gm-small" onClick={() => onPlay(g.id, level, false)}><Eye size={18} />Preview</button>
              <button className="gm-small gm-primary" onClick={() => onPlay(g.id, level, true)}><Play size={18} />Play with class</button></>}
        </div>
      </li>)}
    </ul>
  </div>;
}

type ShellProps = { id: Exclude<GameId, 'drawing'>; level: Level; withClass: boolean; close: () => void; backToLibrary: () => void };

/** Full-screen play: progress, hint, sound, start over, and a kind summary at the end. */
export function GameShell({ id, level, withClass, close, backToLibrary }: ShellProps) {
  const info = gameById(id);
  const Game = COMPONENTS[id];
  const [seed, setSeed] = useState(randomSeed);
  const [hint, setHint] = useState(0);
  const [progress, setProgress] = useState<[number, number]>([0, 1]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [sound, setSound] = useState(soundOn);
  const restart = () => { setSeed(randomSeed()); setHint(0); setResult(null); };
  useEffect(() => { if (result) playFinish(); }, [result]);
  return <div className={`gm-overlay gm-play gm-cat-${info.category}`} role="dialog" aria-modal="true" aria-label={info.title}>
    <header className="gm-play-header">
      <h2><span aria-hidden="true">{info.emoji}</span>{info.title}{!withClass && <small>Preview</small>}</h2>
      {!result && <div className="gm-progress" aria-label={`Round ${Math.min(progress[0] + 1, progress[1])} of ${progress[1]}`}>
        {Array.from({ length: progress[1] }, (_, i) => <span key={i} className={i < progress[0] ? 'is-done' : i === progress[0] ? 'is-now' : ''} />)}
      </div>}
      <div className="gm-play-actions">
        {!result && <button className="gm-icon" aria-label="Hint" title="Hint" onClick={() => setHint(h => h + 1)}><Lightbulb size={24} /></button>}
        <button className="gm-icon" aria-label={sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={sound} onClick={() => { setSoundOn(!sound); setSound(!sound); }}>{sound ? <Volume2 size={24} /> : <VolumeX size={24} />}</button>
        <button className="gm-icon" aria-label="Start over" title="Start over" onClick={restart}><RotateCcw size={24} /></button>
        <button className="gm-icon" aria-label={`Close ${info.title}`} onClick={close}><X size={26} /></button>
      </div>
    </header>
    <main className="gm-stage">
      {result ? <section className="gm-summary" aria-live="polite">
        <PartyPopper size={64} aria-hidden="true" />
        <h3>All done!</h3>
        <p className="gm-summary-main">{encouragement(result)}</p>
        {!result.creative && <p>{result.firstTry} of {result.total} right first time{result.hints ? ` · ${result.hints} ${result.hints === 1 ? 'hint' : 'hints'} used` : ''}</p>}
        <div className="gm-tile-actions">
          <button className="gm-small gm-primary" onClick={restart}><RotateCcw size={18} />Play again</button>
          <button className="gm-small" onClick={backToLibrary}>{withClass ? 'Finish' : 'More games'}</button>
        </div>
      </section> : <Game key={`${seed}-${level}`} level={level} seed={seed} hint={hint} onProgress={(done, total) => setProgress([done, total])} onFinish={setResult} />}
    </main>
  </div>;
}
