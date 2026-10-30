export type Unit = 'day' | 'week' | 'month' | 'year'
export type Kind = 'home' | 'car' | 'other'

export interface Task {
  id: number
  groupId: number
  name: string
  every: number
  unit: Unit
  startsOn: string
  remindDays: number
  miles: number | null
  notes: string | null
  updatedAt: string
}

export interface Group {
  id: number
  name: string
  kind: Kind
  token: string
  archived: boolean
  tasks: Task[]
}

export interface TaskInput {
  name: string
  every: number
  unit: Unit
  startsOn: string
  remindDays: number
  miles: number | null
  notes: string | null
}

export interface GroupInput {
  name: string
  kind: Kind
}
