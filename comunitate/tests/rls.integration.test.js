import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

test('migrations are repeatable and RLS isolates users, images, jobs and MFA moderation', async () => {
  const db = new PGlite();
  const root = fileURLToPath(new URL('../', import.meta.url));
  const exec = (sql) => db.exec(sql);
  try { await exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
 CREATE TABLE auth.users(id uuid PRIMARY KEY, instance_id uuid, aud text, role text, email text UNIQUE, encrypted_password text DEFAULT '', email_confirmed_at timestamptz, raw_app_meta_data jsonb DEFAULT '{}', raw_user_meta_data jsonb DEFAULT '{}', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$; GRANT USAGE ON SCHEMA auth TO anon, authenticated; GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO anon, authenticated;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT SELECT ON storage.objects TO anon, authenticated;`);
 const schema=(await fs.readFile(root+'/db/schema.sql','utf8')).replace(/^create extension if not exists pgcrypto;\s*/m,'');
 await exec(schema);
 await exec(await fs.readFile(root+'/supabase/migrations/20261113000100_security_and_features.sql','utf8'));
 await exec(await fs.readFile(root+'/supabase/migrations/20261113000200_mvp_hardening.sql','utf8'));
 await exec(await fs.readFile(root+'/supabase/migrations/20261113000100_security_and_features.sql','utf8'));
 await exec(await fs.readFile(root+'/supabase/migrations/20261113000200_mvp_hardening.sql','utf8'));
 await exec(`INSERT INTO auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) VALUES
 ('10000000-0000-4000-8000-000000000001','authenticated','authenticated','a@example.invalid',now(),'{}','{}'),
 ('10000000-0000-4000-8000-000000000002','authenticated','authenticated','b@example.invalid',now(),'{}','{}'),
 ('10000000-0000-4000-8000-000000000003','authenticated','authenticated','admin@example.invalid',now(),'{}','{}');
 INSERT INTO public.profiles(user_id,username,canton,city) VALUES
 ('10000000-0000-4000-8000-000000000001','user_a','AG','Bremgarten'),
 ('10000000-0000-4000-8000-000000000002','user_b','ZH','Zürich'),
 ('10000000-0000-4000-8000-000000000003','user_admin','BE','Bern');
 INSERT INTO public.community_admins(user_id,role) VALUES ('10000000-0000-4000-8000-000000000003','administrator');
 `);
 await exec(`SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false); SELECT set_config('request.jwt.claims','{\"sub\":\"10000000-0000-4000-8000-000000000001\",\"role\":\"authenticated\",\"aal\":\"aal1\"}',false); INSERT INTO public.posts(id,author_id,category,title,body,canton,city,status) VALUES ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','free','Public listing','Long enough listing body','AG','Bremgarten','pending');`);
 await exec(`INSERT INTO storage.objects(bucket_id,name) VALUES('community-images','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'); INSERT INTO public.post_images(post_id,object_path) VALUES('20000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg');`);
 await exec(`INSERT INTO public.posts(id,author_id,category,title,body,canton,city,status) VALUES ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','question','Own pending','Long enough own pending body','AG','Bremgarten','pending');`);
 await exec(`SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false); SELECT set_config('request.jwt.claims','{\"sub\":\"10000000-0000-4000-8000-000000000002\",\"role\":\"authenticated\",\"aal\":\"aal1\"}',false); INSERT INTO public.posts(id,author_id,category,title,body,canton,city,status) VALUES ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','question','Pending listing','Long enough pending body','ZH','Zürich','pending');`);
 await exec(`INSERT INTO storage.objects(bucket_id,name) VALUES('community-images','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg'); INSERT INTO public.post_images(post_id,object_path) VALUES('20000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg');`);
 await exec(`SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false); SELECT set_config('request.jwt.claims','{\"sub\":\"10000000-0000-4000-8000-000000000003\",\"role\":\"authenticated\",\"aal\":\"aal2\"}',false); SELECT public.community_moderate_post('20000000-0000-4000-8000-000000000001','published','fixture');`);
 const check=(condition,message)=>assert.ok(condition,message);
 await exec(`SET ROLE anon; SELECT set_config('request.jwt.claims','{"role":"anon"}',false);`);
 let res=await db.query('select id,author_username,is_mine from public.community_feed');
 check(res.rows.length===1 && res.rows[0].is_mine===false,'anonymous feed includes published rows only');
 check(!('author_id' in res.rows[0]),'public feed omits auth UUID');
 res=await db.query("select count(*)::int as n from storage.objects where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'");check(res.rows[0].n===1,'anonymous can access published image');
 let anonUploadDenied=false;try{await db.query("insert into storage.objects(bucket_id,name) values ('community-images','cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg')")}catch(e){anonUploadDenied=e.code==='42501'}check(anonUploadDenied,'anonymous cannot upload objects directly');
 check(!(await db.query("select column_name from information_schema.columns where table_name='community_public_profiles' and column_name in ('user_id','phone','email')")).rows.length,'public profile view omits IDs and contact fields');
 await exec('RESET ROLE; SET ROLE authenticated; SELECT set_config(\'request.jwt.claim.sub\',\'10000000-0000-4000-8000-000000000001\',false); SELECT set_config(\'request.jwt.claims\',\'{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}\',false);');
 res=await db.query('select id,is_mine,status from public.community_feed order by id');
 check(res.rows.length===2 && res.rows.some(r=>r.is_mine && r.status==='pending') && !res.rows.some(r=>r.status==='pending' && !r.is_mine),'member sees own pending content but no other pending rows');
 res=await db.query("select count(*)::int as n from public.profiles"); check(res.rows[0].n===1,'member profile RLS restricts rows to self');
 res=await db.query("select count(*)::int as n from public.reports"); check(res.rows[0].n===0,'member cannot see another member reports');
 res=await db.query("select count(*)::int as n from public.post_images where post_id='20000000-0000-4000-8000-000000000002'");check(res.rows[0].n===0,'member cannot read another member image reference');
 res=await db.query("with changed as (update public.posts set title='Unauthorized' where id='20000000-0000-4000-8000-000000000002' returning id) select count(*)::int as n from changed"); check(res.rows[0].n===0,'member cannot update another member post');
 res=await db.query("with removed as (delete from public.posts where id='20000000-0000-4000-8000-000000000002' returning id) select count(*)::int as n from removed"); check(res.rows[0].n===0,'member cannot delete another member post');
 let statusDenied=false;try{await db.query("update public.posts set status='published' where id='20000000-0000-4000-8000-000000000003'")}catch(e){statusDenied=e.code==='42501'}check(statusDenied,'member cannot change moderation status');
 let authorIdDenied=false;try{await db.query('select author_id from public.posts')}catch(e){authorIdDenied=e.code==='42501'}check(authorIdDenied,'member cannot select author UUID column');
 res=await db.query('select public.community_export_my_data() as payload'); check(res.rows[0].payload.email==='a@example.invalid' && res.rows[0].payload.profile.username==='user_a' && res.rows[0].payload.posts.length===2,'private export RPC returns own data only');
 let jobDenied=false; try {await db.query(`insert into public.posts(author_id,category,title,body,canton,city,status) values ('10000000-0000-4000-8000-000000000001','job','Jobs title','A sufficiently long body','AG','Bremgarten','pending')`)} catch(e){jobDenied=e.message.includes('job_category_disabled')}; check(jobDenied,'database trigger rejects Job category');
 let crossDenied=false; try {await db.query("update public.posts set title='Hacked title' where id='20000000-0000-4000-8000-000000000002'")} catch(e){crossDenied=false}; res=await db.query("select title from public.posts where id='20000000-0000-4000-8000-000000000002'"); check(!res.rows.length,'RLS hides other member pending row from direct reads');
 res=await db.query("select community_is_admin() as ok"); check(res.rows[0].ok===false,'non-admin AAL1 cannot use admin gate');
 await exec('RESET ROLE; SET ROLE authenticated; SELECT set_config(\'request.jwt.claim.sub\',\'10000000-0000-4000-8000-000000000003\',false); SELECT set_config(\'request.jwt.claims\',\'{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}\',false);');
 res=await db.query('select community_is_admin() as ok'); check(res.rows[0].ok===true,'listed admin with AAL2 passes admin gate');
 await db.query("select community_moderate_post('20000000-0000-4000-8000-000000000002','published','test approval')");
 res=await db.query("select status from public.posts where id='20000000-0000-4000-8000-000000000002'"); check(res.rows[0].status==='published','MFA admin moderation publishes and audits post');
 res=await db.query('select count(*)::int as n from public.community_moderation_audit'); check(res.rows[0].n===2,'both moderation actions are audited');
  } finally {
    await db.close();
  }
});
