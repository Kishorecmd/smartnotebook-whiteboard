import { afterEach, expect, it, vi } from 'vitest';
import { classroomHealth, erpLink } from './data';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

it('uses the Node health check when it answers', async () => {
  const fetch = vi.fn(async () => json({ classroomAPI: true, classroomWeather: true }));
  vi.stubGlobal('fetch', fetch);
  expect(await classroomHealth()).toEqual({ classroomAPI: true, classroomWeather: true });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('falls back to classroom.php when a static host returns 404 or its HTML page', async () => {
  for (const first of [new Response('Not found', { status: 404 }), new Response('<!doctype html>', { status: 200 })]) {
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(json({ runtime: 'php', classroomAPI: false, classroomWeather: false }));
    vi.stubGlobal('fetch', fetch);
    expect(await classroomHealth()).toMatchObject({ classroomAPI: false, classroomWeather: false });
    expect(fetch.mock.calls[1][0]).toBe('/api/classroom.php?action=health');
  }
});
it('returns null when neither check answers', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
  expect(await classroomHealth()).toBeNull();
});
it('builds ERP web links on the configured base and falls back to production', () => {
  expect(erpLink('http://localhost/Antigravity/public/index.php', 'teacher-portal/attendance')).toBe('http://localhost/Antigravity/public/index.php?url=teacher-portal/attendance');
  for (const bad of [undefined, 'not a url', 'javascript:alert(1)', 'https://u:p@erp.example/index.php', 'https://erp.example/index.php?url=x'])
    expect(erpLink(bad, 'teacher-portal/login')).toBe('https://erp.jaihind.school/public/index.php?url=teacher-portal/login');
});
