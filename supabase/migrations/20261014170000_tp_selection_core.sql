create table public.projects (
    id uuid primary key default pg_catalog.gen_random_uuid(),
    title text not null,
    description text not null,
    capacity integer not null check (capacity > 0),
    assigned_teams integer not null default 0,
    archived_at timestamptz,
    constraint projects_assigned_teams_nonnegative check (assigned_teams >= 0),
    constraint projects_assigned_teams_within_capacity check (assigned_teams <= capacity)
);

create table public.teams (
    id uuid primary key default pg_catalog.gen_random_uuid(),
    project_id uuid not null references public.projects (id) on delete restrict,
    selector_id uuid not null references auth.users (id) on delete restrict,
    selected_at timestamptz not null default pg_catalog.statement_timestamp(),
    constraint teams_one_selection_per_selector unique (selector_id)
);

create table public.team_participants (
    id uuid primary key default pg_catalog.gen_random_uuid(),
    team_id uuid not null references public.teams (id) on delete restrict,
    first_name text not null,
    last_name text not null,
    is_selector boolean not null,
    constraint team_participants_first_name_trimmed check (
        first_name = pg_catalog.btrim(first_name) and first_name <> ''
    ),
    constraint team_participants_last_name_trimmed check (
        last_name = pg_catalog.btrim(last_name) and last_name <> ''
    )
);

create function public.enforce_team_participant_cardinality()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_participant_count bigint;
    v_selector_count bigint;
begin
    select
        pg_catalog.count(*),
        pg_catalog.count(*) filter (where participant.is_selector)
    into v_participant_count, v_selector_count
    from public.team_participants as participant
    where participant.team_id = new.team_id;

    if v_participant_count < 1 or v_participant_count > 3 or v_selector_count <> 1 then
        raise exception 'A team must have one to three participants and exactly one selector';
    end if;

    return null;
end;
$$;

create constraint trigger team_participants_cardinality_check
after insert on public.team_participants
deferrable initially deferred
for each row
execute function public.enforce_team_participant_cardinality();

