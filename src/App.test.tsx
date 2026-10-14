import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const mockedAppState = vi.hoisted(() => ({
    isSupabaseConfigured: true,
}))

const projectQuery = vi.hoisted(() => ({
    select: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
}))

const teamQuery = vi.hoisted(() => ({
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
}))

const { mockSupabase, mockAuth } = vi.hoisted(() => {
    const mockAuth = {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
            data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
    }

    const mockSupabase = {
        auth: mockAuth,
        from: vi.fn((...args: string[]) => {
            void args
            return projectQuery
        }),
        rpc: vi.fn((): Promise<{ data: unknown; error: null | { message: string; code?: string } }> =>
            Promise.resolve({ data: [], error: null }),
        ),
    }

    projectQuery.select.mockReturnValue(projectQuery)
    projectQuery.is.mockReturnValue(projectQuery)
    projectQuery.order.mockResolvedValue({ data: [], error: null })
    teamQuery.select.mockReturnValue(teamQuery)
    teamQuery.eq.mockReturnValue(teamQuery)
    teamQuery.maybeSingle.mockResolvedValue({ data: null, error: null })

    return {
        mockAuth,
        mockSupabase,
    }
})

vi.mock('./lib/supabase', () => ({
    get isSupabaseConfigured() {
        return mockedAppState.isSupabaseConfigured
    },
    supabase: mockSupabase,
}))

describe('App', () => {
    beforeEach(() => {
        mockedAppState.isSupabaseConfigured = true
        mockAuth.getSession.mockReset()
        mockAuth.onAuthStateChange.mockReset()
        mockAuth.signInWithOAuth.mockReset()
        mockAuth.signOut.mockReset()
        mockSupabase.from.mockClear()
        mockSupabase.rpc.mockClear()
        projectQuery.select.mockClear()
        projectQuery.is.mockClear()
        projectQuery.order.mockClear()
        teamQuery.select.mockClear()
        teamQuery.eq.mockClear()
        teamQuery.maybeSingle.mockClear()

        projectQuery.select.mockReturnValue(projectQuery)
        projectQuery.is.mockReturnValue(projectQuery)
        projectQuery.order.mockResolvedValue({ data: [], error: null })
        teamQuery.select.mockReturnValue(teamQuery)
        teamQuery.eq.mockReturnValue(teamQuery)
        teamQuery.maybeSingle.mockResolvedValue({ data: null, error: null })
        mockSupabase.rpc.mockResolvedValue({ data: [], error: null })
        mockSupabase.from.mockImplementation((table?: string) => {
            if (table === 'teams') {
                return teamQuery as never
            }

            return projectQuery as never
        })

        mockAuth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
        })
    })

    it('renders the Spanish empty state when Supabase is unconfigured', () => {
        mockedAppState.isSupabaseConfigured = false

        render(<App />)

        expect(screen.getByRole('heading', { name: 'Aún no hay propuestas para mostrar' })).toBeInTheDocument()
        expect(screen.getByText('Cuando se publiquen trabajos prácticos, vas a encontrarlos acá.')).toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveTextContent(
            'El catálogo todavía no está conectado. La configuración pública de Supabase está pendiente.',
        )
    })

    it('shows Google sign-in when Supabase is configured and no session exists', async () => {
        mockAuth.getSession.mockResolvedValue({ data: { session: null } })

        render(<App />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Iniciar sesión con Google' })).toBeInTheDocument()
        })
    })

    it('marks the admin user from the authenticated email', async () => {
        mockAuth.getSession.mockResolvedValue({
            data: { session: { user: { email: 'ngarciam@unrn.edu.ar' } } },
        })

        render(<App />)

        await waitFor(() => {
            expect(screen.getByText('Admin')).toBeInTheDocument()
            expect(screen.getByText('ngarciam@unrn.edu.ar')).toBeInTheDocument()
        })
    })

    it('shows the release action when a user has an active selection', async () => {
        mockAuth.getSession.mockResolvedValue({
            data: {
                session: {
                    user: {
                        id: 'user-123',
                        email: 'student@example.com',
                    },
                },
            },
        })

        teamQuery.maybeSingle.mockResolvedValue({
            data: {
                id: 'team-1',
                project_id: 'project-1',
                selected_at: '2026-10-14T00:00:00Z',
                team_participants: [
                    {
                        id: 'participant-1',
                        first_name: 'Ana',
                        last_name: 'García',
                        is_selector: true,
                    },
                ],
            },
            error: null,
        })

        mockSupabase.rpc.mockResolvedValue({ data: null, error: null })

        render(<App />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Liberar selección' })).toBeInTheDocument()
        })

        const { fireEvent } = await import('@testing-library/react')
        projectQuery.order.mockClear()
        fireEvent.click(screen.getByRole('button', { name: 'Liberar selección' }))

        await waitFor(() => {
            expect(mockSupabase.rpc).toHaveBeenCalledWith('release_selection')
            expect(projectQuery.order).toHaveBeenCalled()
            expect(screen.getByText('Selección liberada correctamente. Ya podés elegir otro proyecto.')).toBeInTheDocument()
        })
    })

    it('displays the success message in green with inline-success styling when selection is created', async () => {
        mockAuth.getSession.mockResolvedValue({
            data: {
                session: {
                    user: {
                        id: 'user-123',
                        email: 'student@example.com',
                    },
                },
            },
        })

        projectQuery.order.mockResolvedValue({
            data: [
                {
                    id: 'project-1',
                    title: 'TP Distribuidos',
                    description: 'Sistema distribuido',
                    capacity: 5,
                    assigned_teams: 0,
                    archived_at: null,
                },
            ],
            error: null,
        })

        mockSupabase.rpc.mockResolvedValue({ data: 'selection-123', error: null })

        render(<App />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Seleccionar' })).toBeInTheDocument()
        })

        screen.getByRole('button', { name: 'Seleccionar' }).click()

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Registrar equipo' })).toBeInTheDocument()
        })

        const firstNameInputs = screen.getAllByPlaceholderText('Nombre')
        const lastNameInputs = screen.getAllByPlaceholderText('Apellido')

        const { fireEvent } = await import('@testing-library/react')
        fireEvent.change(firstNameInputs[0], { target: { value: 'Martín' } })
        fireEvent.change(lastNameInputs[0], { target: { value: 'Pérez' } })

        fireEvent.click(screen.getByRole('button', { name: 'Confirmar selección' }))

        await waitFor(() => {
            const notice = screen.getByText('Selección creada correctamente.')
            expect(notice).toHaveClass('inline-success')
            expect(notice).toHaveAttribute('role', 'status')
        })
    })

    it('opens registration modal with banner and allows canceling', async () => {
        mockAuth.getSession.mockResolvedValue({
            data: {
                session: {
                    user: {
                        id: 'user-123',
                        email: 'student@example.com',
                    },
                },
            },
        })

        projectQuery.order.mockResolvedValue({
            data: [
                {
                    id: 'project-1',
                    title: 'TP Distribuidos',
                    description: 'Sistema distribuido',
                    capacity: 5,
                    assigned_teams: 0,
                    archived_at: null,
                },
            ],
            error: null,
        })

        render(<App />)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Seleccionar' })).toBeInTheDocument()
        })

        const { fireEvent } = await import('@testing-library/react')
        fireEvent.click(screen.getByRole('button', { name: 'Seleccionar' }))

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Tu lugar se encuentra reservado mientras cargás los integrantes. El cupo se confirmará formalmente al enviar el equipo.',
                ),
            ).toBeInTheDocument()
        })

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
    })
})