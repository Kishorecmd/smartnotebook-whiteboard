import { CheckCircle2, Circle, Target, Pencil, Lightbulb, Volume2, Cake } from 'lucide-react';
import { CVC_WORDS, LETTER_PICTURES } from '../games/content';
import { say } from '../games/feedback';
import { Avatar } from '../dashboard/Avatar';
import type { Student } from '../dashboard/model';
import { wordOfTheDay, type Objective } from './homeModel';

/** Today's learning objectives; the teacher ticks them off as the lesson goes. */
export function ObjectivesCard({ objectives, studentMode, onToggle, onEdit }: { objectives: Objective[]; studentMode: boolean; onToggle: (index: number) => void; onEdit: () => void }) {
  return <section className="sc-card sc-mini sc-objectives" aria-label="Today's learning objectives">
    <h2><Target size={17} aria-hidden="true" />Today’s learning
      {!studentMode && <button className="sc-link sc-card-action" onClick={onEdit}><Pencil size={15} />{objectives.length ? 'Edit' : 'Add objectives'}</button>}</h2>
    {objectives.length ? <ul>
      {objectives.map((o, i) => <li key={i}>
        {studentMode
          ? <span className={o.done ? 'is-done' : ''}>{o.done ? <CheckCircle2 size={22} aria-label="Done" /> : <Circle size={22} aria-label="Not yet" />}{o.text}</span>
          : <button className={o.done ? 'is-done' : ''} aria-pressed={o.done} onClick={() => onToggle(i)}>{o.done ? <CheckCircle2 size={22} aria-hidden="true" /> : <Circle size={22} aria-hidden="true" />}{o.text}</button>}
      </li>)}
    </ul> : <p className="sc-card-copy">{studentMode ? 'Let’s learn something new today.' : 'Add what the class will learn today.'}</p>}
  </section>;
}

const WORDS = [...LETTER_PICTURES, ...CVC_WORDS].filter((w, i, all) => all.findIndex(x => x.word === w.word) === i);

/** A picture word that changes each day, with a button to hear it. */
export function WordOfTheDay({ date }: { date: string }) {
  const { word, picture } = wordOfTheDay(date, WORDS);
  return <section className="sc-card sc-mini sc-word-day" aria-label="Word of the day">
    <h2><Lightbulb size={17} aria-hidden="true" />Word of the day</h2>
    <div className="sc-word-body">
      <span className="sc-word-picture" role="img" aria-label={word}>{picture}</span>
      <b>{word[0].toUpperCase() + word.slice(1)}</b>
      <button className="sc-say" aria-label={`Say ${word}`} onClick={() => say(word)}><Volume2 size={22} /></button>
    </div>
  </section>;
}

/** Birthdays today, for the teacher. Hidden in Student Mode with the other student names. */
export function BirthdayCard({ students }: { students: Student[] }) {
  return <section className="sc-card sc-mini sc-birthday" aria-label="Birthdays today">
    <h2><Cake size={17} aria-hidden="true" />Birthday wishes</h2>
    <ul>{students.slice(0, 3).map(s => <li key={s.id}><Avatar name={s.name} photo={s.photo} /><span>Happy birthday, <b>{s.name.split(' ')[0]}</b>!</span></li>)}</ul>
    {students.length > 3 && <p className="sc-meta">and {students.length - 3} more</p>}
  </section>;
}
