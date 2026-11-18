import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJob, deduplicateJobs, filterJobs, safeHttpsUrl } from './job-normalizer.mjs';
const now = new Date('2026-11-18T12:00:00Z');
const sample = {
 id:'example-123', title:'Pflegehelferin', status:'PUBLISHED_PUBLIC',
 url:'https://www.job-room.ch/job-search/example-123',
 company:{name:'Beispiel Pflege'}, location:{city:'Bremgarten',canton:'AG'},
 workload_min:60,workload_max:100,published_from:'2026-11-10',published_until:'2026-12-10',
 apply:{url:'https://example.org/apply'}
};
test('accepts valid publicly visible job',()=> {
 const job=normalizeJob(sample,now);
 assert.equal(job.title,'Pflegehelferin');
 assert.equal(job.canton,'AG');
 assert.equal(job.apply_url,'https://example.org/apply');
});
test('excludes restricted job',()=>assert.equal(normalizeJob({...sample,status:'PUBLISHED_RESTRICTED'},now),null));
test('excludes expired job',()=>assert.equal(normalizeJob({...sample,published_until:'2026-11-17'},now),null));
test('excludes future publication',()=>assert.equal(normalizeJob({...sample,published_from:'2026-11-19'},now),null));
test('excludes forged job source',()=>assert.equal(normalizeJob({...sample,url:'https://evil.example/job'},now),null));
test('rejects javascript links',()=>assert.equal(safeHttpsUrl('javascript:alert(1)'),null));
test('deduplicates stable external IDs',()=>assert.equal(deduplicateJobs([sample,sample],now).length,1));
test('filters by canton and profession',()=> {
 const jobs=deduplicateJobs([sample],now);
 assert.equal(filterJobs(jobs,{query:'pflege',canton:'AG'}).length,1);
 assert.equal(filterJobs(jobs,{query:'lager',canton:'AG'}).length,0);
});

test('missing workload stays unknown rather than 0%',()=>{
 const job=normalizeJob({...sample,workload_min:null,workload_max:undefined},now);
 assert.equal(job.workload_min,null);assert.equal(job.workload_max,null);
});
