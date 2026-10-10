import { Check } from 'lucide-react';
import { displayTime, type TimetableItem } from './homeModel';

/** The day's periods side by side, with the current one highlighted. */
export function TimetableStrip({ items, holiday, emptyText }: { items: TimetableItem[]; holiday?: string; emptyText: string }) {
  return <section className="sc-timetable" aria-label="Today's timetable">
    <h2>Today</h2>
    {holiday ? <p className="sc-timetable-empty">{holiday}</p>
      : items.length === 0 ? <p className="sc-timetable-empty">{emptyText}</p>
      : <ol>
        {items.map(({ period, state }) => <li key={`${period.id}-${period.start}`} className={`sc-period sc-period-${state}`} aria-current={state === 'now' ? 'time' : undefined}>
          <time>{displayTime(period.start)}</time>
          <b>{period.subject}</b>
          <span className="sc-period-state">{state === 'now' ? 'Now' : state === 'done' ? <><Check size={14} aria-hidden="true" />Done</> : ''}</span>
        </li>)}
      </ol>}
  </section>;
}
