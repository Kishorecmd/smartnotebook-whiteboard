import { AudioLines } from 'lucide-react';
import { SoundMonitor } from '../../sound/SoundMonitor';
import { DraggableOverlay } from '../components/DraggableOverlay';
import { TeachingToolRegistry } from '../TeachingToolRegistry';

function SoundMonitorTool() {
  return <DraggableOverlay toolId="sound-monitor" title="Sound level"><div className="sound-monitor-overlay"><SoundMonitor /></div></DraggableOverlay>;
}
export function registerSoundMonitorTool() {
  TeachingToolRegistry.register({ id: 'sound-monitor', name: 'Sound Level', icon: AudioLines, category: 'CLASSROOM', type: 'overlay-ui', description: 'Monitor classroom noise with a microphone, an adjustable limit and optional alert.', component: SoundMonitorTool });
}
