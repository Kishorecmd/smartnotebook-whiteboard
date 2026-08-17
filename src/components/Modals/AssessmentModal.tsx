import React, { useEffect, useState } from 'react';
import {
  BarChart3, Check, ClipboardCheck, Copy, Download, Edit3, FileText,
  Loader2, Play, Plus, Printer, Radio, Save, Trash2, Users, X,
} from 'lucide-react';
import { AssessmentService } from '../../services';
import type {
  AssessmentDefinition, AssessmentKind, AssessmentQuestion, AssessmentReport, LiveSessionCredentials,
} from '../../types';

type Tab = 'library' | 'builder' | 'live' | 'reports';

const resultBars = (report: AssessmentReport) => report.questions.map((question, index) => (
  <section key={question.questionId} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
    <div className="mb-3 flex items-start justify-between gap-3"><h4 className="font-semibold"><span className="mr-2 text-indigo-400">Q{index + 1}</span>{question.prompt}</h4><span className="shrink-0 text-xs text-slate-400">{question.responseCount} responses{question.accuracy === null ? '' : ` • ${question.accuracy}% correct`}</span></div>
    {question.options.length > 0 ? <div className="space-y-2">{question.options.map((option) => <div key={option.id}><div className="mb-1 flex justify-between text-xs"><span className={option.isCorrect ? 'font-semibold text-emerald-400' : 'text-slate-300'}>{option.text}{option.isCorrect ? ' ✓' : ''}</span><span>{option.count} ({option.percentage}%)</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${option.isCorrect ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${option.percentage}%` }} /></div></div>)}</div> : <div className="flex flex-wrap gap-2">{question.shortAnswers.length ? question.shortAnswers.slice(0, 12).map((answer) => <span key={answer.answer} className="rounded-full bg-slate-800 px-3 py-1 text-sm">{answer.answer} <b className="text-indigo-300">×{answer.count}</b></span>) : <span className="text-sm text-slate-500">Waiting for responses…</span>}</div>}
  </section>
));

export const AssessmentModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('library');
  const [assessments, setAssessments] = useState<AssessmentDefinition[]>([]);
  const [reports, setReports] = useState<AssessmentReport[]>([]);
  const [editing, setEditing] = useState<AssessmentDefinition | null>(null);
  const [session, setSession] = useState<LiveSessionCredentials | null>(AssessmentService.loadActiveSession);
  const [liveReport, setLiveReport] = useState<AssessmentReport | null>(null);
  const [selectedReport, setSelectedReport] = useState<AssessmentReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshLocal = () => { setAssessments(AssessmentService.listAssessments()); setReports(AssessmentService.listReports()); };
  useEffect(() => {
    const show = () => { refreshLocal(); setSession(AssessmentService.loadActiveSession()); setOpen(true); };
    window.addEventListener('jhw-open-assessments', show);
    return () => window.removeEventListener('jhw-open-assessments', show);
  }, []);

  useEffect(() => {
    if (!open || !session || tab !== 'live') return;
    let cancelled = false;
    const poll = async () => {
      try { const report = await AssessmentService.getResults(session); if (!cancelled) { setLiveReport(report); setError(null); } }
      catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load live results.'); }
    };
    poll();
    const timer = window.setInterval(poll, 1500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [open, session, tab]);

  if (!open) return null;

  const create = (kind: AssessmentKind) => { setEditing(AssessmentService.createAssessment(kind)); setTab('builder'); setError(null); };
  const updateQuestion = (id: string, patch: Partial<AssessmentQuestion>) => setEditing((current) => current ? ({ ...current, questions: current.questions.map((question) => question.id === id ? { ...question, ...patch } : question) }) : current);
  const changeQuestionType = (question: AssessmentQuestion, type: AssessmentQuestion['type']) => {
    const replacement = AssessmentService.createQuestion(type);
    updateQuestion(question.id, { ...replacement, id: question.id, prompt: question.prompt, points: question.points });
  };
  const save = (): AssessmentDefinition | null => {
    if (!editing) return null;
    try { const saved = AssessmentService.saveAssessment(editing); setEditing(saved); refreshLocal(); setError(null); return saved; }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save assessment.'); return null; }
  };
  const launch = async (assessment: AssessmentDefinition) => {
    setBusy(true); setError(null);
    try {
      const saved = AssessmentService.saveAssessment(assessment);
      refreshLocal();
      const launched = await AssessmentService.launch(saved);
      setSession(launched); setLiveReport(null); setTab('live');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not launch live session.'); }
    finally { setBusy(false); }
  };
  const endSession = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const report = await AssessmentService.endSession(session);
      setSession(null); setLiveReport(null); setSelectedReport(report); refreshLocal(); setTab('reports');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not end the session.'); }
    finally { setBusy(false); }
  };
  const copyJoin = async () => {
    if (!session) return;
    await navigator.clipboard.writeText(session.joinUrl);
    setCopied(true); window.setTimeout(() => setCopied(false), 1500);
  };

  const tabs: Array<[Tab, string, React.ReactNode]> = [
    ['library', 'Polls & Quizzes', <ClipboardCheck key="library" className="h-4 w-4" />],
    ['builder', 'Builder', <Edit3 key="builder" className="h-4 w-4" />],
    ['live', 'Live Responses', <Radio key="live" className="h-4 w-4" />],
    ['reports', 'Reports', <BarChart3 key="reports" className="h-4 w-4" />],
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Assessments" className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-700 px-5 py-4"><div><h2 className="text-lg font-bold">Class Assessments</h2><p className="text-xs text-slate-400">Polls, quizzes, live responses and reports</p></div><button type="button" aria-label="Close assessments" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-800"><X className="h-5 w-5" /></button></header>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950/40 p-2">{tabs.map(([id, label, icon]) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{icon}{label}{id === 'live' && session ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> : null}</button>)}</nav>
        {error && <div className="mx-5 mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</div>}

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'library' && <div>
            <div className="mb-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => create('poll')} className="flex items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-left hover:bg-sky-500/20"><Radio className="h-8 w-8 text-sky-400" /><div><b>Create Poll</b><p className="text-xs text-slate-400">Collect opinions and live responses</p></div></button><button type="button" onClick={() => create('quiz')} className="flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-left hover:bg-violet-500/20"><ClipboardCheck className="h-8 w-8 text-violet-400" /><div><b>Create Quiz</b><p className="text-xs text-slate-400">Correct answers, points and scoring</p></div></button></div>
            {assessments.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center text-slate-500">Create your first poll or quiz.</div> : <div className="grid gap-3 lg:grid-cols-2">{assessments.map((assessment) => <article key={assessment.id} className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4"><div className="flex items-start justify-between gap-3"><div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${assessment.kind === 'quiz' ? 'bg-violet-500/20 text-violet-300' : 'bg-sky-500/20 text-sky-300'}`}>{assessment.kind}</span><h3 className="mt-2 font-semibold">{assessment.title}</h3><p className="mt-1 text-xs text-slate-400">{assessment.questions.length} question{assessment.questions.length === 1 ? '' : 's'} • Updated {new Date(assessment.updatedAt).toLocaleDateString()}</p></div><button type="button" aria-label={`Delete ${assessment.title}`} onClick={() => { AssessmentService.deleteAssessment(assessment.id); refreshLocal(); }} className="p-2 text-slate-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button></div><div className="mt-4 flex gap-2"><button type="button" onClick={() => { setEditing(structuredClone(assessment)); setTab('builder'); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"><Edit3 className="h-4 w-4" />Edit</button><button type="button" disabled={busy} onClick={() => launch(assessment)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold hover:bg-emerald-500 disabled:opacity-40"><Play className="h-4 w-4" />Launch</button></div></article>)}</div>}
          </div>}

          {tab === 'builder' && (editing ? <div className="mx-auto max-w-4xl">
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]"><div className="space-y-3"><input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} maxLength={120} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xl font-bold outline-none focus:border-indigo-500" placeholder="Assessment title" /><input value={editing.description || ''} onChange={(event) => setEditing({ ...editing, description: event.target.value })} maxLength={500} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 outline-none focus:border-indigo-500" placeholder="Instructions (optional)" /></div><div className="flex rounded-xl bg-slate-950 p-1 self-start">{(['poll', 'quiz'] as AssessmentKind[]).map((kind) => <button key={kind} onClick={() => setEditing({ ...editing, kind })} className={`rounded-lg px-4 py-2 text-sm font-bold capitalize ${editing.kind === kind ? 'bg-indigo-600' : 'text-slate-400'}`}>{kind}</button>)}</div></div>
            <div className="space-y-4">{editing.questions.map((question, qIndex) => <section key={question.id} className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4"><div className="mb-3 flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold">{qIndex + 1}</span><input value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} maxLength={500} placeholder="Type the question" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-semibold outline-none focus:border-indigo-500" /><select value={question.type} onChange={(event) => changeQuestionType(question, event.target.value as AssessmentQuestion['type'])} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"><option value="multiple-choice">Multiple choice</option><option value="true-false">True / False</option><option value="short-answer">Short answer</option></select><button type="button" disabled={editing.questions.length === 1} onClick={() => setEditing({ ...editing, questions: editing.questions.filter((item) => item.id !== question.id) })} className="p-2 text-slate-500 hover:text-rose-400 disabled:opacity-20"><Trash2 className="h-4 w-4" /></button></div>
              {question.type === 'short-answer' ? <div><label className="text-xs text-slate-400">{editing.kind === 'quiz' ? 'Accepted answer (separate alternatives with |)' : 'Students type a free response'}{editing.kind === 'quiz' && <input value={question.correctText || ''} onChange={(event) => updateQuestion(question.id, { correctText: event.target.value })} className="mt-1 w-full rounded-lg border border-emerald-700/50 bg-slate-900 px-3 py-2 outline-none" placeholder="e.g. photosynthesis | photo synthesis" />}</label></div> : <div className="grid gap-2 sm:grid-cols-2">{question.options.map((choice, optionIndex) => <div key={choice.id} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 p-2">{editing.kind === 'quiz' && <input type="radio" name={`correct-${question.id}`} checked={question.correctOptionId === choice.id} onChange={() => updateQuestion(question.id, { correctOptionId: choice.id })} title="Correct answer" className="accent-emerald-500" />}<input value={choice.text} disabled={question.type === 'true-false'} onChange={(event) => updateQuestion(question.id, { options: question.options.map((item) => item.id === choice.id ? { ...item, text: event.target.value } : item) })} className="min-w-0 flex-1 bg-transparent outline-none" />{question.type === 'multiple-choice' && question.options.length > 2 && <button type="button" onClick={() => { const options = question.options.filter((item) => item.id !== choice.id); updateQuestion(question.id, { options, correctOptionId: question.correctOptionId === choice.id ? options[0]?.id : question.correctOptionId }); }} className="text-slate-500 hover:text-rose-400"><X className="h-4 w-4" /></button>}<span className="text-xs text-slate-600">{String.fromCharCode(65 + optionIndex)}</span></div>)}{question.type === 'multiple-choice' && question.options.length < 8 && <button type="button" onClick={() => updateQuestion(question.id, { options: [...question.options, { ...AssessmentService.createQuestion().options[0], text: `Option ${question.options.length + 1}` }] })} className="rounded-lg border border-dashed border-slate-600 p-2 text-sm text-slate-400 hover:text-white"><Plus className="mr-1 inline h-4 w-4" />Add option</button>}</div>}
              {editing.kind === 'quiz' && <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">Points <input type="number" min={1} max={100} value={question.points} onChange={(event) => updateQuestion(question.id, { points: Math.max(1, Number(event.target.value)) })} className="w-20 rounded-md border border-slate-700 bg-slate-900 px-2 py-1" /></label>}
            </section>)}</div>
            <button type="button" onClick={() => setEditing({ ...editing, questions: [...editing.questions, AssessmentService.createQuestion()] })} className="mt-4 w-full rounded-xl border border-dashed border-slate-600 p-3 text-sm text-slate-400 hover:border-indigo-500 hover:text-white"><Plus className="mr-2 inline h-4 w-4" />Add question</button>
            <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-slate-700 bg-slate-900/95 py-4"><button type="button" onClick={() => { if (save()) setTab('library'); }} className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 font-semibold hover:bg-slate-600"><Save className="h-4 w-4" />Save</button><button type="button" disabled={busy} onClick={() => { const saved = save(); if (saved) launch(saved); }} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-bold hover:bg-emerald-500 disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Launch live</button></div>
          </div> : <div className="p-12 text-center text-slate-500">Choose an assessment to edit or create a new one.</div>)}

          {tab === 'live' && (session ? <div className="space-y-5">
            <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"><div className="grid gap-5 md:grid-cols-[1fr_auto]"><div><div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />LIVE SESSION</div><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-4xl font-black tracking-[.25em]">{session.code}</span><button type="button" onClick={copyJoin} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm">{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy join link'}</button></div><p className="mt-2 break-all text-xs text-slate-400">{session.joinUrl}</p></div><button type="button" disabled={busy} onClick={endSession} className="self-center rounded-xl bg-rose-600 px-5 py-3 font-bold hover:bg-rose-500 disabled:opacity-40">End & save report</button></div></section>
            {liveReport ? <><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-800 p-4"><Users className="mb-2 h-5 w-5 text-sky-400" /><b className="text-2xl">{liveReport.participantCount}</b><p className="text-xs text-slate-400">Participants</p></div><div className="rounded-xl bg-slate-800 p-4"><Radio className="mb-2 h-5 w-5 text-indigo-400" /><b className="text-2xl">{liveReport.responseCount}</b><p className="text-xs text-slate-400">Responses</p></div><div className="rounded-xl bg-slate-800 p-4"><BarChart3 className="mb-2 h-5 w-5 text-emerald-400" /><b className="text-2xl">{liveReport.averagePercentage === null ? '—' : `${liveReport.averagePercentage}%`}</b><p className="text-xs text-slate-400">Class average</p></div></div><div className="space-y-3">{resultBars(liveReport)}</div></> : <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>}
          </div> : <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center"><Radio className="mx-auto mb-3 h-10 w-10 text-slate-600" /><h3 className="font-semibold">No live session</h3><p className="mt-1 text-sm text-slate-500">Launch a poll or quiz from the library.</p><button type="button" onClick={() => setTab('library')} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold">Open library</button></div>)}

          {tab === 'reports' && <div className="grid gap-4 lg:grid-cols-[280px_1fr]"><aside className="space-y-2">{reports.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Completed sessions appear here.</div> : reports.map((report) => <button key={report.id} type="button" onClick={() => setSelectedReport(report)} className={`w-full rounded-xl border p-3 text-left ${selectedReport?.id === report.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-950/50'}`}><b className="block truncate">{report.title}</b><span className="text-xs text-slate-400">{report.participantCount} participants • {new Date(report.endedAt || report.createdAt).toLocaleDateString()}</span></button>)}</aside><div>{selectedReport ? <div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-bold">{selectedReport.title}</h3><p className="text-sm text-slate-400">Code {selectedReport.code} • {selectedReport.participantCount} participants • {selectedReport.averagePercentage === null ? 'Poll' : `${selectedReport.averagePercentage}% class average`}</p></div><div className="flex gap-2"><button type="button" onClick={() => AssessmentService.downloadReportCsv(selectedReport)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold"><Download className="h-4 w-4" />CSV</button><button type="button" onClick={() => AssessmentService.printReport(selectedReport)} className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold"><Printer className="h-4 w-4" />Print</button><button type="button" onClick={() => { AssessmentService.deleteReport(selectedReport.id); setSelectedReport(null); refreshLocal(); }} className="rounded-lg p-2 text-slate-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button></div></div>{resultBars(selectedReport)}<div className="overflow-x-auto rounded-xl border border-slate-700"><table className="w-full text-sm"><thead className="bg-slate-800 text-left text-slate-300"><tr><th className="p-3">Student</th><th className="p-3">Answered</th><th className="p-3">Score</th><th className="p-3">Percentage</th></tr></thead><tbody>{selectedReport.participants.map((participant) => <tr key={participant.participantId} className="border-t border-slate-800"><td className="p-3 font-medium">{participant.name}</td><td className="p-3">{participant.answeredCount}</td><td className="p-3">{participant.score}/{participant.maxScore}</td><td className="p-3">{participant.percentage === null ? '—' : `${participant.percentage}%`}</td></tr>)}</tbody></table></div></div> : <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-700 text-slate-500"><FileText className="mr-2 h-5 w-5" />Select a report</div>}</div></div>}
        </div>
      </div>
    </div>
  );
};
