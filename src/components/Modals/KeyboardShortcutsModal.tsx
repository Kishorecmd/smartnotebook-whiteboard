import { X, HelpCircle } from 'lucide-react';
import { useWhiteboardStore } from '../../store';

interface ShortcutCategory {
  category: string;
  items: { key: string; desc: string }[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    category: 'Tools',
    items: [
      { key: 'V / S', desc: 'Select, Move & Resize Tool' },
      { key: 'T', desc: 'Text Note / Annotation Tool' },
      { key: 'P', desc: 'Pen Tool' },
      { key: 'M', desc: 'Highlighter / Marker' },
      { key: 'U', desc: 'Geometric Shapes Tool' },
      { key: 'E', desc: 'Eraser Tool' },
      { key: 'H / Space', desc: 'Pan / Drag Canvas' },
    ],
  },
  {
    category: 'Selection & Objects',
    items: [
      { key: 'Ctrl + Alt + T', desc: 'Convert Selected Handwriting to Text (OCR)' },
      { key: 'Double-Click', desc: 'Edit Text Object in Place' },
      { key: 'Ctrl + D', desc: 'Duplicate Selected Object(s)' },
      { key: 'Delete / Backspace', desc: 'Delete Selected Object(s)' },
      { key: 'Esc', desc: 'Deselect All / Finish Editing' },
      { key: ']', desc: 'Bring Forward 1 Layer' },
      { key: '[', desc: 'Send Backward 1 Layer' },
      { key: 'Ctrl + ]', desc: 'Bring to Front' },
      { key: 'Ctrl + [', desc: 'Send to Back' },
    ],
  },
  {
    category: 'History & Viewport',
    items: [
      { key: 'Ctrl + Z', desc: 'Undo' },
      { key: 'Ctrl + Y', desc: 'Redo' },
      { key: 'Ctrl + +', desc: 'Zoom In' },
      { key: 'Ctrl + -', desc: 'Zoom Out' },
      { key: 'Ctrl + 0', desc: 'Reset Zoom to 100%' },
      { key: 'Ctrl + Wheel', desc: 'Pinch Zoom at Pointer' },
      { key: 'Two-Finger Touch', desc: 'Touchscreen Multi-touch Pinch & Pan' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC = () => {
  const { isKeyboardShortcutsOpen, setKeyboardShortcutsOpen } = useWhiteboardStore();

  if (!isKeyboardShortcutsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-500/20 text-primary-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Keyboard Shortcuts & Gestures</h2>
              <p className="text-xs text-slate-400">Classroom whiteboard controls</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close keyboard shortcuts"
            onClick={() => setKeyboardShortcutsOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List by Category */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {SHORTCUT_CATEGORIES.map((cat) => (
            <div key={cat.category} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary-400">
                {cat.category}
              </h3>
              <div className="space-y-1.5">
                {cat.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800/70"
                  >
                    <span className="text-xs text-slate-300">{item.desc}</span>
                    <kbd className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-mono font-bold text-primary-300 shadow-sm">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
