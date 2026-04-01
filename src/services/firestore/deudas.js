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
import { createDebt, createDebtMovement, createDebtPlannedEvent } from '../../domain/factories'

function debtsCol(uid) {
  return collection(db, 'users', uid, 'debts')
}

function debtDoc(uid, debtId) {
  return doc(db, 'users', uid, 'debts', debtId)
}

function debtPlannedEventsCol(uid, debtId) {
  return collection(db, 'users', uid, 'debts', debtId, 'planned_events')
}

function debtPlannedEventDoc(uid, debtId, eventId) {
  return doc(db, 'users', uid, 'debts', debtId, 'planned_events', eventId)
}

function debtMovementsCol(uid, debtId) {
  return collection(db, 'users', uid, 'debts', debtId, 'movements')
}

function debtMovementDoc(uid, debtId, movementId) {
  return doc(db, 'users', uid, 'debts', debtId, 'movements', movementId)
}

export function subscribeDebts(uid, callback) {
  if (!uid) throw new Error('uid requerido')

  const q = query(debtsCol(uid), orderBy('createdAt', 'asc'))

  return onSnapshot(q, async (snapshot) => {
    const debts = await Promise.all(
      snapshot.docs.map(async (snap) => {
        const debt = { id: snap.id, ...snap.data() }

        const [plannedSnap, movementsSnap] = await Promise.all([
          getDocs(query(debtPlannedEventsCol(uid, debt.id), orderBy('mesOffset', 'asc'))),
          getDocs(query(debtMovementsCol(uid, debt.id), orderBy('periodo', 'asc'))),
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
          ...debt,
          plan: {
            ...(debt.plan || {}),
            eventosPlanificados: plannedEvents,
          },
          ejecucion: {
            ...(debt.ejecucion || {}),
            movimientos: movements,
          },
        }
      })
    )

    callback(debts)
  })
}

export async function createDebtDoc(uid, payload = {}) {
  if (!uid) throw new Error('uid requerido')

  const debt = createDebt(payload)

  await setDoc(debtDoc(uid, debt.id), {
    ...debt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return debt
}

export async function updateDebtDoc(uid, debtId, patch = {}) {
  if (!uid || !debtId) throw new Error('uid y debtId requeridos')

  await setDoc(
    debtDoc(uid, debtId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteDebtDoc(uid, debtId) {
  if (!uid || !debtId) throw new Error('uid y debtId requeridos')

  const [plannedSnap, movementsSnap] = await Promise.all([
    getDocs(debtPlannedEventsCol(uid, debtId)),
    getDocs(debtMovementsCol(uid, debtId)),
  ])

  await Promise.all([
    ...plannedSnap.docs.map((d) => deleteDoc(debtPlannedEventDoc(uid, debtId, d.id))),
    ...movementsSnap.docs.map((d) => deleteDoc(debtMovementDoc(uid, debtId, d.id))),
  ])

  await deleteDoc(debtDoc(uid, debtId))
}

export async function createDebtPlannedEventDoc(uid, debtId, payload = {}) {
  if (!uid || !debtId) throw new Error('uid y debtId requeridos')

  const event = createDebtPlannedEvent(payload)
  const next = {
    ...event,
    ...payload,
  }

  await setDoc(debtPlannedEventDoc(uid, debtId, next.id), {
    ...next,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(
    debtDoc(uid, debtId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return next
}

export async function updateDebtPlannedEventDoc(uid, debtId, eventId, patch = {}) {
  if (!uid || !debtId || !eventId) throw new Error('uid, debtId y eventId requeridos')

  await setDoc(
    debtPlannedEventDoc(uid, debtId, eventId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  await setDoc(
    debtDoc(uid, debtId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteDebtPlannedEventDoc(uid, debtId, eventId) {
  if (!uid || !debtId || !eventId) throw new Error('uid, debtId y eventId requeridos')

  await deleteDoc(debtPlannedEventDoc(uid, debtId, eventId))

  await setDoc(
    debtDoc(uid, debtId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function createDebtMovementDoc(uid, debtId, payload = {}) {
  if (!uid || !debtId) throw new Error('uid y debtId requeridos')

  const movement = createDebtMovement(payload)
  const next = {
    ...movement,
    ...payload,
  }

  await setDoc(debtMovementDoc(uid, debtId, next.id), {
    ...next,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(
    debtDoc(uid, debtId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return next
}

export async function updateDebtMovementDoc(uid, debtId, movementId, patch = {}) {
  if (!uid || !debtId || !movementId) throw new Error('uid, debtId y movementId requeridos')

  await setDoc(
    debtMovementDoc(uid, debtId, movementId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  await setDoc(
    debtDoc(uid, debtId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteDebtMovementDoc(uid, debtId, movementId) {
  if (!uid || !debtId || !movementId) throw new Error('uid, debtId y movementId requeridos')

  await deleteDoc(debtMovementDoc(uid, debtId, movementId))

  await setDoc(
    debtDoc(uid, debtId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}