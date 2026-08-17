import type {
  AssessmentDefinition,
  AssessmentKind,
  AssessmentQuestion,
  AssessmentReport,
  JoinedParticipant,
  LiveSessionCredentials,
  PublicAssessmentSession,
} from '../types';
import { generateId } from '../utils';

const ASSESSMENTS_KEY = 'jhw_assessments_v1';
const REPORTS_KEY = 'jhw_assessment_reports_v1';
const ACTIVE_SESSION_KEY = 'jhw_active_assessment_session_v1';

const readList = <T>(key: string): T[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const writeList = <T>(key: string, value: T[]): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* best effort */ }
};

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body as T;
};

const option = (text: string) => ({ id: generateId('option'), text });

export class AssessmentService {
  public static createQuestion(type: AssessmentQuestion['type'] = 'multiple-choice'): AssessmentQuestion {
    const options = type === 'true-false'
      ? [option('True'), option('False')]
      : type === 'multiple-choice'
        ? [option('Option 1'), option('Option 2')]
        : [];
    return {
      id: generateId('question'),
      prompt: '',
      type,
      options,
      correctOptionId: options[0]?.id,
      correctText: '',
      points: 1,
    };
  }

  public static createAssessment(kind: AssessmentKind): AssessmentDefinition {
    const now = Date.now();
    return {
      id: generateId('assessment'),
      title: kind === 'poll' ? 'Class Poll' : 'New Quiz',
      description: '',
      kind,
      questions: [this.createQuestion()],
      createdAt: now,
      updatedAt: now,
    };
  }

  public static listAssessments(): AssessmentDefinition[] {
    return readList<AssessmentDefinition>(ASSESSMENTS_KEY).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public static saveAssessment(assessment: AssessmentDefinition): AssessmentDefinition {
    const title = assessment.title.trim();
    if (!title) throw new Error('Enter an assessment title.');
    if (!assessment.questions.length) throw new Error('Add at least one question.');
    for (const question of assessment.questions) {
      if (!question.prompt.trim()) throw new Error('Every question needs a prompt.');
      if (question.type !== 'short-answer' && question.options.filter((item) => item.text.trim()).length < 2) {
        throw new Error('Choice questions need at least two options.');
      }
      if (assessment.kind === 'quiz' && question.type === 'short-answer' && !question.correctText?.trim()) {
        throw new Error('Enter the accepted answer for each short-answer quiz question.');
      }
      if (assessment.kind === 'quiz' && question.type !== 'short-answer' && !question.options.some((item) => item.id === question.correctOptionId)) {
        throw new Error('Select a correct answer for each quiz question.');
      }
    }
    const saved = { ...assessment, title, updatedAt: Date.now() };
    const all = this.listAssessments().filter((item) => item.id !== saved.id);
    writeList(ASSESSMENTS_KEY, [saved, ...all]);
    return saved;
  }

  public static deleteAssessment(id: string): void {
    writeList(ASSESSMENTS_KEY, this.listAssessments().filter((item) => item.id !== id));
  }

  public static listReports(): AssessmentReport[] {
    return readList<AssessmentReport>(REPORTS_KEY).sort((a, b) => (b.endedAt || b.createdAt) - (a.endedAt || a.createdAt));
  }

  public static saveReport(report: AssessmentReport): void {
    const reports = this.listReports().filter((item) => item.id !== report.id);
    writeList(REPORTS_KEY, [report, ...reports].slice(0, 100));
  }

  public static deleteReport(id: string): void {
    writeList(REPORTS_KEY, this.listReports().filter((item) => item.id !== id));
  }

  public static saveActiveSession(session: LiveSessionCredentials | null): void {
    try {
      if (session) localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {}
  }

  public static loadActiveSession(): LiveSessionCredentials | null {
    try { return JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || 'null'); } catch { return null; }
  }

  public static async launch(assessment: AssessmentDefinition): Promise<LiveSessionCredentials> {
    const session = await request<LiveSessionCredentials>('/api/assessment-sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assessment }),
    });
    const joinUrl = new URL(session.joinUrl, window.location.origin);
    joinUrl.protocol = window.location.protocol;
    joinUrl.host = window.location.host;
    const resolved = { ...session, joinUrl: joinUrl.toString() };
    this.saveActiveSession(resolved);
    return resolved;
  }

  public static getPublicSession(code: string): Promise<PublicAssessmentSession> {
    return request(`/api/assessment-sessions/${encodeURIComponent(code.toUpperCase())}`);
  }

