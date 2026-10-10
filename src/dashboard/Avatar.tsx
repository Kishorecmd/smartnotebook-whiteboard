import { useState } from 'react';

/** A student's or teacher's photo, or their initial when there is none or it fails to load. */
export function Avatar({ name, photo, className = 'live-avatar' }: { name: string; photo?: string | null; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return photo && failed !== photo
    ? <img className={className} src={photo} alt="" referrerPolicy="no-referrer" onError={() => setFailed(photo)} />
    : <span className={className} aria-hidden="true">{name.trim().slice(0, 1).toUpperCase()}</span>;
}
