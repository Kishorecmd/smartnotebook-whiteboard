import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Send, Users } from 'lucide-react';
import { AssessmentService } from '../../services';
import type { JoinedParticipant, PublicAssessmentSession } from '../../types';

export const StudentResponseView: React.FC<{ code: string }> = ({ code }) => {
  const storageKey = `jhw_participant_${code}`;
  const [session, setSession] = useState<PublicAssessmentSession | null>(null);
  const [participant, setParticipant] = useState<JoinedParticipant | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { return null; }
  });
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [busyQuestion, setBusyQuestion] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const next = await AssessmentService.getPublicSession(code);
        if (!cancelled) { setSession(next); setError(null); }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load this assessment.');
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [code]);

  const join = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setJoining(true); setError(null);
    try {
      const joined = await AssessmentService.join(code, name.trim());
      setParticipant(joined);
      sessionStorage.setItem(storageKey, JSON.stringify(joined));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not join.');
    } finally { setJoining(false); }
  };

  const submit = async (questionId: string) => {
    if (!participant || !answers[questionId]?.trim()) return;
    setBusyQuestion(questionId); setError(null);
    try {
      await AssessmentService.submitResponse(code, participant, questionId, answers[questionId]);
      setSubmitted((current) => new Set(current).add(questionId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit your response.');
    } finally { setBusyQuestion(null); }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-3"><span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-300">{session?.kind || 'Assessment'}</span><span className="font-mono text-sm text-slate-400">Code {code}</span></div>
          <h1 className="text-2xl font-bold sm:text-3xl">{session?.title || 'Joining assessment…'}</h1>
          {session?.description && <p className="mt-2 text-slate-300">{session.description}</p>}
          {session && <div className="mt-4 flex items-center gap-2 text-sm text-slate-400"><Users className="h-4 w-4" /> {session.participantCount} joined</div>}
        </header>

        {error && <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

        {!session && !error && <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>}

        {session && !participant && session.status === 'active' && (
          <form onSubmit={join} className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <label className="text-sm font-semibold">Your name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Enter your name" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg outline-none focus:border-indigo-500" /></label>
            <button disabled={joining || !name.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold hover:bg-indigo-500 disabled:opacity-40">{joining ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Join assessment</button>
          </form>
        )}

        {session?.status === 'ended' && <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center"><CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-400" /><h2 className="text-xl font-bold">Assessment complete</h2><p className="mt-2 text-slate-300">Your teacher has ended this session.</p></div>}

        {session && participant && session.status === 'active' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-900/70 px-4 py-3 text-sm text-slate-300">Responding as <strong className="text-white">{participant.name}</strong>. You can update an answer by submitting it again.</div>
            {session.questions.map((question, index) => (
              <section key={question.id} className="rounded-2xl border border-white/10 bg-slate-900/85 p-5 shadow-xl">
                <div className="mb-4 flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold">{index + 1}</span><h2 className="pt-1 text-lg font-semibold">{question.prompt}</h2></div>
                {question.type === 'short-answer' ? (
                  <textarea value={answers[question.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} maxLength={1000} rows={3} placeholder="Type your response" className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-indigo-500" />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">{question.options.map((choice) => <label key={choice.id} className={`cursor-pointer rounded-xl border p-3 transition ${answers[question.id] === choice.id ? 'border-indigo-400 bg-indigo-500/20' : 'border-slate-700 bg-slate-950/70 hover:border-slate-500'}`}><input type="radio" name={question.id} value={choice.id} checked={answers[question.id] === choice.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice.id }))} className="mr-2 accent-indigo-500" />{choice.text}</label>)}</div>
                )}
                <div className="mt-4 flex items-center justify-between"><span className="text-xs text-emerald-400">{submitted.has(question.id) ? 'Response submitted' : ''}</span><button type="button" onClick={() => submit(question.id)} disabled={!answers[question.id]?.trim() || busyQuestion === question.id} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold hover:bg-indigo-500 disabled:opacity-40">{busyQuestion === question.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{submitted.has(question.id) ? 'Update' : 'Submit'}</button></div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};
