begin;

select no_plan();

insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
values
    (
        '00000000-0000-0000-0000-000000000001',
        'authenticated',
        'authenticated',
        'ngarciam@unrn.edu.ar',
        '',
        pg_catalog.statement_timestamp(),
        '{"provider":"google","providers":["google"]}'::jsonb,
        '{}'::jsonb,
        pg_catalog.statement_timestamp(),
        pg_catalog.statement_timestamp()
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        'authenticated',
        'authenticated',
        'regular@example.com',
        '',
        pg_catalog.statement_timestamp(),
        '{"provider":"google","providers":["google"]}'::jsonb,
        '{"role":"admin"}'::jsonb,
        pg_catalog.statement_timestamp(),
        pg_catalog.statement_timestamp()
    ),
    (
        '00000000-0000-0000-0000-000000000003',
        'authenticated',
        'authenticated',
        'second@example.com',
        '',
        pg_catalog.statement_timestamp(),
        '{"provider":"google","providers":["google"]}'::jsonb,
        '{}'::jsonb,
        pg_catalog.statement_timestamp(),
        pg_catalog.statement_timestamp()
    ),
    (
        '00000000-0000-0000-0000-000000000004',
        'authenticated',
        'authenticated',
        'fixture-full@example.com',
        '',
        pg_catalog.statement_timestamp(),
        '{"provider":"google","providers":["google"]}'::jsonb,
        '{}'::jsonb,
        pg_catalog.statement_timestamp(),
        pg_catalog.statement_timestamp()
    ),
    (
        '00000000-0000-0000-0000-000000000005',
        'authenticated',
        'authenticated',
        'ngarciam@unrn.edu.ar.evil',
        '',
        pg_catalog.statement_timestamp(),
        '{"provider":"google","providers":["google"]}'::jsonb,
        '{}'::jsonb,
        pg_catalog.statement_timestamp(),
        pg_catalog.statement_timestamp()
    ),
    (
        '00000000-0000-0000-0000-000000000006',
        'authenticated',
        'authenticated',
        'fixture-archive@example.com',
        '',
        pg_catalog.statement_timestamp(),
        '{"provider":"google","providers":["google"]}'::jsonb,
        '{}'::jsonb,
        pg_catalog.statement_timestamp(),
        pg_catalog.statement_timestamp()
    ),
    (
        '00000000-0000-0000-0000-000000000007',
        'authenticated',
        'authenticated',
        'fixture-archived@example.com',
        '',
        pg_catalog.statement_timestamp(),
        '{"provider":"google","providers":["google"]}'::jsonb,
        '{}'::jsonb,
        pg_catalog.statement_timestamp(),
        pg_catalog.statement_timestamp()
    );

insert into public.projects (id, title, description, capacity, assigned_teams, archived_at)
values
    (
        '10000000-0000-0000-0000-000000000001',
        'Available project',
        'Selection fixture',
        4,
        0,
        null
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'Full project',
        'Capacity fixture',
        1,
        1,
        null
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'Project to archive',
        'Archive fixture',
        3,
        2,
        null
    ),
    (
        '10000000-0000-0000-0000-000000000004',
        'Project to edit',
        'Update fixture',
        4,
        0,
        null
    ),
    (
        '10000000-0000-0000-0000-000000000005',
        'Archived project',
        'Archived selection fixture',
        2,
        1,
        pg_catalog.statement_timestamp()
    );

insert into public.teams (id, project_id, selector_id)
values
    (
        '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000004'
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000005'
    ),
    (
        '20000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000007'
    ),
    (
        '20000000-0000-0000-0000-000000000004',
        '10000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000006'
    );

insert into public.team_participants (team_id, first_name, last_name, is_selector)
values
    ('20000000-0000-0000-0000-000000000001', 'Fixture', 'Full', true),
    ('20000000-0000-0000-0000-000000000002', 'Fixture', 'Archive', true),
    ('20000000-0000-0000-0000-000000000003', 'Fixture', 'Archived', true),
    ('20000000-0000-0000-0000-000000000004', 'Fixture', 'Archive', true);

