import type { CompletionInput, ItemInput, ItemWithDue } from '../shared/types'

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

export const api = {
  items: () => request<ItemWithDue[]>('/items'),

  create: (item: ItemInput & { lastDone: CompletionInput }) =>
    request<ItemWithDue>('/items', { method: 'POST', body: JSON.stringify(item) }),

  update: (id: number, item: ItemInput) =>
    request<ItemWithDue>(`/items/${id}`, { method: 'PUT', body: JSON.stringify(item) }),

  remove: (id: number) => request<void>(`/items/${id}`, { method: 'DELETE' }),

  done: (id: number, done: CompletionInput) =>
    request<{ completionId: number; item: ItemWithDue }>(`/items/${id}/done`, {
      method: 'POST',
      body: JSON.stringify(done),
    }),

  undo: (completionId: number) => request<void>(`/completions/${completionId}`, { method: 'DELETE' }),
}
