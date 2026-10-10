import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WidgetContent } from './Widgets';
import { makeWidget, type WidgetKind } from './model';
import { LiveClassContext } from '../dashboard/data';
import { previewData } from '../dashboard/preview';

const sample = previewData('Grade 3', 'normal', Date.now());
const render = (kind: WidgetKind, live: { mapping: typeof sample.mapping | null; snapshot: typeof sample.snapshot | null }) => renderToStaticMarkup(
  <LiveClassContext.Provider value={{ ...live, presenting: false }}>
    <WidgetContent widget={makeWidget(kind, 0)} now={Date.now()} update={() => {}} />
  </LiveClassContext.Provider>,
);

describe('Random name, Group maker and Scoreboard', () => {
  it('use typed names when no class is connected', () => {
    const html = render('random', { mapping: null, snapshot: null });
    expect(html).toContain('Class names');
    expect(html).not.toContain('appears here when you are signed in');
  });
  it('still work with typed names when a class is chosen but its list has not loaded', () => {
    for (const kind of ['random', 'groups'] as const) {
      const html = render(kind, { mapping: sample.mapping, snapshot: null });
      expect(html).toContain('Class names');
      expect(html).toContain('appears here when you are signed in');
      expect(html).not.toContain('Connect your classroom to load students');
    }
    expect(render('score', { mapping: sample.mapping, snapshot: null })).toContain('Team A name');
  });
  it('use the class list once it has loaded', () => {
    const html = render('random', { mapping: sample.mapping, snapshot: sample.snapshot });
    expect(html).toContain('students available');
    expect(html).not.toContain('Class names');
    expect(render('score', { mapping: sample.mapping, snapshot: sample.snapshot })).toContain('Make two temporary teams');
  });
});

describe('Dice', () => {
  it('draws a 3D die with every face and announces the roll', () => {
    const html = render('dice', { mapping: null, snapshot: null });
    expect(html.match(/cs-die-face /g)).toHaveLength(6);
    expect(html.match(/is-pip/g)).toHaveLength(21);
    expect(html).toContain('You rolled 1');
    expect(html).toContain('Roll the dice');
  });
});