set constraints team_participants_cardinality_check immediate;
set constraints team_participants_cardinality_check deferred;

set local role anon;
select throws_ok('select * from public.projects', '42501', 'anon cannot read projects');
select throws_ok('select * from public.teams', '42501', 'anon cannot read team records');
select throws_ok('select * from public.team_participants', '42501', 'anon cannot read participant records');
select throws_ok(
    $$insert into public.teams (project_id, selector_id)
      values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')$$,
    '42501',
    'anon cannot create team records'
);
select throws_ok(
    $$update public.team_participants set first_name = 'Changed'$$,
    '42501',
    'anon cannot update participant records'
);
reset role;

select pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select pg_catalog.set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"regular@example.com","role":"authenticated","user_metadata":{"role":"admin"}}',
    true
);
set local role authenticated;
select throws_ok(
    $$insert into public.projects (title, description, capacity) values ('No', 'No', 1)$$,
    '42501',
    'regular users cannot insert projects directly'
);
select throws_ok(
    $$update public.projects set capacity = 99 where id = '10000000-0000-0000-0000-000000000001'$$,
    '42501',
    'regular users cannot update projects directly'
);
select throws_ok(
    $$delete from public.projects where id = '10000000-0000-0000-0000-000000000001'$$,
    '42501',
    'regular users cannot delete projects'
);
select throws_ok(
    $$select public.admin_create_project('Unauthorized', 'No', 1)$$,
    '42501',
    'user-editable role metadata does not grant Admin access'
);
select throws_ok(
    $$select public.admin_update_project(
        '10000000-0000-0000-0000-000000000004', 'Changed', 'No', 4
    )$$,
    '42501',
    'regular users cannot update projects through the Admin RPC'
);
select throws_ok(
    $$select public.admin_archive_project('10000000-0000-0000-0000-000000000004')$$,
    '42501',
    'regular users cannot archive projects'
);
select throws_ok(
    $$select * from public.admin_list_projects()$$,
    '42501',
    'regular users cannot read Admin capacity counts'
);
select is(
    (select pg_catalog.count(*) from public.projects where id = '10000000-0000-0000-0000-000000000005'),
    0::bigint,
    'regular users cannot read archived projects'
);
reset role;

select pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
select pg_catalog.set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000005","email":"ngarciam@unrn.edu.ar.evil","role":"authenticated"}',
    true
);
set local role authenticated;
select throws_ok(
    $$select public.admin_create_project('Near miss', 'No', 1)$$,
    '42501',
    'only the exact Admin email is authorized'
);
reset role;

select pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_catalog.set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"ngarciam@unrn.edu.ar","role":"authenticated"}',
    true
);
set local role authenticated;
select lives_ok(
    $$select public.admin_create_project('Created by Admin', 'Created via the authorized RPC', 2)$$,
    'the exact Admin can create a project'
);
select is(
    (select pg_catalog.count(*) from public.projects where title = 'Created by Admin'),
    1::bigint,
    'Admin-created project is persisted'
);
select lives_ok(
    $$select public.admin_update_project(
        '10000000-0000-0000-0000-000000000004', 'Updated project', 'Updated description', 5
    )$$,
    'the exact Admin can update project details and capacity'
);
select is(
    (select capacity from public.projects where id = '10000000-0000-0000-0000-000000000004'),
    5,
    'Admin capacity update is persisted'
);
select throws_ok(
    $$select public.admin_update_project(
        '10000000-0000-0000-0000-000000000003', 'Too small', 'No', 1
    )$$,
    '23514',
    'Capacity must be positive and cannot be below assigned teams',
    'Admin cannot lower capacity below assigned teams'
);
select lives_ok(
    $$select public.admin_archive_project('10000000-0000-0000-0000-000000000003')$$,
    'the exact Admin can archive a project'
);
select ok(
    (select archived_at is not null from public.projects where id = '10000000-0000-0000-0000-000000000003'),
    'archive records a timestamp'
);
select is(
    (select pg_catalog.count(*) from public.teams where project_id = '10000000-0000-0000-0000-000000000003'),
    2::bigint,
    'archiving preserves assigned teams'
);
select is(
    (select pg_catalog.count(*) from public.projects where archived_at is not null),
    2::bigint,
    'Admin can read archived projects'
);
select is(
    (select assigned_teams from public.admin_list_projects() where id = '10000000-0000-0000-0000-000000000002'),
    1,
    'Admin can read capacity counts'
);
select is(
    (select pg_catalog.count(*) from public.teams),
    0::bigint,
    'Admin does not receive individual team roster access'
);
select is(
    (select pg_catalog.count(*) from public.team_participants),
    0::bigint,
    'Admin does not receive individual participant roster access'
);
reset role;

select pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select pg_catalog.set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"regular@example.com","role":"authenticated"}',
    true
);
set local role authenticated;
select ok(
    exists (select 1 from public.projects where id = '10000000-0000-0000-0000-000000000001'),
    'authenticated users can read active projects'
);
select throws_ok(
    $$select public.select_project(
        '10000000-0000-0000-0000-000000000002',
        '[{"first_name":"Alex","last_name":"User","is_selector":true}]'::jsonb
    )$$,
    '23514',
    'Project has no available team slots',
    'selection is rejected when capacity is full'
);
select throws_ok(
    $$select public.select_project(
        '10000000-0000-0000-0000-000000000005',
        '[{"first_name":"Alex","last_name":"User","is_selector":true}]'::jsonb
    )$$,
    '23514',
    'Archived projects cannot receive selections',
    'archived projects reject new selections'
);
select throws_ok(
    $$select public.select_project('10000000-0000-0000-0000-000000000001', '[]'::jsonb)$$,
    '22023',
    'A team must have one to three participants',
    'zero participants are rejected'
);
select throws_ok(
    $$select public.select_project(
        '10000000-0000-0000-0000-000000000001',
        '[{"first_name":"A","last_name":"A","is_selector":true},
          {"first_name":"B","last_name":"B","is_selector":false},
          {"first_name":"C","last_name":"C","is_selector":false},
          {"first_name":"D","last_name":"D","is_selector":false}]'::jsonb
    )$$,
    '22023',
    'A team must have one to three participants',
    'four participants are rejected'
);
select throws_ok(
    $$select public.select_project(
        '10000000-0000-0000-0000-000000000001',
        '[{"first_name":"A","last_name":"A","is_selector":false}]'::jsonb
    )$$,
    '22023',
    'Exactly one participant must be the selector',
    'a roster without a selector row is rejected'
);
select throws_ok(
    $$select public.select_project(
        '10000000-0000-0000-0000-000000000001',
        '[{"first_name":"A","last_name":"A","is_selector":true},
          {"first_name":"B","last_name":"B","is_selector":true}]'::jsonb
    )$$,
    '22023',
    'Exactly one participant must be the selector',
    'a roster with multiple selector rows is rejected'
);
select lives_ok(
    $$select public.select_project(
        '10000000-0000-0000-0000-000000000001',
        '[{"first_name":"  Ada ","last_name":" Lovelace ","is_selector":true}]'::jsonb
    )$$,
    'a one-participant team can be selected'
);
set constraints team_participants_cardinality_check immediate;
set constraints team_participants_cardinality_check deferred;
select is(
    (select pg_catalog.count(*) from public.teams where selector_id = (select auth.uid())),
    1::bigint,
    'selector can read their created team'
);
select is(
    (select pg_catalog.count(*) from public.team_participants),
    1::bigint,
    'selector can read their roster'
);
select ok(
    (select selected_at is not null from public.teams where selector_id = (select auth.uid())),
    'selection time is generated by the database'
);
select is(
    (select first_name from public.team_participants where team_id = (select id from public.teams where selector_id = (select auth.uid()))),
    'Ada',
    'selection trims surrounding whitespace from first names'
);
select lives_ok(
    $$update public.team_participants
      set first_name = 'Augusta', last_name = 'King'
      where team_id = (select id from public.teams where selector_id = (select auth.uid()))$$,
    'selector can update participant names'
);
select is(
    (select first_name || ' ' || last_name from public.team_participants where team_id = (select id from public.teams where selector_id = (select auth.uid()))),
    'Augusta King',
    'selector name update is persisted'
);
select throws_ok(
        $$update public.team_participants
            set first_name = '   '
            where team_id = (select id from public.teams where selector_id = (select auth.uid()))$$,
        '23514',
        'selector cannot save an empty participant name'
);
select throws_ok(
        $$update public.team_participants
            set first_name = ' Padded '
            where team_id = (select id from public.teams where selector_id = (select auth.uid()))$$,
        '23514',
        'selector cannot save an untrimmed participant name'
);
select throws_ok(
    $$update public.team_participants set team_id = '20000000-0000-0000-0000-000000000001'$$,
    '42501',
    'selector cannot change participant team_id'
);
select throws_ok(
    $$update public.team_participants set is_selector = false$$,
    '42501',
    'selector cannot change selector-row identity'
);
select throws_ok(
    $$update public.teams set project_id = '10000000-0000-0000-0000-000000000004'$$,
    '42501',
    'selector cannot change the selected project'
);
select throws_ok(
    $$update public.teams set selector_id = '00000000-0000-0000-0000-000000000003'$$,
    '42501',
    'selector cannot change selector identity'
);
select throws_ok(
    $$update public.teams set selected_at = pg_catalog.statement_timestamp()$$,
    '42501',
    'selector cannot change selection timestamp'
);
select throws_ok(
    $$select public.select_project(
        '10000000-0000-0000-0000-000000000001',
        '[{"first_name":"Again","last_name":"User","is_selector":true}]'::jsonb
    )$$,
    '23505',
    'one selector cannot create two teams'
);
reset role;

select pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select pg_catalog.set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000003","email":"second@example.com","role":"authenticated"}',
    true
);
set local role authenticated;
select is(
    (select pg_catalog.count(*) from public.teams),
    0::bigint,
    'selector cannot read another user team'
);
select is(
    (select pg_catalog.count(*) from public.team_participants),
    0::bigint,
    'selector cannot read another user roster'
);
select lives_ok(
    $$select public.select_project(
        '10000000-0000-0000-0000-000000000001',
        '[{"first_name":"Grace","last_name":"Hopper","is_selector":true},
          {"first_name":"Katherine","last_name":"Johnson","is_selector":false},
          {"first_name":"Dorothy","last_name":"Vaughan","is_selector":false}]'::jsonb
    )$$,
    'a three-participant team can be selected'
);
set constraints team_participants_cardinality_check immediate;
set constraints team_participants_cardinality_check deferred;
select is(
    (select pg_catalog.count(*) from public.team_participants),
    3::bigint,
    'selector can read all three participants'
);
select lives_ok(
    $$update public.team_participants
      set first_name = 'Unauthorized'
      where team_id = '20000000-0000-0000-0000-000000000001'$$,
    'non-selector update is filtered by row-level security'
);
select is(
    (select pg_catalog.count(*) from public.team_participants where first_name = 'Unauthorized'),
    0::bigint,
    'non-selector cannot change another roster'
);
reset role;

select pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_catalog.set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"ngarciam@unrn.edu.ar","role":"authenticated"}',
    true
);
set local role authenticated;
select is(
    (select assigned_teams from public.admin_list_projects() where id = '10000000-0000-0000-0000-000000000001'),
    2,
    'three participants consume one project slot, not three'
);
reset role;

-- pgTAP runs in one transaction; true competing-session races require an external parallel DB test.
select * from finish();
rollback;