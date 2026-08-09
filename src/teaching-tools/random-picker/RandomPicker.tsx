import React, { useState } from 'react';
import { Users, Shuffle, UserMinus } from 'lucide-react';
import { DraggableOverlay } from '../components/DraggableOverlay';
import { TeachingToolRegistry } from '../TeachingToolRegistry';

export const RandomPickerTool: React.FC = () => {
  const [namesText, setNamesText] = useState('Arun\nMeena\nRahul\nPriya\nKavin');
  const [names, setNames] = useState<string[]>(['Arun', 'Meena', 'Rahul', 'Priya', 'Kavin']);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [mode, setMode] = useState<'edit' | 'pick'>('pick');

  const handleUpdateNames = () => {
    const newNames = namesText.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    setNames(newNames);
    setMode('pick');
    setSelectedName(null);
  };

  const pickRandom = () => {
    if (names.length === 0) return;
    
    setIsPicking(true);
    setSelectedName(null);

    let count = 0;
    const maxJumps = 20;
    
    const interval = setInterval(() => {
      setSelectedName(names[Math.floor(Math.random() * names.length)]);
      count++;
      
      if (count >= maxJumps) {
        clearInterval(interval);
        // Final pick
        const finalWinner = names[Math.floor(Math.random() * names.length)];
        setSelectedName(finalWinner);
        setIsPicking(false);
        
        // Optional sound effect for winner
        playTada();
      }
    }, 100);
  };

  const playTada = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'triangle';
      
      const now = audioCtx.currentTime;
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.setValueAtTime(554.37, now + 0.1);
      oscillator.frequency.setValueAtTime(659.25, now + 0.2);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } catch (e) {
      // Audio context might be blocked
    }
  };

  const removeSelected = () => {
    if (!selectedName) return;
    const newNames = names.filter(n => n !== selectedName);
    setNames(newNames);
    setNamesText(newNames.join('\n'));
    setSelectedName(null);
  };

  const shuffle = () => {
    const newNames = [...names].sort(() => Math.random() - 0.5);
    setNames(newNames);
    setNamesText(newNames.join('\n'));
  };

  return (
    <DraggableOverlay toolId="random-picker" title="Random Picker">
      <div className="w-[420px] flex flex-col gap-4">
        
        {/* View Toggle */}
        <div className="flex bg-slate-800 p-1 rounded-xl">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'pick' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            onClick={() => setMode('pick')}
          >
            Pick Student
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'edit' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            onClick={() => setMode('edit')}
          >
            Edit List ({names.length})
          </button>
        </div>

        {mode === 'edit' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-400">Enter names, one per line:</p>
            <textarea
              className="w-full h-64 bg-slate-950 border border-slate-700 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-indigo-500"
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
            />
            <button
              className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-medium text-lg transition-colors"
              onClick={handleUpdateNames}
            >
              Save List
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* Display Area */}
            <div className={`h-40 bg-slate-950 border border-slate-700 rounded-2xl flex items-center justify-center p-6 relative overflow-hidden transition-all duration-300 ${!isPicking && selectedName ? 'border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : ''}`}>
              {selectedName ? (
                <span className={`text-5xl font-bold tracking-tight text-center ${!isPicking ? 'text-emerald-400 scale-110 transition-transform duration-500' : 'text-white'}`}>
                  {selectedName}
                </span>
              ) : (
                <span className="text-2xl text-slate-500 font-medium">Ready to pick...</span>
              )}
            </div>

            {/* Main Action */}
            <button
              className={`w-full py-5 rounded-2xl text-2xl font-bold text-white shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${
                names.length === 0 ? 'bg-slate-700 opacity-50 cursor-not-allowed' :
                isPicking ? 'bg-indigo-600' : 'bg-indigo-500 hover:bg-indigo-400'
              }`}
              onClick={pickRandom}
              disabled={names.length === 0 || isPicking}
            >
              <Users className="w-8 h-8" />
              {isPicking ? 'Picking...' : 'PICK RANDOM'}
            </button>

            {/* Secondary Actions */}
            <div className="flex gap-2">
              <button
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50"
                onClick={removeSelected}
                disabled={!selectedName || isPicking}
              >
                <UserMinus className="w-5 h-5" /> Remove
              </button>
              <button
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50"
                onClick={shuffle}
                disabled={isPicking || names.length < 2}
              >
                <Shuffle className="w-5 h-5" /> Shuffle
              </button>
            </div>
            
          </div>
        )}
      </div>
    </DraggableOverlay>
  );
};

export const registerRandomPicker = () => {
  TeachingToolRegistry.register({
    id: 'random-picker',
    name: 'Random Picker',
    icon: Users,
    category: 'CLASSROOM',
    type: 'overlay-ui',
    description: 'Pick a random student from a list.',
    component: RandomPickerTool,
  });
};
