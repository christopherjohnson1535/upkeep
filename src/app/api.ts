import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import type { Group, GroupInput, Task, TaskInput } from '../shared/types'

export class SignedOut extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    const message = body?.error ?? `Request failed (${res.status})`
    throw res.status === 401 ? new SignedOut(message) : new Error(message)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })

export interface Me {
  signedIn: boolean
  hasRecoveryCode?: boolean
  passkeys?: { id: string; createdAt: string; lastUsedAt: string | null }[]
}

// The browser shows its own passkey prompt; cancelling it is not an error worth showing.
function passkeyError(err: unknown): never {
  if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
    throw new Error('')
  }
  throw err
}

export const api = {
  config: () => request<{ turnstileSiteKey: string | null }>('/config'),
  me: () => request<Me>('/auth/me'),

  async signUp(turnstile: string | null) {
    const { options, handle } = await post<{ options: any; handle: string }>('/auth/register/options', { turnstile })
    const response = await startRegistration({ optionsJSON: options }).catch(passkeyError)
    return post<{ recoveryCode: string }>('/auth/register/verify', { response, handle })
  },

  async signIn() {
    const { options } = await post<{ options: any }>('/auth/login/options')
    const response = await startAuthentication({ optionsJSON: options }).catch(passkeyError)
    await post('/auth/login/verify', { response })
  },

  async addPasskey() {
    const { options } = await post<{ options: any }>('/auth/passkeys/options')
    const response = await startRegistration({ optionsJSON: options }).catch(passkeyError)
    await post('/auth/passkeys/verify', { response })
  },

  removePasskey: (id: string) => request<void>(`/auth/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  recover: (code: string) => post('/auth/recover', { code }),
  newRecoveryCode: () => post<{ recoveryCode: string }>('/auth/recovery-code'),
  signOut: () => post('/auth/logout'),
  deleteAccount: () => request<void>('/account', { method: 'DELETE' }),

  groups: () => request<Group[]>('/groups'),
  createGroup: (input: GroupInput & { copyFrom: number | null }) => post<Group>('/groups', input),
  updateGroup: (id: number, input: GroupInput) =>
    request<Group>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  archive: (id: number) => post<Group>(`/groups/${id}/archive`),
  restore: (id: number) => post<Group>(`/groups/${id}/restore`),
  newLink: (id: number) => post<Group>(`/groups/${id}/new-link`),
  deleteGroup: (id: number) => request<void>(`/groups/${id}`, { method: 'DELETE' }),
  claim: (link: string) => post<Group>('/groups/claim', { link }),
  importFile: (data: unknown) => post<Group[]>('/import', data),

  createTask: (groupId: number, input: TaskInput) => post<Task>(`/groups/${groupId}/tasks`, input),
  updateTask: (id: number, input: TaskInput) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteTask: (id: number) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
}