create function public.admin_create_project(
    p_title text,
    p_description text,
    p_capacity integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_project_id uuid;
begin
    if (select auth.jwt() ->> 'email') is distinct from 'ngarciam@unrn.edu.ar' then
        raise exception 'Only the configured administrator may manage projects' using errcode = '42501';
    end if;

    insert into public.projects (title, description, capacity)
    values (p_title, p_description, p_capacity)
    returning id into v_project_id;

    return v_project_id;
end;
$$;

create function public.admin_update_project(
    p_project_id uuid,
    p_title text,
    p_description text,
    p_capacity integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_assigned_teams integer;
begin
    if (select auth.jwt() ->> 'email') is distinct from 'ngarciam@unrn.edu.ar' then
        raise exception 'Only the configured administrator may manage projects' using errcode = '42501';
    end if;

    select project.assigned_teams
    into v_assigned_teams
    from public.projects as project
    where project.id = p_project_id
    for update;

    if not found then
        raise exception 'Project not found' using errcode = 'P0002';
    end if;

    if p_capacity <= 0 or p_capacity < v_assigned_teams then
        raise exception 'Capacity must be positive and cannot be below assigned teams' using errcode = '23514';
    end if;

    update public.projects as project
    set title = p_title,
        description = p_description,
        capacity = p_capacity
    where project.id = p_project_id;
end;
$$;

create function public.admin_archive_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_archived_at timestamptz;
begin
    if (select auth.jwt() ->> 'email') is distinct from 'ngarciam@unrn.edu.ar' then
        raise exception 'Only the configured administrator may manage projects' using errcode = '42501';
    end if;

    select project.archived_at
    into v_archived_at
    from public.projects as project
    where project.id = p_project_id
    for update;

    if not found then
        raise exception 'Project not found' using errcode = 'P0002';
    end if;

    if v_archived_at is null then
        update public.projects as project
        set archived_at = pg_catalog.statement_timestamp()
        where project.id = p_project_id;
    end if;
end;
$$;

create function public.admin_list_projects()
returns table (
    id uuid,
    title text,
    description text,
    capacity integer,
    assigned_teams integer,
    archived_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
    if (select auth.jwt() ->> 'email') is distinct from 'ngarciam@unrn.edu.ar' then
        raise exception 'Only the configured administrator may view capacity counts' using errcode = '42501';
    end if;

    return query
    select
        project.id,
        project.title,
        project.description,
        project.capacity,
        project.assigned_teams,
        project.archived_at
    from public.projects as project
    order by project.title, project.id;
end;
$$;

create function public.select_project(p_project_id uuid, p_participants jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_selector_id uuid := (select auth.uid());
    v_project public.projects%rowtype;
    v_team_id uuid;
    v_participant jsonb;
    v_participant_count integer;
    v_selector_count integer := 0;
begin
    if v_selector_id is null then
        raise exception 'An authenticated selector is required' using errcode = '42501';
    end if;

    if pg_catalog.jsonb_typeof(p_participants) is distinct from 'array' then
        raise exception 'Participants must be a JSON array' using errcode = '22023';
    end if;

    v_participant_count := pg_catalog.jsonb_array_length(p_participants);
    if v_participant_count < 1 or v_participant_count > 3 then
        raise exception 'A team must have one to three participants' using errcode = '22023';
    end if;

    for v_participant in
        select element.value
        from pg_catalog.jsonb_array_elements(p_participants) as element(value)
    loop
        if pg_catalog.jsonb_typeof(v_participant) is distinct from 'object'
            or pg_catalog.jsonb_typeof(v_participant -> 'first_name') is distinct from 'string'
            or pg_catalog.jsonb_typeof(v_participant -> 'last_name') is distinct from 'string'
            or pg_catalog.jsonb_typeof(v_participant -> 'is_selector') is distinct from 'boolean'
        then
            raise exception 'Each participant requires first_name, last_name, and is_selector fields' using errcode = '22023';
        end if;

        if pg_catalog.btrim(v_participant ->> 'first_name') = ''
            or pg_catalog.btrim(v_participant ->> 'last_name') = ''
        then
            raise exception 'Participant names must not be empty' using errcode = '22023';
        end if;

        if (v_participant ->> 'is_selector')::boolean then
            v_selector_count := v_selector_count + 1;
        end if;
    end loop;

    if v_selector_count <> 1 then
        raise exception 'Exactly one participant must be the selector' using errcode = '22023';
    end if;

    select project.*
    into v_project
    from public.projects as project
    where project.id = p_project_id
    for update;

    if not found then
        raise exception 'Project not found' using errcode = 'P0002';
    end if;

    if v_project.archived_at is not null then
        raise exception 'Archived projects cannot receive selections' using errcode = '23514';
    end if;

    if v_project.assigned_teams >= v_project.capacity then
        raise exception 'Project has no available team slots' using errcode = '23514';
    end if;

    insert into public.teams (project_id, selector_id)
    values (p_project_id, v_selector_id)
    returning id into v_team_id;

    insert into public.team_participants (team_id, first_name, last_name, is_selector)
    select
        v_team_id,
        pg_catalog.btrim(element.value ->> 'first_name'),
        pg_catalog.btrim(element.value ->> 'last_name'),
        (element.value ->> 'is_selector')::boolean
    from pg_catalog.jsonb_array_elements(p_participants) as element(value);

    update public.projects as project
    set assigned_teams = project.assigned_teams + 1
    where project.id = p_project_id;

    return v_team_id;
end;
$$;

alter table public.projects enable row level security;
alter table public.teams enable row level security;
alter table public.team_participants enable row level security;

create policy projects_read_active_or_admin
on public.projects
for select
to authenticated
using (
    archived_at is null
    or (select auth.jwt() ->> 'email') = 'ngarciam@unrn.edu.ar'
);

create policy teams_read_by_selector
on public.teams
for select
to authenticated
using (selector_id = (select auth.uid()));

create policy participants_read_by_selector
on public.team_participants
for select
to authenticated
using (
    exists (
        select 1
        from public.teams as team
        where team.id = team_id
            and team.selector_id = (select auth.uid())
    )
);

create policy participants_update_names_by_selector
on public.team_participants
for update
to authenticated
using (
    exists (
        select 1
        from public.teams as team
        where team.id = team_id
            and team.selector_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.teams as team
        where team.id = team_id
            and team.selector_id = (select auth.uid())
    )
);

revoke all on table public.projects, public.teams, public.team_participants from public, anon, authenticated;
grant select (id, title, description, capacity, archived_at) on public.projects to authenticated;
grant select on public.teams, public.team_participants to authenticated;
grant update (first_name, last_name) on public.team_participants to authenticated;

revoke all on function public.enforce_team_participant_cardinality() from public, anon, authenticated;
revoke all on function public.admin_create_project(text, text, integer) from public, anon, authenticated;
revoke all on function public.admin_update_project(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.admin_archive_project(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_projects() from public, anon, authenticated;
revoke all on function public.select_project(uuid, jsonb) from public, anon, authenticated;

grant execute on function public.admin_create_project(text, text, integer) to authenticated;
grant execute on function public.admin_update_project(uuid, text, text, integer) to authenticated;
grant execute on function public.admin_archive_project(uuid) to authenticated;
grant execute on function public.admin_list_projects() to authenticated;
grant execute on function public.select_project(uuid, jsonb) to authenticated;