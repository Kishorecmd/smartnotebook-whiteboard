/**
 * postMessage contract between Smartnotebook and Jaihind LMS (lms.jaihind.school).
 *
 * The LMS embeds `/?lms=view` (students), `/?lms=edit` (course teachers) or
 * `/?lms=teach` (a teacher teaching the lesson full screen) in an iframe. The LMS server has already checked the ERP sign-in and course access,
 * so the whiteboard never holds credentials: it only renders the board it is
 * given and hands the edited board back. Messages from any other origin are
 * ignored.
 *
 *   whiteboard → LMS  { channel: 'jaihind-whiteboard', type: 'ready' }
 *   LMS → whiteboard  { channel: 'jaihind-lms', type: 'load', title, package }
 *   whiteboard → LMS  { channel: 'jaihind-whiteboard', type: 'dirty', dirty }
 *   whiteboard → LMS  { channel: 'jaihind-whiteboard', type: 'save', requestId, package, pages }
 *   LMS → whiteboard  { channel: 'jaihind-lms', type: 'saved', requestId, ok, message? }
 *   whiteboard → LMS  { channel: 'jaihind-whiteboard', type: 'exit' }   (teach mode: the lesson is over)
 */

/** Teach opens the lesson in the full editor without saving back, so class annotations never change the lesson. */
export type LmsMode = 'view' | 'edit' | 'teach';

export type LmsInboundMessage =
  | { channel: 'jaihind-lms'; type: 'load'; title: string; package: string | null }
  | { channel: 'jaihind-lms'; type: 'saved'; requestId: string; ok: boolean; message?: string };

export type LmsOutboundMessage =
  | { type: 'ready'; mode: LmsMode }
  | { type: 'dirty'; dirty: boolean }
  | { type: 'save'; requestId: string; package: string; pages: number }
  | { type: 'exit' };

const DEFAULT_LMS_ORIGINS = ['https://lms.jaihind.school'];

/** The school LMS home page, for opening lessons from the classroom. */
export function lmsHomeUrl(): string {
  return configuredOrigins()[0];
}

export function lmsModeFromLocation(search: string = window.location.search): LmsMode | null {
  const mode = new URLSearchParams(search).get('lms');
  return mode === 'view' || mode === 'edit' || mode === 'teach' ? mode : null;
}

function configuredOrigins(): string[] {
  const configured = (import.meta.env.VITE_LMS_ORIGINS || '')
    .split(',')
    .map((origin: string) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_LMS_ORIGINS;
}

export function isAllowedLmsOrigin(origin: string): boolean {
  if (configuredOrigins().includes(origin)) return true;
  // A local LMS (next dev) may embed a local whiteboard during development.
  return import.meta.env.DEV && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

/** The embedding LMS origin, known from the referrer before its first message arrives. */
function parentOrigin(): string | null {
  try {
    const origin = new URL(document.referrer).origin;
    return isAllowedLmsOrigin(origin) ? origin : null;
  } catch {
    return null;
  }
}

let confirmedOrigin: string | null = null;

export function postToLms(message: LmsOutboundMessage): void {
  if (window.parent === window) return;
  const payload = { channel: 'jaihind-whiteboard', ...message };
  const target = confirmedOrigin || parentOrigin();
  if (target) {
    window.parent.postMessage(payload, target);
    return;
  }
  // Referrer stripped: offer the message to each configured LMS; only the real parent receives it.
  for (const origin of configuredOrigins()) window.parent.postMessage(payload, origin);
}

export function listenToLms(handler: (message: LmsInboundMessage) => void): () => void {
  const onMessage = (event: MessageEvent) => {
    if (event.source !== window.parent || !isAllowedLmsOrigin(event.origin)) return;
    const data = event.data as Partial<LmsInboundMessage> | null;
    if (!data || data.channel !== 'jaihind-lms') return;
    if (data.type === 'load' && typeof data.title === 'string' && (typeof data.package === 'string' || data.package === null)) {
      confirmedOrigin = event.origin;
      handler(data as LmsInboundMessage);
    } else if (data.type === 'saved' && typeof data.requestId === 'string' && typeof data.ok === 'boolean') {
      handler(data as LmsInboundMessage);
    }
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}
