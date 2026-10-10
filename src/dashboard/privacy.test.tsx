import { describe, expect, it, vi } from 'vitest';
vi.mock('../store', () => ({ useWhiteboardStore: { getState: () => ({}) } }));
import { renderToStaticMarkup } from 'react-dom/server';
import { ConnectionDialog } from './dialogs';
import { HomeScreen } from '../home/HomeScreen';
import { previewData } from './preview';
import type { ClassroomData } from './data';

const noop = () => {};
const teacher = { role: 'teacher' as const, name: 'Sample teacher', classes: [] };
// A complete ClassroomData with inert actions; tests override only what they exercise.
const fakeData = (overrides: Partial<ClassroomData> = {}): ClassroomData => ({
  mapping: null, snapshot: null, weather: null, session: null, ready: true, checked: true, erpBase: '', error: '', loading: false,
  refresh: noop, setSession: noop, saveMapping: noop, logout: async () => {}, ...overrides,
});
const home = (props: Partial<Parameters<typeof HomeScreen>[0]>) => renderToStaticMarkup(<HomeScreen now={Date.now()} mapping={null} snapshot={null} studentMode={false} data={fakeData()} preview={false} onPreview={noop} onStartLesson={noop} onConnection={noop} onTakeAttendance={noop} {...props} />);

describe('Student Mode', () => {
  it('removes students, attendance and teacher-only notices but keeps the learning goal and public notices', () => {
    const sample = previewData('Grade 3', 'normal', Date.now());
    const html = home({ ...sample, studentMode: true, preview: true, data: fakeData({ session: teacher }) });
    expect(html).not.toContain('Sample Student');
    expect(html).not.toContain('Teacher reminder');
    expect(html).not.toContain('Today&#x27;s attendance');
    expect(html).not.toContain('Start lesson');
    expect(html).not.toContain('Edit goal');
    expect(html).toContain('Today’s learning');
    expect(html).toContain('bring your favourite story');
  });
  it('shows the register entry points in teacher mode', () => {
    const sample = previewData('Grade 3', 'normal', Date.now());
    const html = home({ ...sample, preview: true });
    expect(html).toContain('Today&#x27;s attendance');
    expect(html).toContain('students in class');
    for (const tile of ['Present', 'Absent', 'Late']) expect(html).toContain(`</b>${tile}<`);
    expect(html).toContain('Word of the day');
    expect(html).toContain('Start lesson');
  });
});

describe('offline dashboard', () => {
  it('keeps teaching reachable when the ERP and weather fail', () => {
    const { mapping } = previewData('Grade 3', 'normal', Date.now());
    const html = home({ mapping, data: fakeData({ error: 'ERP_UNAVAILABLE', session: teacher }) });
    expect(html).toContain('Attendance is unavailable right now');
    expect(html).toContain('Start lesson');
    expect(html).not.toContain('0%');
  });
  it('asks a signed-out board to sign in without inventing class data', () => {
    const html = home({});
    expect(html).toContain('Teacher sign in');
    expect(html).toContain('Sign in to see today’s lessons');
    expect(html).not.toMatch(/\d+ present/);
  });
});

it('offers class teacher login without an administrator role selector', () => {
  const html = renderToStaticMarkup(<ConnectionDialog data={fakeData()} close={noop} />);
  expect(html).toContain('Class teacher sign in'); expect(html).toContain('current-password'); expect(html).not.toContain('Administrator'); expect(html).not.toContain('Sign in as');
});
it('offers only assigned class teacher sections and selects the single assignment', () => {
  const html = renderToStaticMarkup(<ConnectionDialog data={fakeData({ session: { role: 'teacher', name: 'Sample Teacher', classes: [{ classId: '3', sectionId: '7', grade: 'Grade 3', section: 'A' }] } })} close={noop} />);
  expect(html).toContain('Open my classroom'); expect(html).toContain('value="3/7" selected'); expect(html).not.toContain('current-password');
});
