/**
 * Student Mode survives reloads, new tabs and browser restarts on this device,
 * so a student cannot leave it by refreshing the page. Only the teacher's
 * unlock (or a sign-in that has ended) turns it off.
 */
export const STUDENT_MODE_KEY = 'jhw_student_mode_v1';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readStudentMode(storage: Storage | undefined = globalThis.localStorage): boolean {
  try { return storage?.getItem(STUDENT_MODE_KEY) === 'on'; } catch { return false; }
}

export function writeStudentMode(on: boolean, storage: Storage | undefined = globalThis.localStorage): void {
  try {
    if (on) storage?.setItem(STUDENT_MODE_KEY, 'on');
    else storage?.removeItem(STUDENT_MODE_KEY);
  } catch { /* Storage blocked: Student Mode still works for this page. */ }
}
