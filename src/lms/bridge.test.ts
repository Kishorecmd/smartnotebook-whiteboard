import { describe, expect, it } from 'vitest';
import { isAllowedLmsOrigin, lmsModeFromLocation } from './bridge';

describe('LMS bridge', () => {
  it('opens only the view and edit modes', () => {
    expect(lmsModeFromLocation('?lms=view')).toBe('view');
    expect(lmsModeFromLocation('?lms=edit')).toBe('edit');
    expect(lmsModeFromLocation('?lms=admin')).toBeNull();
    expect(lmsModeFromLocation('?join=ABC')).toBeNull();
  });

  it('trusts the school LMS and rejects look-alike origins', () => {
    expect(isAllowedLmsOrigin('https://lms.jaihind.school')).toBe(true);
    expect(isAllowedLmsOrigin('http://lms.jaihind.school')).toBe(false);
    expect(isAllowedLmsOrigin('https://lms.jaihind.school.example.com')).toBe(false);
    expect(isAllowedLmsOrigin('https://evil.example')).toBe(false);
  });
});
