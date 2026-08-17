export type AssessmentKind = 'poll' | 'quiz';
export type AssessmentQuestionType = 'multiple-choice' | 'true-false' | 'short-answer';

export interface AssessmentOption {
  id: string;
  text: string;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  type: AssessmentQuestionType;
  options: AssessmentOption[];
  correctOptionId?: string;
  correctText?: string;
  points: number;
}

export interface AssessmentDefinition {
  id: string;
  title: string;
  description?: string;
  kind: AssessmentKind;
  questions: AssessmentQuestion[];
  createdAt: number;
  updatedAt: number;
}

export interface PublicAssessmentQuestion extends Omit<AssessmentQuestion, 'correctOptionId' | 'correctText'> {}

export interface PublicAssessmentSession {
  code: string;
  status: 'active' | 'ended';
  title: string;
  description?: string;
  kind: AssessmentKind;
  questions: PublicAssessmentQuestion[];
  participantCount: number;
  responseCount: number;
  createdAt: number;
}

export interface LiveSessionCredentials {
  code: string;
  teacherToken: string;
  joinUrl: string;
}

export interface JoinedParticipant {
  participantId: string;
  participantToken: string;
  name: string;
}

export interface QuestionResult {
  questionId: string;
  prompt: string;
  type: AssessmentQuestionType;
  responseCount: number;
  correctCount: number | null;
  accuracy: number | null;
  options: Array<{ id: string; text: string; count: number; percentage: number; isCorrect: boolean }>;
  shortAnswers: Array<{ answer: string; count: number }>;
}

export interface ParticipantResult {
  participantId: string;
  name: string;
  answeredCount: number;
  score: number;
  maxScore: number;
  percentage: number | null;
  answers: Array<{ questionId: string; answer: string; correct: boolean | null; pointsAwarded: number }>;
}

export interface AssessmentReport {
  id: string;
  code: string;
  title: string;
  kind: AssessmentKind;
  status: 'active' | 'ended';
  createdAt: number;
  endedAt?: number;
  participantCount: number;
  responseCount: number;
  averagePercentage: number | null;
  questions: QuestionResult[];
  participants: ParticipantResult[];
}
