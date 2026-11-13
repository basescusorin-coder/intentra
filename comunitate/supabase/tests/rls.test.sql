-- Run only against a disposable local Supabase stack after applying all migrations.
begin;
select plan(22);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('10000000-0000-4000-8000-000000000001',null,'authenticated','authenticated','rls-a@example.invalid','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000002',null,'authenticated','authenticated','rls-b@example.invalid','',now(),'{}','{}',now(),now()),
 ('10000000-0000-4000-8000-000000000003',null,'authenticated','authenticated','rls-admin@example.invalid','',now(),'{}','{}',now(),now());
insert into public.profiles(user_id,username,canton,city,language,phone) values
 ('10000000-0000-4000-8000-000000000001','rls_user_a','AG','Bremgarten','ro','+41790000001'),
 ('10000000-0000-4000-8000-000000000002','rls_user_b','ZH','Zürich','de','+41790000002'),
 ('10000000-0000-4000-8000-000000000003','rls_admin','BE','Bern','en',null);
insert into public.community_admins(user_id,role) values ('10000000-0000-4000-8000-000000000003','administrator');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
insert into public.posts(id,author_id,category,title,body,canton,city,price_chf,status) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','free','Published fixture','Published public fixture body','AG','Bremgarten',null,'pending');
insert into public.posts(id,author_id,category,title,body,canton,city,price_chf,status) values
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','question','Own pending fixture','Private own pending fixture body','AG','Bremgarten',null,'pending');
insert into storage.objects(bucket_id,name) values ('community-images','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg');
insert into public.post_images(post_id,object_path) values ('20000000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
insert into public.posts(id,author_id,category,title,body,canton,city,price_chf,status) values
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','question','Pending fixture','Private pending fixture body','ZH','Zürich',null,'pending');
insert into storage.objects(bucket_id,name) values ('community-images','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg');
insert into public.post_images(post_id,object_path) values ('20000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
insert into public.comments(id,post_id,author_id,body,status) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Public comment fixture','pending');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
insert into public.comments(id,post_id,author_id,body,status) values
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Pending comment fixture','pending');
insert into public.reports(id,post_id,reporter_id,reason) values
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Fixture report');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}',true);
select public.community_moderate_post('20000000-0000-4000-8000-000000000001','published','RLS fixture');
select public.community_moderate_comment('30000000-0000-4000-8000-000000000001','published','RLS fixture');


set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select is((select count(*)::integer from public.posts),1,'anonymous sees only published listings');
select is((select count(*)::integer from public.comments),1,'anonymous sees only public comments');
select is((select count(*)::integer from storage.objects where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'),1,'anonymous can read image only after post publication');
select is((select count(*)::integer from public.community_public_profiles where username='rls_user_a'),1,'public pseudonym projection is readable');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='community_public_profiles' and column_name in ('phone','email','user_id')),'public profile projection has no contact identifiers');
select ok(not has_column_privilege('anon','public.posts','author_id','select'),'public table grant hides internal author UUIDs');
select ok(not has_column_privilege('authenticated','public.posts','author_id','select'),'member table grant hides internal author UUIDs');
select is((select count(*)::integer from storage.objects where name='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'),0,'anonymous cannot read pending post images');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('community-images','cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg')$$,'42501',null,'anonymous cannot upload directly');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
select is((select count(*)::integer from public.posts where id='20000000-0000-4000-8000-000000000003'),1,'member A can read own pending post');
select is((select count(*)::integer from public.posts where id='20000000-0000-4000-8000-000000000002'),0,'member A cannot read member B pending post');
select is((select count(*)::integer from public.profiles),1,'member A can read only own private profile');
select is((select count(*)::integer from public.reports),0,'member A cannot read another member report');
select is((select count(*)::integer from public.post_images where post_id='20000000-0000-4000-8000-000000000002'),0,'member A cannot read member B image references');
select is((select count(*)::integer from storage.objects where name='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg'),0,'member A cannot read member B image object');
select is((with changed as (update public.posts set title='Unauthorized update' where id='20000000-0000-4000-8000-000000000002' returning id) select count(*)::integer from changed),0,'member A cannot update member B post');
select is((with removed as (delete from public.posts where id='20000000-0000-4000-8000-000000000002' returning id) select count(*)::integer from removed),0,'member A cannot delete member B post');
select throws_ok($$update public.posts set status='published' where id='20000000-0000-4000-8000-000000000003'$$,'42501',null,'member cannot bypass moderation status');
select is(jsonb_array_length(public.community_export_my_data()->'posts'),2,'export RPC includes only the account holder posts');
select throws_ok($$insert into public.posts(author_id,category,title,body,canton,city,price_chf,status) values ('10000000-0000-4000-8000-000000000001','job','Job fixture','Job category must remain closed','AG','Bremgarten',null,'pending')$$,'42501',null,'database rejects job category');
select is(public.community_is_admin(),false,'admin operations denied to non-admin AAL1 user');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}',true);
select is(public.community_is_admin(),true,'admin check requires listed user and AAL2');
reset role;

select * from finish();
rollback;
