import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import {
  createInvestment,
  createInvestmentMovement,
  createInvestmentPlannedEvent,
} from '../../domain/factories'

function investmentsCol(uid) {
  return collection(db, 'users', uid, 'investments')
}

function investmentDoc(uid, investmentId) {
  return doc(db, 'users', uid, 'investments', investmentId)
}

function investmentPlannedEventsCol(uid, investmentId) {
  return collection(db, 'users', uid, 'investments', investmentId, 'planned_events')
}

function investmentPlannedEventDoc(uid, investmentId, eventId) {
  return doc(db, 'users', uid, 'investments', investmentId, 'planned_events', eventId)
}

function investmentMovementsCol(uid, investmentId) {
  return collection(db, 'users', uid, 'investments', investmentId, 'movements')
}

function investmentMovementDoc(uid, investmentId, movementId) {
  return doc(db, 'users', uid, 'investments', investmentId, 'movements', movementId)
}

export function subscribeInvestments(uid, callback) {
  if (!uid) throw new Error('uid requerido')

  const q = query(investmentsCol(uid), orderBy('createdAt', 'asc'))

  return onSnapshot(q, async (snapshot) => {
    const items = await Promise.all(
      snapshot.docs.map(async (snap) => {
        const investment = { id: snap.id, ...snap.data() }

        const [plannedSnap, movementsSnap] = await Promise.all([
          getDocs(query(investmentPlannedEventsCol(uid, investment.id), orderBy('mesOffset', 'asc'))),
          getDocs(query(investmentMovementsCol(uid, investment.id), orderBy('fecha', 'asc'))),
        ])

        const plannedEvents = plannedSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))

        const movements = movementsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))

        return {
          ...investment,
          plan: {
            ...(investment.plan || {}),
            eventosPlanificados: plannedEvents,
          },
          ejecucion: {
            ...(investment.ejecucion || {}),
            movimientos: movements,
          },
        }
      })
    )

    callback(items)
  })
}

export async function createInvestmentDoc(uid, payload = {}) {
  if (!uid) throw new Error('uid requerido')

  const investment = createInvestment(payload)

  await setDoc(investmentDoc(uid, investment.id), {
    ...investment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return investment
}

export async function updateInvestmentDoc(uid, investmentId, patch = {}) {
  if (!uid || !investmentId) throw new Error('uid e investmentId requeridos')

  await setDoc(
    investmentDoc(uid, investmentId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteInvestmentDoc(uid, investmentId) {
  if (!uid || !investmentId) throw new Error('uid e investmentId requeridos')

  const [plannedSnap, movementsSnap] = await Promise.all([
    getDocs(investmentPlannedEventsCol(uid, investmentId)),
    getDocs(investmentMovementsCol(uid, investmentId)),
  ])

  await Promise.all([
    ...plannedSnap.docs.map((d) => deleteDoc(investmentPlannedEventDoc(uid, investmentId, d.id))),
    ...movementsSnap.docs.map((d) => deleteDoc(investmentMovementDoc(uid, investmentId, d.id))),
  ])

  await deleteDoc(investmentDoc(uid, investmentId))
}

export async function createInvestmentPlannedEventDoc(uid, investmentId, payload = {}) {
  if (!uid || !investmentId) throw new Error('uid e investmentId requeridos')

  const event = createInvestmentPlannedEvent(payload)
  const next = {
    ...event,
    ...payload,
  }

  await setDoc(investmentPlannedEventDoc(uid, investmentId, next.id), {
    ...next,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(
    investmentDoc(uid, investmentId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return next
}

export async function updateInvestmentPlannedEventDoc(uid, investmentId, eventId, patch = {}) {
  if (!uid || !investmentId || !eventId) {
    throw new Error('uid, investmentId y eventId requeridos')
  }

  await setDoc(
    investmentPlannedEventDoc(uid, investmentId, eventId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  await setDoc(
    investmentDoc(uid, investmentId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteInvestmentPlannedEventDoc(uid, investmentId, eventId) {
  if (!uid || !investmentId || !eventId) {
    throw new Error('uid, investmentId y eventId requeridos')
  }

  await deleteDoc(investmentPlannedEventDoc(uid, investmentId, eventId))

  await setDoc(
    investmentDoc(uid, investmentId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function createInvestmentMovementDoc(uid, investmentId, payload = {}) {
  if (!uid || !investmentId) throw new Error('uid e investmentId requeridos')

  const movement = createInvestmentMovement(payload)
  const next = {
    ...movement,
    ...payload,
  }

  await setDoc(investmentMovementDoc(uid, investmentId, next.id), {
    ...next,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(
    investmentDoc(uid, investmentId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return next
}

export async function updateInvestmentMovementDoc(uid, investmentId, movementId, patch = {}) {
  if (!uid || !investmentId || !movementId) {
    throw new Error('uid, investmentId y movementId requeridos')
  }

  await setDoc(
    investmentMovementDoc(uid, investmentId, movementId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  await setDoc(
    investmentDoc(uid, investmentId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteInvestmentMovementDoc(uid, investmentId, movementId) {
  if (!uid || !investmentId || !movementId) {
    throw new Error('uid, investmentId y movementId requeridos')
  }

  await deleteDoc(investmentMovementDoc(uid, investmentId, movementId))

  await setDoc(
    investmentDoc(uid, investmentId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}