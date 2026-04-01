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
import {
  createFixedExpense,
  createVariableExpense,
  createExtraordinaryExpense,
  createSubscription,
} from '../../domain/factories'

function fixedCol(uid) {
  return collection(db, 'users', uid, 'expense_fixed')
}

function variableCol(uid) {
  return collection(db, 'users', uid, 'expense_variable')
}

function extraordinaryCol(uid) {
  return collection(db, 'users', uid, 'expense_extraordinary')
}

function subscriptionsCol(uid) {
  return collection(db, 'users', uid, 'subscriptions')
}

function fixedDoc(uid, id) {
  return doc(db, 'users', uid, 'expense_fixed', id)
}

function variableDoc(uid, id) {
  return doc(db, 'users', uid, 'expense_variable', id)
}

function extraordinaryDoc(uid, id) {
  return doc(db, 'users', uid, 'expense_extraordinary', id)
}

function subscriptionDoc(uid, id) {
  return doc(db, 'users', uid, 'subscriptions', id)
}

function subscribeSimpleCollection(colRef, callback) {
  const q = query(colRef, orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    )
  })
}

export function subscribeFixedExpenses(uid, callback) {
  if (!uid) throw new Error('uid requerido')
  return subscribeSimpleCollection(fixedCol(uid), callback)
}

export function subscribeVariableExpenses(uid, callback) {
  if (!uid) throw new Error('uid requerido')
  return subscribeSimpleCollection(variableCol(uid), callback)
}

export function subscribeExtraordinaryExpenses(uid, callback) {
  if (!uid) throw new Error('uid requerido')
  return subscribeSimpleCollection(extraordinaryCol(uid), callback)
}

export function subscribeSubscriptions(uid, callback) {
  if (!uid) throw new Error('uid requerido')
  return subscribeSimpleCollection(subscriptionsCol(uid), callback)
}

export async function createFixedExpenseDoc(uid, payload = {}) {
  if (!uid) throw new Error('uid requerido')

  const item = createFixedExpense(payload)

  await setDoc(fixedDoc(uid, item.id), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return item
}

export async function updateFixedExpenseDoc(uid, id, patch = {}) {
  if (!uid || !id) throw new Error('uid e id requeridos')

  await setDoc(
    fixedDoc(uid, id),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteFixedExpenseDoc(uid, id) {
  if (!uid || !id) throw new Error('uid e id requeridos')
  await deleteDoc(fixedDoc(uid, id))
}

export async function createVariableExpenseDoc(uid, payload = {}) {
  if (!uid) throw new Error('uid requerido')

  const item = createVariableExpense(payload)

  await setDoc(variableDoc(uid, item.id), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return item
}

export async function updateVariableExpenseDoc(uid, id, patch = {}) {
  if (!uid || !id) throw new Error('uid e id requeridos')

  await setDoc(
    variableDoc(uid, id),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteVariableExpenseDoc(uid, id) {
  if (!uid || !id) throw new Error('uid e id requeridos')
  await deleteDoc(variableDoc(uid, id))
}

export async function createExtraordinaryExpenseDoc(uid, payload = {}) {
  if (!uid) throw new Error('uid requerido')

  const item = createExtraordinaryExpense(payload)

  await setDoc(extraordinaryDoc(uid, item.id), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return item
}

export async function updateExtraordinaryExpenseDoc(uid, id, patch = {}) {
  if (!uid || !id) throw new Error('uid e id requeridos')

  await setDoc(
    extraordinaryDoc(uid, id),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteExtraordinaryExpenseDoc(uid, id) {
  if (!uid || !id) throw new Error('uid e id requeridos')
  await deleteDoc(extraordinaryDoc(uid, id))
}

export async function createSubscriptionDoc(uid, payload = {}) {
  if (!uid) throw new Error('uid requerido')

  const item = createSubscription(payload)

  await setDoc(subscriptionDoc(uid, item.id), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return item
}

export async function updateSubscriptionDoc(uid, id, patch = {}) {
  if (!uid || !id) throw new Error('uid e id requeridos')

  await setDoc(
    subscriptionDoc(uid, id),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteSubscriptionDoc(uid, id) {
  if (!uid || !id) throw new Error('uid e id requeridos')
  await deleteDoc(subscriptionDoc(uid, id))
}