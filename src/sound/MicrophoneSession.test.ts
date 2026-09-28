import { afterEach, describe, expect, it, vi } from 'vitest';
import { MicrophoneSession } from './MicrophoneSession';

function fixture() {
  const track = Object.assign(new EventTarget(), { stop: vi.fn(), readyState: 'live' });
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
  const analyser = { fftSize: 0, getFloatTimeDomainData: vi.fn((samples: Float32Array) => samples.fill(0)) };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const context = { resume: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined), createMediaStreamSource: () => source, createAnalyser: () => analyser, onstatechange: null, state: 'running' };
  const environment = { getUserMedia: vi.fn().mockResolvedValue(stream), createContext: vi.fn(() => context as unknown as AudioContext) };
  return { track, stream, analyser, source, context, environment };
}
afterEach(() => { vi.useRealTimers(); });
describe('Microphone lifecycle', () => {
  it('samples locally without connecting the microphone to speakers and releases resources on stop', async () => {
    vi.useFakeTimers(); const f = fixture(); const session = new MicrophoneSession(f.environment);
    const samples = vi.fn();
    expect(await session.start(samples, vi.fn())).toBe(true);
    vi.advanceTimersByTime(300); expect(samples).toHaveBeenCalledTimes(3);
    expect(f.source.connect).toHaveBeenCalledExactlyOnceWith(f.analyser);
    session.stop(); vi.advanceTimersByTime(300);
    expect(samples).toHaveBeenCalledTimes(3);
    expect(f.track.stop).toHaveBeenCalledOnce(); expect(f.context.close).toHaveBeenCalledOnce();
    expect(f.source.disconnect).toHaveBeenCalledOnce();
  });
  it('stops a stream that arrives after the user cancels a permission request', async () => {
    const f = fixture(); let resolve!: (stream: MediaStream) => void;
    f.environment.getUserMedia.mockImplementation(() => new Promise<MediaStream>(done => { resolve = done; }));
    const session = new MicrophoneSession(f.environment);
    const starting = session.start(vi.fn(), vi.fn()); session.stop(); resolve(f.stream);
    expect(await starting).toBe(false); expect(f.track.stop).toHaveBeenCalledOnce();
    expect(f.environment.createContext).not.toHaveBeenCalled();
  });
  it('allows retry after permission rejection', async () => {
    vi.useFakeTimers(); const f = fixture(); const session = new MicrophoneSession(f.environment);
    f.environment.getUserMedia.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    await expect(session.start(vi.fn(), vi.fn())).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(await session.start(vi.fn(), vi.fn())).toBe(true); session.stop();
  });
  it('cleans up if audio setup fails after permission is granted', async () => {
    const f = fixture(); f.context.resume.mockRejectedValue(new Error('Audio unavailable'));
    await expect(new MicrophoneSession(f.environment).start(vi.fn(), vi.fn())).rejects.toThrow('Audio unavailable');
    expect(f.track.stop).toHaveBeenCalledOnce(); expect(f.context.close).toHaveBeenCalledOnce();
  });
  it.each(['ended', 'mute'])('stops and notifies when the track emits %s', async event => {
    vi.useFakeTimers(); const f = fixture(); const ended = vi.fn();
    const session = new MicrophoneSession(f.environment); await session.start(vi.fn(), ended);
    f.track.dispatchEvent(new Event(event));
    expect(ended).toHaveBeenCalledOnce(); expect(f.track.stop).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
});
