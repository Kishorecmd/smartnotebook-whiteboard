import { describe, expect, it } from 'vitest';
import { coursesForClass, findCourses, lessonIdFromLocation, lessonMessage, lessonsByUnit, teachLessonUrl, type LessonCourse } from './classroomLessons';
import { lmsModeFromLocation } from './bridge';

const course = (id: number, title: string, className: string | null, subject: string | null = null): LessonCourse => ({ id, title, subject, className, status: 'published', lessons: 3, boards: 1 });
const courses = [course(1, 'Phonics', 'LKG', 'English'), course(2, 'Numbers', 'L.K.G.', 'Maths'), course(3, 'Fractions', 'Grade 3', 'Maths'), course(4, 'Library', null)];

describe('Lessons panel', () => {
  it('shows the courses for the class on this board', () => {
    expect(coursesForClass(courses, 'LKG').map(c => c.id)).toEqual([1, 2]);
    expect(coursesForClass(courses, 'lkg').map(c => c.id)).toEqual([1, 2]);
    expect(coursesForClass(courses, 'Grade 3').map(c => c.id)).toEqual([3]);
    expect(coursesForClass(courses, 'UKG')).toEqual([]);
    expect(coursesForClass(courses, null)).toEqual([]);
  });
  it('finds courses by title, subject or class', () => {
    expect(findCourses(courses, 'maths').map(c => c.id)).toEqual([2, 3]);
    expect(findCourses(courses, 'maths grade').map(c => c.id)).toEqual([3]);
    expect(findCourses(courses, '  ')).toHaveLength(4);
  });
  it('groups lessons under their units, with lessons outside a unit last', () => {
    const lesson = (id: number, unitId: number | null) => ({ id, title: `L${id}`, unitId, minutes: 0, status: 'published', board: null });
    expect(lessonsByUnit({ units: [{ id: 1, title: 'Sounds' }, { id: 2, title: 'Empty' }], lessons: [lesson(1, 1), lesson(2, null), lesson(3, 1), lesson(4, 99)] }))
      .toEqual([{ title: 'Sounds', lessons: [lesson(1, 1), lesson(3, 1)] }, { title: 'Other lessons', lessons: [lesson(2, null), lesson(4, 99)] }]);
    expect(lessonsByUnit({ units: [], lessons: [lesson(5, null)] })).toEqual([{ title: null, lessons: [lesson(5, null)] }]);
  });
  it('opens a lesson in the whiteboard on this site', () => {
    const url = teachLessonUrl(42);
    expect(url).toBe('/?lms=lesson&id=42');
    const search = url.slice(1);
    expect(lmsModeFromLocation(search)).toBe('lesson');
    expect(lessonIdFromLocation(search)).toBe(42);
    expect(lessonIdFromLocation('?lms=lesson&id=0')).toBeNull();
    expect(lessonIdFromLocation('?lms=lesson&id=4x')).toBeNull();
  });
  it('explains a refused connection in plain words', () => {
    expect(lessonMessage('LMS_TEACHER_MISMATCH')).toContain('your own ERP account');
    expect(lessonMessage('SOMETHING_NEW')).toBe(lessonMessage('LMS_UNAVAILABLE'));
  });
});
