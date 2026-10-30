import type { Group, GroupInput, Task, TaskInput } from '../shared/types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

export const api = {
  groups: () => request<Group[]>('/groups'),
  createGroup: (input: GroupInput & { copyFrom: number | null }) => post<Group>('/groups', input),
  updateGroup: (id: number, input: GroupInput) =>
    request<Group>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  archive: (id: number) => post<Group>(`/groups/${id}/archive`),
  restore: (id: number) => post<Group>(`/groups/${id}/restore`),
  newLink: (id: number) => post<Group>(`/groups/${id}/new-link`),
  deleteGroup: (id: number) => request<void>(`/groups/${id}`, { method: 'DELETE' }),

  createTask: (groupId: number, input: TaskInput) => post<Task>(`/groups/${groupId}/tasks`, input),
  updateTask: (id: number, input: TaskInput) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteTask: (id: number) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
}
