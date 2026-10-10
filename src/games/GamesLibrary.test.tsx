import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameShell, GamesLibrary } from './GamesLibrary';
import { BOARD_ACTIVITIES, GAMES } from './catalog';

const PLAYABLE = GAMES.filter(g => !BOARD_ACTIVITIES.includes(g.id)) as (typeof GAMES[number] & { id: Exclude<typeof GAMES[number]['id'], 'drawing'> })[];

const noop = () => {};

describe('games library', () => {
  it('lists every game with Preview and Play with class, and says nothing is saved', () => {
    const html = renderToStaticMarkup(<GamesLibrary defaultLevel="kg" close={noop} onPlay={noop} onDraw={noop} />);
    for (const g of GAMES) expect(html).toContain(g.title);
    expect(html.match(/Play with class/g)).toHaveLength(PLAYABLE.length);
    expect(html).toContain('Open drawing board');
    expect(html).toContain('Nothing about the children is saved');
    expect(html).toContain('value="kg" selected');
  });
});

describe('game shell', () => {
  it('labels a teacher preview and offers hint, sound, start over and close', () => {
    const html = renderToStaticMarkup(<GameShell id="letters" level="kg" withClass={false} close={noop} backToLibrary={noop} />);
    expect(html).toContain('Letter Sounds');
    expect(html).toContain('Preview');
    for (const label of ['Hint', 'Start over', 'Close Letter Sounds']) expect(html).toContain(`aria-label="${label}"`);
  });
  it('does not show the preview label when playing with the class', () => {
    expect(renderToStaticMarkup(<GameShell id="count" level="g1" withClass close={noop} backToLibrary={noop} />)).not.toContain('<small>Preview</small>');
  });
  it('renders every game without errors', () => {
    for (const g of PLAYABLE) expect(renderToStaticMarkup(<GameShell id={g.id} level="g1" withClass close={noop} backToLibrary={noop} />)).toContain(g.title);
  });
});
