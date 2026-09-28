import { describe, expect, it } from 'vitest';
import { currentPeriod, classStudents, dateKey, minuteOfDay } from './model';
import { previewData } from './preview';
const now = Date.parse('2026-09-28T04:45:00Z'); // 10:15 Kolkata
const periods = [
  { id:'1', subject:'Maths', start:'10:00', end:'10:40', teacher:'Teacher', kind:'lesson' as const },
  { id:'2', subject:'Break', start:'10:40', end:'11:00', teacher:'', kind:'break' as const },
  { id:'3', subject:'Lunch', start:'12:00', end:'12:40', teacher:'', kind:'lunch' as const },
];
describe('classroom day',()=>{
 it('uses device timezone rather than the computer timezone',()=>{expect(minuteOfDay(now,'Asia/Kolkata')).toBe(615);expect(dateKey(Date.parse('2026-09-27T20:00:00Z'),'Asia/Kolkata')).toBe('2026-09-28');});
 it('finds now, next and remaining minutes',()=>{const s=currentPeriod(periods,now,'Asia/Kolkata');expect(s.current?.id).toBe('1');expect(s.next?.id).toBe('2');expect(s.remaining).toBe(25);});
 it('moves to the next period at the boundary',()=>expect(currentPeriod(periods,Date.parse('2026-09-28T05:10:00Z'),'Asia/Kolkata').current?.kind).toBe('break'));
 it('handles lunch',()=>expect(currentPeriod(periods,Date.parse('2026-09-28T06:35:00Z'),'Asia/Kolkata').current?.kind).toBe('lunch'));
 it('does not invent a lesson in a free gap',()=>expect(currentPeriod(periods,Date.parse('2026-09-28T05:45:00Z'),'Asia/Kolkata').current).toBeUndefined());
 it('suppresses timetable on verified holidays',()=>expect(currentPeriod(periods,now,'Asia/Kolkata','Holiday')).toEqual({current:undefined,next:undefined,remaining:0}));
 it('ignores missing or invalid period times',()=>expect(currentPeriod([{...periods[0],start:null}],now,'Asia/Kolkata').current).toBeUndefined());
 it.each(['KG','Grade 1','Grade 2','Grade 3','Grade 4'])('supports %s mapping without grade-specific assumptions',grade=>{const s=previewData(grade,'normal',now);expect(s.mapping.grade).toBe(grade);expect(classStudents(s.snapshot,true)).toHaveLength(10);});
 it('never treats unmarked attendance as all present',()=>{const s=previewData('KG','unmarked',now).snapshot;expect(classStudents(s,true)).toHaveLength(0);expect(classStudents(s,false)).toHaveLength(12);});
 it('supports everyone present and no absences',()=>{const s=previewData('Grade 1','all',now).snapshot;expect(s.attendance.absent).toBe(0);expect(classStudents(s,true)).toHaveLength(12);});
});
