import { z } from 'zod';

export const widgetKinds = ['text', 'timer', 'clock', 'random', 'groups', 'symbols', 'traffic', 'dice', 'score'] as const;
export type WidgetKind = typeof widgetKinds[number];
export const backgrounds = ['meadow', 'sunrise', 'lavender', 'paper', 'midnight'] as const;
const value = z.union([z.string().max(30000), z.number().finite(), z.boolean(), z.null()]);
export const widgetSchema = z.object({
  id: z.string(), kind: z.enum(widgetKinds), x: z.number().min(0).max(1), y: z.number().min(0).max(1),
  width: z.number().min(220).max(900), height: z.number().min(180).max(800),
  data: z.record(z.string(), value),
});
export const screenSchema = z.object({ id: z.string(), title: z.string().max(100), background: z.enum(backgrounds), widgets: z.array(widgetSchema).max(60) });
export const workspaceSchema = z.object({ version: z.literal(1), activeId: z.string(), screens: z.array(screenSchema).min(1).max(50) });
export type ClassroomWidget = z.infer<typeof widgetSchema>;
export type ClassroomScreen = z.infer<typeof screenSchema>;
export type ClassroomWorkspace = z.infer<typeof workspaceSchema>;
export const STORAGE_KEY = 'jhw_classroom_workspace_v1';
const id = () => crypto.randomUUID();
export const labels: Record<WidgetKind, string> = { text: 'Text', timer: 'Timer', clock: 'Clock', random: 'Random name', groups: 'Group maker', symbols: 'Work symbols', traffic: 'Traffic light', dice: 'Dice', score: 'Scoreboard' };
export function makeWidget(kind: WidgetKind, index = 0): ClassroomWidget {
  const data: ClassroomWidget['data'] = {};
  if (kind === 'text') Object.assign(data, { heading: 'Today’s focus', text: 'Write your instructions here.\n\nWhat will we learn today?' });
  if (kind === 'timer') Object.assign(data, { duration: 600, remaining: 600, endAt: null });
  if (kind === 'symbols') data.mode = 'quiet';
  if (kind === 'traffic') data.light = 'green';
  if (kind === 'dice') Object.assign(data, { count: 1, result: '1' });
  if (kind === 'random' || kind === 'groups') Object.assign(data, { names: '', result: '', groupCount: 3 });
  if (kind === 'score') Object.assign(data, { nameA: 'Team Sun', nameB: 'Team Moon', scoreA: 0, scoreB: 0 });
  return { id: id(), kind, x: 0.06 + (index % 3) * 0.29, y: 0.13 + (Math.floor(index / 3) % 5) * 0.08, width: kind === 'text' ? 390 : 300, height: kind === 'text' ? 380 : kind === 'timer' ? 350 : 300, data };
}
export function makeScreen(template: 'welcome' | 'focus' | 'teams' | 'blank' = 'blank'): ClassroomScreen {
  const screen: ClassroomScreen = { id: id(), title: { welcome: 'Morning welcome', focus: 'Quiet focus', teams: 'Team challenge', blank: 'Untitled screen' }[template], background: 'meadow', widgets: [] };
  if (template === 'blank') return screen;
  const note = makeWidget('text'); note.x = 0.03; note.y = 0.14;
  note.data = template === 'welcome' ? { heading: 'Good morning, class!', text: 'A fresh start. A curious mind.\n\n01   Settle in and get comfortable.\n02   Get your notebook ready.\n03   Let’s discover something new.' }
    : template === 'focus' ? { heading: 'A little time to focus.', text: 'Read the question carefully.\nThink it through on your own.\nWrite down your ideas.\n\nYou’ve got this.' }
    : { heading: 'Better together.', text: 'Listen to every idea.\nMake sure everyone has a role.\nBe kind. Be curious.\n\nWhat can your team discover?' };
  const timer = makeWidget('timer'); timer.x = 0.39; timer.y = 0.14;
  const third = makeWidget(template === 'teams' ? 'score' : 'symbols'); third.x = 0.69; third.y = 0.14;
  if (template === 'teams') { screen.background = 'sunrise'; third.width = 320; }
  if (template === 'focus') screen.background = 'lavender';
  screen.widgets = [note, timer, third];
  return screen;
}
export function initialWorkspace(): ClassroomWorkspace {
  const screen = makeScreen('welcome');
  return { version: 1, activeId: screen.id, screens: [screen] };
}
export function parseWorkspace(raw: string): ClassroomWorkspace {
  const workspace = workspaceSchema.parse(JSON.parse(raw));
  const screenIds = workspace.screens.map(s => s.id);
  if (new Set(screenIds).size !== screenIds.length) throw new Error('Duplicate screens');
  for (const screen of workspace.screens) if (new Set(screen.widgets.map(w => w.id)).size !== screen.widgets.length) throw new Error('Duplicate widgets');
  if (!screenIds.includes(workspace.activeId)) workspace.activeId = screenIds[0];
  return workspace;
}
export function remainingSeconds(data: ClassroomWidget['data'], now: number): number {
  return typeof data.endAt === 'number' ? Math.max(0, Math.ceil((data.endAt - now) / 1000)) : Math.max(0, Number(data.remaining) || 0);
}
export function readNames(raw: string): string[] { return raw.split(/\r?\n/).map(n => n.trim()).filter(Boolean).slice(0, 500); }
export function makeGroups(names: string[], count: number, random = Math.random): string[][] {
  const shuffled = [...names];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const groups: string[][] = Array.from({ length: Math.max(1, Math.min(Math.floor(count) || 1, names.length || 1)) }, () => []);
  shuffled.forEach((name, i) => groups[i % groups.length].push(name));
  return groups;
}



/** Keep restored screens valid even when another widget filled the freed slot. */
export function restoreWidget(workspace: ClassroomWorkspace, screenId: string, widget: ClassroomWidget): ClassroomWorkspace {
  const screen = workspace.screens.find(s => s.id === screenId);
  if (!screen || screen.widgets.length >= 60 || screen.widgets.some(w => w.id === widget.id)) return workspace;
  return { ...workspace, screens: workspace.screens.map(s => s.id === screenId ? { ...s, widgets: [...s.widgets, widget] } : s) };
}
