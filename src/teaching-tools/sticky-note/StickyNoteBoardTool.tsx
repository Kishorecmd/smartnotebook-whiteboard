import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, Trash2 } from 'lucide-react';
import { TeachingToolRegistry } from '../TeachingToolRegistry';
import { DraggableOverlay } from '../components/DraggableOverlay';
import { useWhiteboardStore } from '../../store';

interface Note {
  id: string;
  text: string;
  color: string;
}

const COLORS = ['#fef08a', '#fbcfe8', '#bfdbfe', '#bbf7d0'];

const NotesForBoard: React.FC<{ documentId: string }> = ({ documentId }) => {
  const storageKey = `jhw_teaching_notes_${documentId}`;
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.filter((note): note is Note => note && typeof note.id === 'string' && typeof note.text === 'string' && COLORS.includes(note.color)) : [];
    } catch { return []; }
  });
  const [removedNote, setRemovedNote] = useState<Note | null>(null);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(notes)); setSaveError(false); }
    catch { setSaveError(true); }
  }, [notes, storageKey]);

  const addNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      text: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
    setNotes(previous => [...previous, newNote]);
  };

  const updateNote = (id: string, text: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, text } : n));
  };

  const deleteNote = (id: string) => {
    setRemovedNote(notes.find(note => note.id === id) || null);
    setNotes(notes.filter(n => n.id !== id));
  };

  return (
    <DraggableOverlay toolId="sticky-notes" title="Sticky Note Board">
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', backgroundColor: '#f1f5f9', width: '400px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>Classroom Notes</h3>
          <button 
            onClick={addNote}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Add Note
          </button>
        </div>

        <p role="status" style={{ fontSize: 11, color: saveError ? '#b91c1c' : '#64748b', marginBottom: 12 }}>{saveError ? 'Notes could not be saved on this device.' : 'Saved on this device for this board.'}</p>
        {removedNote && <button onClick={() => { setNotes(previous => [...previous, removedNote]); setRemovedNote(null); }} style={{ marginBottom: 12, color: '#365f4c' }}>Undo note deletion</button>}

        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
          gap: '16px',
          alignContent: 'start'
        }}>
          {notes.map(note => (
            <div key={note.id} style={{
              backgroundColor: note.color,
              padding: '12px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              position: 'relative',
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <textarea
                aria-label="Sticky note text"
                value={note.text}
                onChange={(e) => updateNote(note.id, e.target.value)}
                placeholder="Type a note..."
                style={{
                  width: '100%',
                  flex: 1,
                  border: 'none',
                  backgroundColor: 'transparent',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  paddingRight: '24px',
                  color: '#334155'
                }}
              />
              <button 
                aria-label="Delete note"
                onClick={() => deleteNote(note.id)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(255,255,255,0.5)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ef4444'
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          
          {notes.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
              No notes yet. Click 'Add Note' to create one!
            </div>
          )}
        </div>
      </div>
    </DraggableOverlay>
  );
};

export const StickyNoteBoardTool: React.FC = () => {
  const documentId = useWhiteboardStore(state => state.document.id);
  return <NotesForBoard key={documentId} documentId={documentId} />;
};

export const registerStickyNoteTool = () => {
  TeachingToolRegistry.register({
    id: 'sticky-notes',
    name: 'Sticky Notes',
    icon: StickyNote,
    category: 'CLASSROOM',
    type: 'overlay-ui',
    description: 'A board for managing classroom notes.',
    component: StickyNoteBoardTool,
  });
};
