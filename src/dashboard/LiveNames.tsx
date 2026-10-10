import { useEffect, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { useLiveClass } from './data';
import { classStudents } from './model';
import { makeGroups } from '../classroom/model';
import { Avatar } from './Avatar';
import { useNameShuffle } from '../classroom/useNameShuffle';
import type { Student } from './model';
export function LiveNames({ groups = false }: {groups?: boolean}) {
  const { snapshot, presenting } = useLiveClass();
  const [presentOnly,setPresentOnly] = useState(true), [count,setCount] = useState(3), [result,setResult] = useState<string[][]>([]);
  // The card flicks through the class and settles on one student.
  const shuffle = useNameShuffle<Student>(() => {});
  const { reset } = shuffle;
  useEffect(()=>{if(!snapshot){setResult([]);reset();}},[snapshot, reset]);
  const students = classStudents(snapshot,presentOnly);
  if(presenting) return null;
  return <div className="cs-names"><span className="cs-eyebrow">From your classroom · session only</span><label className="cs-custom-time"><input style={{width:18}} type="checkbox" checked={presentOnly} onChange={e=>{setPresentOnly(e.target.checked);setResult([]);shuffle.reset();}}/>Present students only</label>{!snapshot ? <p>Connect your classroom to load students.</p> : presentOnly && !snapshot.attendance.marked ? <p>Attendance not marked yet. Take attendance on the Home screen, or untick this to use all students.</p> : <p>{students.length} students available</p>}{groups && <label className="cs-custom-time">Groups <select aria-label="Number of classroom groups" value={count} onChange={e=>setCount(Number(e.target.value))}>{[2,3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label>}{groups ? <div className="cs-group-results" aria-live="polite">{snapshot && result.map((g,i)=><div key={i}><b>Group {i+1}</b><p>{g.join(', ')}</p></div>)}</div>
    : snapshot && shuffle.shown && <div className={`cs-pick ${shuffle.rolling ? 'is-rolling' : 'is-picked'}`} key={shuffle.tick}><Avatar name={shuffle.shown.name} photo={shuffle.shown.photo} className="live-avatar cs-pick-photo"/><p>{shuffle.shown.name}</p></div>}
    {!groups && <p className="cs-visually-hidden" aria-live="polite">{shuffle.rolling ? '' : shuffle.shown?.name ?? ''}</p>}
    <button className="cs-primary" disabled={!students.length || shuffle.rolling} onClick={()=>groups ? setResult(makeGroups(students.map(s=>s.name),count)) : shuffle.start(students)}><Shuffle size={17}/>{groups ? 'Make groups' : shuffle.rolling ? 'Choosing…' : 'Pick a student'}</button></div>;
}
export function LiveTeams() {
  const { snapshot, presenting } = useLiveClass();
  const [teams,setTeams] = useState<string[][]>([]), [scores,setScores] = useState([0,0]);
  useEffect(()=>{if(!snapshot){setTeams([]);setScores([0,0]);}},[snapshot]);
  if(presenting) return null;
  const students = classStudents(snapshot,true);
  return <div className="cs-names"><button className="cs-primary" disabled={students.length < 2} onClick={()=>{setTeams(makeGroups(students.map(s=>s.name),2));setScores([0,0]);}}>Make two temporary teams</button><p className="live-muted">Uses present students. Names and scores are kept only for this session.</p><div className="cs-score">{['A','B'].map((name,i)=><div className={`cs-team cs-team-${name}`} key={name}><b>Team {name}</b><strong>{scores[i]}</strong><button aria-label={`Add point to classroom team ${name}`} onClick={()=>setScores(s=>s.map((v,j)=>j===i?v+1:v))}>+1</button><p>{snapshot && teams[i]?.join(', ')}</p></div>)}</div></div>;
}
