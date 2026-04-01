import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { createGoal } from '../../domain/factories'

function goalsCol(uid) {
  return collection(db, 'users', uid, 'goals')
}

function goalDoc(uid, goalId) {
  return doc(db, 'users', uid, 'goals', goalId)
}

export function subscribeGoals(uid, callback) {
  if (!uid) throw new Error('uid requerido')

  const q = query(goalsCol(uid), orderBy('createdAt', 'asc'))

  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    )
  })
}

export async function createGoalDoc(uid, payload = {}) {
  if (!uid) throw new Error('uid requerido')

  const item = createGoal(payload)

  await setDoc(goalDoc(uid, item.id), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return item
}

export async function updateGoalDoc(uid, goalId, patch = {}) {
  if (!uid || !goalId) throw new Error('uid y goalId requeridos')

  await setDoc(
    goalDoc(uid, goalId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteGoalDoc(uid, goalId) {
  if (!uid || !goalId) throw new Error('uid y goalId requeridos')
  await deleteDoc(goalDoc(uid, goalId))
}