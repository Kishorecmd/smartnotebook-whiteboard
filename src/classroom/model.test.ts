import { describe, expect, it } from 'vitest';
import { initialWorkspace, makeGroups, makeScreen, makeWidget, parseWorkspace, readNames, remainingSeconds, restoreWidget, widgetSchema } from './model';

describe('Classroom screens', () => {
  it('round trips widget content, positions, and the active screen', () => {
    const workspace = initialWorkspace();
    const second = makeScreen('teams');
    second.widgets[0].data.text = 'Read chapter 4';
    second.widgets[1].data.endAt = 100000;
    second.widgets[0].x = 0.25;
    workspace.screens.push(second);
    workspace.activeId = second.id;
    expect(parseWorkspace(JSON.stringify(workspace))).toEqual(workspace);
  });
  it('rejects malformed backups and duplicate screen identifiers', () => {
    expect(() => parseWorkspace('{broken')).toThrow();
    const workspace = initialWorkspace();
    workspace.screens[0].widgets[0].width = -1;
    expect(() => parseWorkspace(JSON.stringify(workspace))).toThrow();
    const duplicate = initialWorkspace();
    duplicate.screens.push(duplicate.screens[0]);
    expect(() => parseWorkspace(JSON.stringify(duplicate))).toThrow('Duplicate screens');
  });
  it('falls back to the first screen when the active screen is missing', () => {
    const workspace = initialWorkspace();
    workspace.activeId = 'missing';
    expect(parseWorkspace(JSON.stringify(workspace)).activeId).toBe(workspace.screens[0].id);
  });
  it('creates valid positions even on a screen with many widgets', () => {
    for (let i = 0; i < 60; i++) expect(widgetSchema.safeParse(makeWidget('text', i)).success).toBe(true);
  });
});
describe('Classroom timer', () => {
  it('uses a deadline so elapsed time survives reloads and inactive tabs', () => {
    const data = { duration: 60, remaining: 60, endAt: 160000 };
    expect(remainingSeconds(data, 100000)).toBe(60);
    expect(remainingSeconds(JSON.parse(JSON.stringify(data)), 130500)).toBe(30);
    expect(remainingSeconds(data, 200000)).toBe(0);
  });
  it('keeps a paused timer unchanged', () => {
    expect(remainingSeconds({ remaining: 23, endAt: null }, 9999999)).toBe(23);
  });
});
describe('Class lists', () => {
  it('trims names and ignores blank lines', () => {
    expect(readNames(' Asha \r\n\n Ravi\nMeera ')).toEqual(['Asha', 'Ravi', 'Meera']);
  });
  it('assigns every student once to balanced groups without modifying the list', () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const original = [...names];
    const groups = makeGroups(names, 3, () => 0.5);
    expect(groups.map(g => g.length)).toEqual([3, 2, 2]);
    expect(groups.flat().sort()).toEqual(original);
    expect(names).toEqual(original);
    expect(makeGroups(names, 20).length).toBe(names.length);
  });
});

describe('Undo at the screen capacity limit', () => {
  it('keeps the backup valid when the deleted widget slot has been filled', () => {
    const workspace = initialWorkspace();
    const screen = workspace.screens[0];
    screen.widgets = Array.from({ length: 60 }, (_, i) => makeWidget('text', i));
    const removed = screen.widgets.pop()!;
    screen.widgets.push(makeWidget('clock', 59));
    const full = restoreWidget(workspace, screen.id, removed);
    expect(full).toBe(workspace);
    expect(parseWorkspace(JSON.stringify(full)).screens[0].widgets).toHaveLength(60);
    screen.widgets.pop();
    const restored = restoreWidget(workspace, screen.id, removed);
    expect(restored.screens[0].widgets).toHaveLength(60);
    expect(restored.screens[0].widgets.at(-1)).toEqual(removed);
    expect(restoreWidget(restored, screen.id, removed)).toBe(restored);
    expect(parseWorkspace(JSON.stringify(restored))).toEqual(restored);
  });
});
