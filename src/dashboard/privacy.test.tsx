import { describe, expect, it, vi } from 'vitest';
vi.mock('../store', () => ({ useWhiteboardStore: { getState: () => ({}) } }));
import { renderToStaticMarkup } from 'react-dom/server';
import { ClassroomHome, ConnectionDialog } from './ClassroomHome';
import { previewData } from './preview';
import type { ClassroomData } from './data';
it('removes student, attendance and private teacher data from presentation markup',()=>{
 const sample=previewData('Grade 3','normal',Date.now());
 const data={loading:false,ready:false,error:'',session:null} as ClassroomData;
 const html=renderToStaticMarkup(<ClassroomHome {...sample} now={Date.now()} presenting data={data} addWidget={()=>{}} onWhiteboard={()=>{}} onPresent={()=>{}} onConnection={()=>{}} preview={false} onPreview={()=>{}}/>);
 expect(html).not.toContain('Sample Student');expect(html).not.toContain('Teacher reminder');expect(html).not.toContain('Present students');expect(html).not.toContain('Today’s attendance');expect(html).toContain('TODAY’S LEARNING');expect(html).toContain('bring your favourite story');
});
describe('offline dashboard',()=>{
 it('keeps local tools reachable when ERP and weather fail',()=>{const html=renderToStaticMarkup(<ClassroomHome mapping={null} snapshot={null} weather={null} now={Date.now()} presenting={false} data={{loading:false,error:'ERP_UNAVAILABLE'} as ClassroomData} addWidget={()=>{}} onWhiteboard={()=>{}} onPresent={()=>{}} onConnection={()=>{}} preview={false} onPreview={()=>{}}/>);expect(html).toContain('Classroom data temporarily unavailable');expect(html).toContain('Open whiteboard');expect(html).toContain('Quick actions');expect(html).not.toContain('0%');});
});
it('offers class teacher login without an administrator role selector', () => {
 const html = renderToStaticMarkup(<ConnectionDialog data={{ready:true,session:null,mapping:null} as ClassroomData} close={()=>{}}/>);
 expect(html).toContain('Class teacher sign in'); expect(html).toContain('current-password'); expect(html).not.toContain('Administrator'); expect(html).not.toContain('Sign in as');
});
it('offers only assigned class teacher sections and selects the single assignment', () => {
 const html = renderToStaticMarkup(<ConnectionDialog data={{ready:true,mapping:null,session:{role:'teacher',name:'Sample Teacher',classes:[{classId:'3',sectionId:'7',grade:'Grade 3',section:'A'}]}} as ClassroomData} close={()=>{}}/>);
 expect(html).toContain('Open my classroom'); expect(html).toContain('value="3/7" selected'); expect(html).not.toContain('current-password');
});
