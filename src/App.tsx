import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const ADMIN_EMAIL = 'ngarciam@unrn.edu.ar'

type Project = {
    id: string
    title: string
    description: string
    capacity: number
    assigned_teams: number
    archived_at: string | null
}

type ProjectFormState = {
    title: string
    description: string
    capacity: string
}

type TeamParticipant = {
    id: string
    first_name: string
    last_name: string
    is_selector: boolean
}

type TeamSelection = {
    id: string
    project_id: string
    selected_at: string
    team_participants: TeamParticipant[]
}

type SelectionMember = {
    first_name: string
    last_name: string
    is_selector: boolean
}

type NoticeState = {
    message: string
    type: 'error' | 'success'
} | null

const emptyProjectForm = (): ProjectFormState => ({
    title: '',
    description: '',
    capacity: '5',
})

const emptySelectionMembers = (): SelectionMember[] => [
    { first_name: '', last_name: '', is_selector: true },
    { first_name: '', last_name: '', is_selector: false },
    { first_name: '', last_name: '', is_selector: false },
]

function App() {
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [authError, setAuthError] = useState<string | null>(null)
    const [authReady, setAuthReady] = useState(() => !isSupabaseConfigured)
    const [projects, setProjects] = useState<Project[]>([])
    const [isLoadingProjects, setIsLoadingProjects] = useState(false)
    const [projectError, setProjectError] = useState<string | null>(null)
    const [projectForm, setProjectForm] = useState<ProjectFormState>(emptyProjectForm)
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
    const [formNotice, setFormNotice] = useState<string | null>(null)
    const [activeSelection, setActiveSelection] = useState<TeamSelection | null>(null)
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [selectionMembers, setSelectionMembers] = useState<SelectionMember[]>(emptySelectionMembers)
    const [rosterDraft, setRosterDraft] = useState<TeamParticipant[]>([])
    const [selectionNotice, setSelectionNotice] = useState<NoticeState>(null)

    useEffect(() => {
        const authClient = supabase

        if (!isSupabaseConfigured || !authClient) {
            return
        }

        let active = true

        const syncSession = async () => {
            try {
                const {
                    data: { session },
                } = await authClient.auth.getSession()

                if (!active) {
                    return
                }

                setUserEmail(session?.user?.email ?? null)
                setUserId(session?.user?.id ?? null)
                setAuthReady(true)
            } catch {
                if (active) {
                    setUserEmail(null)
                    setUserId(null)
                    setAuthReady(true)
                }
            }
        }

        void syncSession()

        const {
            data: { subscription },
        } = authClient.auth.onAuthStateChange((_event, session) => {
            setAuthError(null)
            setUserEmail(session?.user?.email ?? null)
            setUserId(session?.user?.id ?? null)
            setAuthReady(true)
        })

        return () => {
            active = false
            subscription.unsubscribe()
        }
    }, [])

    const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

    useEffect(() => {
        const authClient = supabase

        if (!isSupabaseConfigured || !authClient || !authReady || !userEmail) {
            return
        }

        let active = true

        const loadProjects = async () => {
            try {
                setIsLoadingProjects(true)
                setProjectError(null)

                let response

                if (isAdmin) {
                    response = await authClient.rpc('admin_list_projects')
                } else {
                    response = await authClient
                        .from('projects')
                        .select('*')
                        .is('archived_at', null)
                        .order('title')
                }

                if (!active) {
                    return
                }

                if (response.error) {
                    throw new Error(response.error.message)
                }

                setProjects((response.data ?? []) as Project[])
            } catch (error) {
                if (!active) {
                    return
                }

                setProjects([])
                setProjectError(
                    error instanceof Error
                        ? error.message
                        : 'No se pudo cargar el catálogo en este momento.',
                )
            } finally {
                if (active) {
                    setIsLoadingProjects(false)
                }
            }
        }

        void loadProjects()

        return () => {
            active = false
        }
    }, [authReady, isAdmin, userEmail])

    useEffect(() => {
        const authClient = supabase

        if (!isSupabaseConfigured || !authClient || !authReady || !userEmail || !userId || isAdmin) {
            return
        }

        let active = true

        const loadActiveSelection = async () => {
            try {
                const { data, error } = await authClient
                    .from('teams')
                    .select('id, project_id, selected_at, team_participants(*)')
                    .eq('selector_id', userId)
                    .maybeSingle()

                if (!active) {
                    return
                }

                if (error && error.code !== 'PGRST116') {
                    throw new Error(error.message)
                }

                const team = (data as TeamSelection | null) ?? null
                setActiveSelection(team)
                setRosterDraft(team?.team_participants ?? [])
                setSelectedProjectId(team?.project_id ?? null)
                if (!team) {
                    setSelectionMembers(emptySelectionMembers())
                }
            } catch (error) {
                if (!active) {
                    return
                }

                setActiveSelection(null)
                setRosterDraft([])
                setSelectedProjectId(null)
                setSelectionMembers(emptySelectionMembers())
                setSelectionNotice({
                    message:
                        error instanceof Error
                            ? error.message
                            : 'No se pudo cargar la selección activa.',
                    type: 'error',
                })
            }
        }

        void loadActiveSelection()

        return () => {
            active = false
        }
    }, [authReady, isAdmin, userEmail, userId])

    const handleGoogleSignIn = async () => {
        const authClient = supabase

        if (!authClient) {
            return
        }

        setAuthError(null)

        const { error } = await authClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}${window.location.pathname}`,
            },
        })

        if (error) {
            setAuthError(error.message)
        }
    }

    const handleSignOut = async () => {
        const authClient = supabase

        if (!authClient) {
            return
        }

        setAuthError(null)
        setProjects([])
        setUserEmail(null)
        setUserId(null)
        setActiveSelection(null)
        setSelectedProjectId(null)
        setSelectionMembers(emptySelectionMembers())
        setRosterDraft([])
        setSelectionNotice(null)

        const { error } = await authClient.auth.signOut()

        if (error) {
            setAuthError(error.message)
        }
    }

    const handleProjectFormChange = (
        field: keyof ProjectFormState,
        value: string,
    ) => {
        setProjectForm((current) => ({
            ...current,
            [field]: value,
        }))
    }

    const refreshProjects = async () => {
        const authClient = supabase

        if (!isSupabaseConfigured || !authClient || !authReady || !userEmail) {
            setProjects([])
            return
        }

        try {
            setIsLoadingProjects(true)
            setProjectError(null)

            let response

            if (isAdmin) {
                response = await authClient.rpc('admin_list_projects')
            } else {
                response = await authClient
                    .from('projects')
                    .select('*')
                    .is('archived_at', null)
                    .order('title')
            }

            if (response.error) {
                throw new Error(response.error.message)
            }

            setProjects((response.data ?? []) as Project[])
        } catch (error) {
            setProjectError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo actualizar el catálogo en este momento.',
            )
        } finally {
            setIsLoadingProjects(false)
        }
    }

    const handleProjectSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!supabase || !isAdmin) {
            return
        }

        const title = projectForm.title.trim()
        const description = projectForm.description.trim()
        const capacityValue = Number(projectForm.capacity)

        if (!title || !description || !Number.isInteger(capacityValue) || capacityValue <= 0) {
            setFormNotice('Ingresá un título, una descripción y una capacidad válida.')
            return
        }

        try {
            if (editingProjectId) {
                await supabase.rpc('admin_update_project', {
                    p_project_id: editingProjectId,
                    p_title: title,
                    p_description: description,
                    p_capacity: capacityValue,
                })
                setFormNotice('Proyecto actualizado correctamente.')
            } else {
                await supabase.rpc('admin_create_project', {
                    p_title: title,
                    p_description: description,
                    p_capacity: capacityValue,
                })
                setFormNotice('Proyecto creado correctamente.')
            }

            setProjectForm(emptyProjectForm())
            setEditingProjectId(null)
            await refreshProjects()
        } catch (error) {
            setFormNotice(
                error instanceof Error
                    ? error.message
                    : 'No se pudo guardar el proyecto.',
            )
        }
    }

    const handleEditProject = (project: Project) => {
        setEditingProjectId(project.id)
        setProjectForm({
            title: project.title,
            description: project.description,
            capacity: String(project.capacity),
        })
        setFormNotice(null)
    }

    const handleArchiveProject = async (projectId: string) => {
        if (!supabase || !isAdmin) {
            return
        }

        try {
            await supabase.rpc('admin_archive_project', { p_project_id: projectId })
            setFormNotice('Proyecto archivado.')
            await refreshProjects()
        } catch (error) {
            setFormNotice(
                error instanceof Error
                    ? error.message
                    : 'No se pudo archivar el proyecto.',
            )
        }
    }

    const updateSelectionMember = (
        index: number,
        field: 'first_name' | 'last_name',
        value: string,
    ) => {
        setSelectionMembers((current) =>
            current.map((member, memberIndex) =>
                memberIndex === index
                    ? {
                          ...member,
                          [field]: value,
                      }
                    : member,
            ),
        )
    }

    const updateRosterField = (
        index: number,
        field: 'first_name' | 'last_name',
        value: string,
    ) => {
        setRosterDraft((current) =>
            current.map((participant, participantIndex) =>
                participantIndex === index
                    ? {
                          ...participant,
                          [field]: value,
                      }
                    : participant,
            ),
        )
    }

    const handleSelectionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const authClient = supabase

        if (!authClient || !selectedProjectId || !userId || isAdmin) {
            return
        }

        const payload = selectionMembers
            .filter((member) => member.first_name.trim() || member.last_name.trim())
            .map((member) => ({
                first_name: member.first_name.trim(),
                last_name: member.last_name.trim(),
                is_selector: member.is_selector,
            }))

        if (payload.length < 1 || payload.length > 3) {
            setSelectionNotice({ message: 'La selección debe tener entre 1 y 3 participantes.', type: 'error' })
            return
        }

        if (payload.filter((member) => member.is_selector).length !== 1) {
            setSelectionNotice({ message: 'Debe existir exactamente un participante selector.', type: 'error' })
            return
        }

        if (payload.some((member) => !member.first_name || !member.last_name)) {
            setSelectionNotice({ message: 'Todos los nombres deben completarse para enviar la selección.', type: 'error' })
            return
        }

        try {
            const { error } = await authClient.rpc('select_project', {
                p_project_id: selectedProjectId,
                p_participants: payload,
            })

            if (error) {
                throw new Error(error.message)
            }

            setSelectionNotice({ message: 'Selección creada correctamente.', type: 'success' })
            setSelectedProjectId(null)
            setSelectionMembers(emptySelectionMembers())

            const { data, error: teamError } = await authClient
                .from('teams')
                .select('id, project_id, selected_at, team_participants(*)')
                .eq('selector_id', userId)
                .maybeSingle()

            if (teamError && teamError.code !== 'PGRST116') {
                throw new Error(teamError.message)
            }

            const team = (data as TeamSelection | null) ?? null
            setActiveSelection(team)
            setRosterDraft(team?.team_participants ?? [])
            await refreshProjects()
        } catch (error) {
            setSelectionNotice({
                message:
                    error instanceof Error
                        ? error.message
                        : 'No se pudo registrar la selección.',
                type: 'error',
            })
        }
    }

    const handleReleaseSelection = async () => {
        const authClient = supabase

        if (!authClient || !userId || !activeSelection) {
            return
        }

        try {
            const { error } = await authClient.rpc('release_selection')

            if (error) {
                throw new Error(error.message)
            }

            setActiveSelection(null)
            setSelectedProjectId(null)
            setRosterDraft([])
            setSelectionMembers(emptySelectionMembers())
            setSelectionNotice({ message: 'Selección liberada correctamente. Ya podés elegir otro proyecto.', type: 'success' })
            await refreshProjects()
        } catch (error) {
            setSelectionNotice({
                message:
                    error instanceof Error
                        ? error.message
                        : 'No se pudo liberar la selección.',
                type: 'error',
            })
        }
    }

    const handleRosterSave = async () => {
        const authClient = supabase

        if (!authClient || !activeSelection || !rosterDraft.length) {
            return
        }

        const nextRoster = rosterDraft.map((participant) => ({
            ...participant,
            first_name: participant.first_name.trim(),
            last_name: participant.last_name.trim(),
        }))

        if (nextRoster.some((participant) => !participant.first_name || !participant.last_name)) {
            setSelectionNotice({ message: 'Todos los nombres del equipo deben completarse.', type: 'error' })
            return
        }

        try {
            await Promise.all(
                nextRoster.map((participant) =>
                    authClient
                        .from('team_participants')
                        .update({
                            first_name: participant.first_name,
                            last_name: participant.last_name,
                        })
                        .eq('id', participant.id),
                ),
            )

            setSelectionNotice({ message: 'Nombres del equipo actualizados.', type: 'success' })
            const { data, error } = await authClient
                .from('teams')
                .select('id, project_id, selected_at, team_participants(*)')
                .eq('selector_id', userId)
                .maybeSingle()

            if (!error || error.code === 'PGRST116') {
                const team = (data as TeamSelection | null) ?? null
                setActiveSelection(team)
                setRosterDraft(team?.team_participants ?? [])
            }
        } catch (error) {
            setSelectionNotice({
                message:
                    error instanceof Error
                        ? error.message
                        : 'No se pudieron guardar los cambios del equipo.',
                type: 'error',
            })
        }
    }

    const selectedProject = projects.find((project) => project.id === selectedProjectId)

    const handleCloseModal = () => {
        setSelectedProjectId(null)
        setSelectionMembers(emptySelectionMembers())
        setSelectionNotice(null)
    }

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && selectedProjectId) {
                handleCloseModal()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedProjectId])

    return (
        <main className="page-shell">
            <header className="topbar">
                <a className="brand" href="./" aria-label="Inicio">
                    <span className="brand-mark" aria-hidden="true">TP</span>
                    <span>Selección de trabajos prácticos</span>
                </a>

                {isSupabaseConfigured && (
                    <div className="auth-panel" aria-live="polite">
                        {!authReady ? (
                            <span className="auth-status">Verificando sesión…</span>
                        ) : userEmail ? (
                            <>
                                <span className={`auth-badge ${isAdmin ? 'admin' : 'user'}`}>
                                    {isAdmin ? 'Admin' : 'Usuario'}
                                </span>
                                <span className="auth-email">{userEmail}</span>
                                <button type="button" className="auth-button secondary" onClick={handleSignOut}>
                                    Cerrar sesión
                                </button>
                            </>
                        ) : (
                            <button type="button" className="auth-button" onClick={handleGoogleSignIn}>
                                Iniciar sesión con Google
                            </button>
                        )}
                    </div>
                )}

                {!isSupabaseConfigured && <span className="term-label">Portal académico</span>}
            </header>

            <section className="intro" aria-labelledby="page-title">
                <p className="eyebrow">TRABAJOS PRÁCTICOS</p>
                <h1 id="page-title">Elegí tu próximo desafío.</h1>
                <p className="intro-copy">
                    Explorá las propuestas disponibles para tu cursada en un solo lugar.
                </p>
            </section>

            <section className="content" aria-label="Propuestas disponibles">
                {!isSupabaseConfigured && (
                    <>
                        <p className="config-notice" role="status">
                            El catálogo todavía no está conectado. La configuración pública de Supabase está pendiente.
                        </p>
                        <div className="empty-state">
                            <span className="empty-mark" aria-hidden="true">—</span>
                            <h2>Aún no hay propuestas para mostrar</h2>
                            <p>Cuando se publiquen trabajos prácticos, vas a encontrarlos acá.</p>
                        </div>
                    </>
                )}

                {isSupabaseConfigured && authReady && userEmail && (
                    <div className="session-card" role="status">
                        <strong>Sesión activa.</strong>
                        <span>
                            {isAdmin
                                ? 'Tu cuenta tiene permisos de administración en la plataforma.'
                                : 'Tu cuenta está autenticada como usuario regular.'}
                        </span>
                    </div>
                )}

                {authError && (
                    <p className="inline-error" role="alert">
                        {authError}
                    </p>
                )}

                {isSupabaseConfigured && authReady && userEmail && (
                    <div className="catalog-panel">
                        {isAdmin && (
                            <form className="project-form" onSubmit={handleProjectSubmit}>
                                <div className="section-header">
                                    <h2>{editingProjectId ? 'Editar proyecto' : 'Crear proyecto'}</h2>
                                </div>

                                <label className="field-group">
                                    <span>Título</span>
                                    <input
                                        type="text"
                                        value={projectForm.title}
                                        onChange={(event) => handleProjectFormChange('title', event.target.value)}
                                        placeholder="Ej. Diseño de interfaces"
                                    />
                                </label>

                                <label className="field-group">
                                    <span>Descripción</span>
                                    <textarea
                                        value={projectForm.description}
                                        onChange={(event) => handleProjectFormChange('description', event.target.value)}
                                        placeholder="Describí la propuesta y sus objetivos."
                                        rows={4}
                                    />
                                </label>

                                <label className="field-group small-field">
                                    <span>Capacidad</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={projectForm.capacity}
                                        onChange={(event) => handleProjectFormChange('capacity', event.target.value)}
                                    />
                                </label>

                                <div className="form-actions">
                                    <button type="submit" className="auth-button">
                                        {editingProjectId ? 'Guardar cambios' : 'Crear proyecto'}
                                    </button>
                                    {editingProjectId && (
                                        <button
                                            type="button"
                                            className="auth-button secondary"
                                            onClick={() => {
                                                setEditingProjectId(null)
                                                setProjectForm(emptyProjectForm())
                                                setFormNotice(null)
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}

                        {projectError && (
                            <p className="inline-error" role="alert">
                                {projectError}
                            </p>
                        )}

                        {formNotice && (
                            <p className="session-card" role="status">
                                {formNotice}
                            </p>
                        )}

                        {!isAdmin && (
                            <div className="selection-panel">
                                {activeSelection ? (
                                    <>
                                        <div className="catalog-header">
                                            <h2>Mi selección actual</h2>
                                        </div>
                                        <p className="muted-copy">
                                            Seleccionaste el proyecto el{' '}
                                            {new Date(activeSelection.selected_at).toLocaleString('es-AR')}
                                        </p>
                                        <div className="roster-editor">
                                            {rosterDraft.map((participant, index) => (
                                                <div key={participant.id ?? `${participant.first_name}-${index}`} className="roster-row">
                                                    <label className="field-group">
                                                        <span>{participant.is_selector ? 'Selector' : `Integrante ${index}`}</span>
                                                        <input
                                                            type="text"
                                                            value={participant.first_name}
                                                            onChange={(event) =>
                                                                updateRosterField(index, 'first_name', event.target.value)
                                                            }
                                                        />
                                                    </label>
                                                    <label className="field-group">
                                                        <span>Apellido</span>
                                                        <input
                                                            type="text"
                                                            value={participant.last_name}
                                                            onChange={(event) =>
                                                                updateRosterField(index, 'last_name', event.target.value)
                                                            }
                                                        />
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="form-actions">
                                            <button type="button" className="auth-button" onClick={handleRosterSave}>
                                                Guardar nombres
                                            </button>
                                            <button type="button" className="auth-button secondary" onClick={handleReleaseSelection}>
                                                Liberar selección
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="catalog-header">
                                            <h2>Seleccioná un proyecto</h2>
                                        </div>
                                        <p className="muted-copy">
                                            Elegí una propuesta del catálogo a continuación para registrar a tu equipo.
                                        </p>
                                    </>
                                )}

                                {selectionNotice && (
                                    <p
                                        className={selectionNotice.type === 'success' ? 'inline-success' : 'inline-error'}
                                        role={selectionNotice.type === 'success' ? 'status' : 'alert'}
                                    >
                                        {selectionNotice.message}
                                    </p>
                                )}
                            </div>
                        )}

                        {selectedProjectId && (
                            <div className="modal-backdrop" role="presentation" onClick={handleCloseModal}>
                                <div
                                    className="modal-dialog"
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="modal-title"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <div className="modal-header">
                                        <div>
                                            <h2 id="modal-title">Registrar equipo</h2>
                                            {selectedProject && (
                                                <p className="modal-subtitle">{selectedProject.title}</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="modal-close-button"
                                            aria-label="Cerrar ventana"
                                            onClick={handleCloseModal}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div className="modal-banner" role="status">
                                        <span>
                                            Tu lugar se encuentra reservado mientras cargás los integrantes. El cupo se confirmará formalmente al enviar el equipo.
                                        </span>
                                    </div>

                                    <form className="project-form modal-form" onSubmit={handleSelectionSubmit}>
                                        {selectionMembers.map((member, index) => (
                                            <div key={`member-${index}`} className="roster-row">
                                                <label className="field-group">
                                                    <span>{member.is_selector ? 'Selector' : `Integrante ${index}`}</span>
                                                    <input
                                                        type="text"
                                                        value={member.first_name}
                                                        onChange={(event) =>
                                                            updateSelectionMember(index, 'first_name', event.target.value)
                                                        }
                                                        placeholder="Nombre"
                                                    />
                                                </label>
                                                <label className="field-group">
                                                    <span>Apellido</span>
                                                    <input
                                                        type="text"
                                                        value={member.last_name}
                                                        onChange={(event) =>
                                                            updateSelectionMember(index, 'last_name', event.target.value)
                                                        }
                                                        placeholder="Apellido"
                                                    />
                                                </label>
                                            </div>
                                        ))}

                                        {selectionNotice && selectionNotice.type === 'error' && (
                                            <p className="inline-error" role="alert">
                                                {selectionNotice.message}
                                            </p>
                                        )}

                                        <div className="form-actions">
                                            <button type="submit" className="auth-button">
                                                Confirmar selección
                                            </button>
                                            <button
                                                type="button"
                                                className="auth-button secondary"
                                                onClick={handleCloseModal}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        <div className="catalog-header">
                            <h2>Propuestas</h2>
                            <span>{isAdmin ? `${projects.length} proyectos` : `${projects.length} disponibles`}</span>
                        </div>

                        {isLoadingProjects ? (
                            <p className="muted-copy">Cargando propuestas…</p>
                        ) : projects.length === 0 ? (
                            <div className="empty-state compact">
                                <span className="empty-mark" aria-hidden="true">—</span>
                                <h2>No hay propuestas disponibles por el momento</h2>
                                <p>Cuando el administrador publique proyectos, aparecerán acá.</p>
                            </div>
                        ) : (
                            <div className="project-grid">
                                {projects.map((project) => (
                                    <article
                                        key={project.id}
                                        className={`project-card ${project.archived_at ? 'archived' : ''}`}
                                    >
                                        <div className="project-card-header">
                                            <h3>{project.title}</h3>
                                            <span className={`chip ${project.archived_at ? 'archived' : 'active'}`}>
                                                {project.archived_at ? 'Archivado' : 'Activo'}
                                            </span>
                                        </div>

                                        <p>{project.description}</p>

                                        <dl className="project-meta">
                                            <div>
                                                <dt>Capacidad</dt>
                                                <dd>{project.capacity}</dd>
                                            </div>
                                            <div>
                                                <dt>Equipos</dt>
                                                <dd>{project.assigned_teams}</dd>
                                            </div>
                                        </dl>

                                        {isAdmin ? (
                                            <div className="project-actions">
                                                <button
                                                    type="button"
                                                    className="auth-button secondary"
                                                    onClick={() => handleEditProject(project)}
                                                >
                                                    Editar
                                                </button>
                                                {!project.archived_at && (
                                                    <button
                                                        type="button"
                                                        className="auth-button secondary"
                                                        onClick={() => handleArchiveProject(project.id)}
                                                    >
                                                        Archivar
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="project-actions">
                                                <button
                                                    type="button"
                                                    className="auth-button"
                                                    onClick={() => {
                                                        setSelectedProjectId(project.id)
                                                        setSelectionNotice(null)
                                                    }}
                                                    disabled={Boolean(activeSelection)}
                                                >
                                                    {activeSelection ? 'Seleccionado' : 'Seleccionar'}
                                                </button>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!userEmail && isSupabaseConfigured && authReady && (
                    <div className="empty-state">
                        <span className="empty-mark" aria-hidden="true">—</span>
                        <h2>Iniciá sesión para ver el catálogo</h2>
                        <p>La selección de trabajos prácticos se habilita después del acceso con Google.</p>
                    </div>
                )}
            </section>

            <footer className="footer">
                <span>Información de cursada</span>
                <span>Selección de trabajos prácticos</span>
            </footer>
        </main>
    )
}

export default App
