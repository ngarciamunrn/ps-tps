create function public.release_selection()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_selector_id uuid := (select auth.uid());
    v_team_id uuid;
    v_project_id uuid;
begin
    if v_selector_id is null then
        raise exception 'An authenticated selector is required' using errcode = '42501';
    end if;

    select team.id, team.project_id
    into v_team_id, v_project_id
    from public.teams as team
    where team.selector_id = v_selector_id
    for update;

    if not found then
        raise exception 'No active selection to release' using errcode = 'P0002';
    end if;

    delete from public.team_participants as participant
    where participant.team_id = v_team_id;

    delete from public.teams as team
    where team.id = v_team_id;

    update public.projects as project
    set assigned_teams = project.assigned_teams - 1
    where project.id = v_project_id;
end;
$$;

revoke all on function public.release_selection() from public, anon, authenticated;
grant execute on function public.release_selection() to authenticated;
