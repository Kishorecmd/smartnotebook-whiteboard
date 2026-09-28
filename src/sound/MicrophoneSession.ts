type AudioEnvironment = {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createContext: () => AudioContext;
};

export class MicrophoneSession {
  private generation = 0;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  constructor(private environment: AudioEnvironment = {
    getUserMedia: constraints => navigator.mediaDevices.getUserMedia(constraints),
    createContext: () => new AudioContext(),
  }) {}

  async start(onSamples: (samples: Float32Array) => void, onEnded: () => void): Promise<boolean> {
    this.stop();
    const generation = this.generation;
    try {
      const stream = await this.environment.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return false; }
      this.stream = stream;
      const context = this.environment.createContext();
      this.context = context;
      await context.resume();
      if (generation !== this.generation) return false;
      if (!stream.getAudioTracks().some(track => track.readyState === 'live')) throw new Error('Microphone disconnected');
      const source = context.createMediaStreamSource(stream);
      this.source = source;
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser); // No connection to speakers: avoids microphone feedback.
      const samples = new Float32Array(analyser.fftSize);
      this.interval = setInterval(() => { analyser.getFloatTimeDomainData(samples); onSamples(samples); }, 100);
      const ended = () => { if (generation === this.generation) { this.stop(); onEnded(); } };
      stream.getAudioTracks().forEach(track => { track.addEventListener('ended', ended); track.addEventListener('mute', ended); });
      context.onstatechange = () => { if (context.state !== 'running') ended(); };
      return true;
    } catch (error) {
      if (generation !== this.generation) return false;
      this.stop();
      throw error;
    }
  }

  chime() {
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
    oscillator.start(); oscillator.stop(context.currentTime + 0.35);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  stop() {
    this.generation++;
    if (this.interval !== null) clearInterval(this.interval);
    this.interval = null;
    this.source?.disconnect(); this.source = null;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
    if (this.context) { this.context.onstatechange = null; void this.context.close().catch(() => {}); }
    this.context = null;
  }
}