  public static join(code: string, name: string): Promise<JoinedParticipant> {
    return request(`/api/assessment-sessions/${encodeURIComponent(code.toUpperCase())}/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    });
  }

  public static submitResponse(
    code: string,
    participant: JoinedParticipant,
    questionId: string,
    answer: string,
  ): Promise<{ ok: true }> {
    return request(`/api/assessment-sessions/${encodeURIComponent(code.toUpperCase())}/responses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantId: participant.participantId,
        participantToken: participant.participantToken,
        questionId,
        answer,
      }),
    });
  }

  public static getResults(session: LiveSessionCredentials): Promise<AssessmentReport> {
    return request(`/api/assessment-sessions/${encodeURIComponent(session.code)}/results`, {
      headers: { 'X-Teacher-Token': session.teacherToken },
    });
  }

  public static async endSession(session: LiveSessionCredentials): Promise<AssessmentReport> {
    const report = await request<AssessmentReport>(`/api/assessment-sessions/${encodeURIComponent(session.code)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Teacher-Token': session.teacherToken },
      body: JSON.stringify({ status: 'ended' }),
    });
    this.saveReport(report);
    this.saveActiveSession(null);
    return report;
  }

  public static reportCsv(report: AssessmentReport): string {
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const questionHeaders = report.questions.map((question, index) => `Q${index + 1}: ${question.prompt}`);
    const rows = [
      ['Student', 'Answered', 'Score', 'Maximum', 'Percentage', ...questionHeaders],
      ...report.participants.map((participant) => [
        participant.name,
        participant.answeredCount,
        participant.score,
        participant.maxScore,
        participant.percentage ?? '',
        ...report.questions.map((question) => participant.answers.find((answer) => answer.questionId === question.questionId)?.answer || ''),
      ]),
    ];
    return rows.map((row) => row.map(escape).join(',')).join('\r\n');
  }

  public static downloadReportCsv(report: AssessmentReport): void {
    const blob = new Blob(['\ufeff', this.reportCsv(report)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${report.title.replace(/[^a-z0-9_-]/gi, '_')}_report.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  public static printReport(report: AssessmentReport): void {
    const popup = window.open('', '_blank');
    if (!popup) throw new Error('Allow pop-ups to print the assessment report.');
    popup.opener = null;
    const doc = popup.document;
    doc.title = `${report.title} — Assessment Report`;
    const style = doc.createElement('style');
    style.textContent = 'body{font:14px system-ui;margin:32px;color:#172033}h1{margin-bottom:4px}.summary{display:flex;gap:24px;margin:20px 0}.card{border:1px solid #ccd3df;border-radius:10px;padding:12px 18px}table{border-collapse:collapse;width:100%;margin-top:18px}th,td{border:1px solid #d7dce5;padding:8px;text-align:left}th{background:#f1f5f9}@media print{body{margin:16mm}}';
    doc.head.appendChild(style);
    const h1 = doc.createElement('h1'); h1.textContent = report.title; doc.body.appendChild(h1);
    const meta = doc.createElement('p'); meta.textContent = `${report.kind === 'quiz' ? 'Quiz' : 'Poll'} • Code ${report.code} • ${new Date(report.createdAt).toLocaleString()}`; doc.body.appendChild(meta);
    const summary = doc.createElement('div'); summary.className = 'summary';
    for (const [label, value] of [['Participants', report.participantCount], ['Responses', report.responseCount], ['Class average', report.averagePercentage === null ? '—' : `${report.averagePercentage}%`]]) {
      const card = doc.createElement('div'); card.className = 'card'; card.textContent = `${label}: ${value}`; summary.appendChild(card);
    }
    doc.body.appendChild(summary);
    const table = doc.createElement('table');
    const head = table.createTHead().insertRow();
    ['Student', 'Answered', 'Score', 'Percentage'].forEach((label) => { const cell = doc.createElement('th'); cell.textContent = label; head.appendChild(cell); });
    const body = table.createTBody();
    report.participants.forEach((participant) => {
      const row = body.insertRow();
      [participant.name, participant.answeredCount, `${participant.score}/${participant.maxScore}`, participant.percentage === null ? '—' : `${participant.percentage}%`]
        .forEach((value) => { const cell = row.insertCell(); cell.textContent = String(value); });
    });
    doc.body.appendChild(table);
    popup.setTimeout(() => popup.print(), 250);
  }
}
