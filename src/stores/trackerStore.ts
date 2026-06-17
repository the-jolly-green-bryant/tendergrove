import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { ChildCheckIn, Incident, ParentCareLog } from '../lib/domain'
import { LocalCollection } from '../lib/storage'
import { childCheckInSchema, incidentSchema, parentCareSchema } from '../lib/schemas'

const checkIns = new LocalCollection<ChildCheckIn>('checkIns', childCheckInSchema)
const incidents = new LocalCollection<Incident>('incidents', incidentSchema)
const parentCare = new LocalCollection<ParentCareLog>('parentCare', parentCareSchema)

type NewCheckIn = Omit<ChildCheckIn, 'id' | 'createdAt'>
type NewIncident = Omit<Incident, 'id' | 'createdAt'>
type NewParentCare = Omit<ParentCareLog, 'id' | 'createdAt'>

interface TrackerState {
  checkIns: ChildCheckIn[]
  incidents: Incident[]
  parentCare: ParentCareLog[]
  hydrate: () => Promise<void>
  addCheckIn: (data: NewCheckIn) => Promise<void>
  addIncident: (data: NewIncident) => Promise<void>
  addParentCare: (data: NewParentCare) => Promise<void>
}

const stamp = <T extends object>(data: T): T & { id: string; createdAt: string } => ({
  ...data,
  id: uuid(),
  createdAt: new Date().toISOString(),
})

export const useTrackerStore = create<TrackerState>((set, get) => ({
  checkIns: [],
  incidents: [],
  parentCare: [],
  hydrate: async () => {
    const [loadedCheckIns, loadedIncidents, loadedParentCare] = await Promise.all([
      checkIns.all(),
      incidents.all(),
      parentCare.all(),
    ])
    set({
      checkIns: loadedCheckIns,
      incidents: loadedIncidents,
      parentCare: loadedParentCare,
    })
  },
  addCheckIn: async (data) => {
    const item = stamp(data)
    const next = [item, ...get().checkIns]
    await checkIns.save(next)
    set({ checkIns: next })
  },
  addIncident: async (data) => {
    const item = stamp(data)
    const next = [item, ...get().incidents]
    await incidents.save(next)
    set({ incidents: next })
  },
  addParentCare: async (data) => {
    const item = stamp(data)
    const next = [item, ...get().parentCare]
    await parentCare.save(next)
    set({ parentCare: next })
  },
}))
