import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssessmentReport } from '../types';
import { AssessmentService } from './AssessmentService';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const storage = new MemoryStorage();
vi.stubGlobal('localStorage', storage);

describe('AssessmentService', () => {
  beforeEach(() => storage.clear());

  it('creates, validates, stores, and reloads quiz definitions', () => {
    const quiz = AssessmentService.createAssessment('quiz');
    quiz.title = 'Science check';
    quiz.questions[0].prompt = 'Plants make food using?';
    quiz.questions[0].options[0].text = 'Photosynthesis';
    quiz.questions[0].options[1].text = 'Evaporation';
    quiz.questions[0].correctOptionId = quiz.questions[0].options[0].id;

    const saved = AssessmentService.saveAssessment(quiz);
    expect(saved.kind).toBe('quiz');
    expect(AssessmentService.listAssessments()).toHaveLength(1);
    expect(AssessmentService.listAssessments()[0].questions[0].correctOptionId).toBe(quiz.questions[0].options[0].id);
  });

  it('rejects incomplete assessments before launching', () => {
    const poll = AssessmentService.createAssessment('poll');
    expect(() => AssessmentService.saveAssessment(poll)).toThrow('Every question needs a prompt');
  });

  it('produces a spreadsheet-safe participant report', () => {
    const report: AssessmentReport = {
      id: 'report-1', code: 'ABC123', title: 'Quiz, "One"', kind: 'quiz', status: 'ended',
      createdAt: 1, endedAt: 2, participantCount: 1, responseCount: 1, averagePercentage: 100,
      questions: [{ questionId: 'q1', prompt: '2 + 2?', type: 'multiple-choice', responseCount: 1, correctCount: 1, accuracy: 100, options: [], shortAnswers: [] }],
      participants: [{ participantId: 'p1', name: 'Student, One', answeredCount: 1, score: 1, maxScore: 1, percentage: 100, answers: [{ questionId: 'q1', answer: '4', correct: true, pointsAwarded: 1 }] }],
    };
    const csv = AssessmentService.reportCsv(report);
    expect(csv).toContain('"Student, One"');
    expect(csv).toContain('"Q1: 2 + 2?"');
    expect(csv.split('\r\n')).toHaveLength(2);
  });
});
