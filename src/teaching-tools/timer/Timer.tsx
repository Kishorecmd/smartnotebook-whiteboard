import React, { useState, useEffect } from 'react';
import { Timer as TimerIcon, Play, Pause, RotateCcw } from 'lucide-react';
import { DraggableOverlay } from '../components/DraggableOverlay';
import { TeachingToolRegistry } from '../TeachingToolRegistry';

export const TimerTool: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const presets = [
    { label: '30s', value: 30 },
    { label: '1m', value: 60 },
    { label: '2m', value: 120 },
    { label: '5m', value: 300 },
    { label: '10m', value: 600 },
    { label: '15m', value: 900 },
    { label: '30m', value: 1800 },
  ];

  useEffect(() => {
    let interval: number;
    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsFinished(true);
            playAlarm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const playAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.setValueAtTime(0, audioCtx.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.4);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 1);
    } catch (e) {
      console.log('Audio playback failed');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePreset = (val: number) => {
    setTimeLeft(val);
    setIsRunning(false);
    setIsFinished(false);
  };

  const toggleTimer = () => {
    if (isFinished) {
      setTimeLeft(300);
      setIsFinished(false);
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  return (
    <DraggableOverlay toolId="timer" title="Classroom Timer">
      <div className="w-[380px] flex flex-col gap-6 items-center">
        
        {/* Time Display */}
        <div className={`w-full py-8 rounded-3xl flex items-center justify-center transition-colors duration-500 ${
          isFinished ? 'bg-red-500/20 text-red-400' : 
          isRunning ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-white'
        }`}>
          <span className="text-8xl font-mono tracking-tighter font-semibold tabular-nums">
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          <button 
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90 ${
              isRunning ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-500 hover:bg-emerald-400'
            }`}
            onClick={toggleTimer}
          >
            {isRunning ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
          </button>
          
          <button 
            className="w-20 h-20 rounded-full flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white shadow-lg transition-transform active:scale-90"
            onClick={() => handlePreset(timeLeft || 300)} // Reset to current preset
          >
            <RotateCcw className="w-8 h-8" />
          </button>
        </div>

        {/* Presets */}
        <div className="w-full">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 text-center font-semibold">Presets</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {presets.map(p => (
              <button
                key={p.label}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors"
                onClick={() => handlePreset(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </DraggableOverlay>
  );
};

export const registerTimer = () => {
  TeachingToolRegistry.register({
    id: 'timer',
    name: 'Timer',
    icon: TimerIcon,
    category: 'CLASSROOM',
    type: 'overlay-ui',
    description: 'A large classroom timer and stopwatch.',
    component: TimerTool,
  });
};
