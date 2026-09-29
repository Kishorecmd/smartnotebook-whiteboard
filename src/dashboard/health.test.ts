import { afterEach, expect, it, vi } from 'vitest';
import { classroomHealth } from './data';

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
