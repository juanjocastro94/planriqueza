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
import { createIncomeRecord, createIncomeSource } from '../../domain/factories'

function incomeSourcesCol(uid) {
  return collection(db, 'users', uid, 'income_sources')
}

function incomeSourceDoc(uid, sourceId) {
  return doc(db, 'users', uid, 'income_sources', sourceId)
}

function incomeRecordsCol(uid, sourceId) {
  return collection(db, 'users', uid, 'income_sources', sourceId, 'records')
}

function incomeRecordDoc(uid, sourceId, recordId) {
  return doc(db, 'users', uid, 'income_sources', sourceId, 'records', recordId)
}

export function subscribeIncomeSources(uid, callback) {
  if (!uid) throw new Error('uid requerido')

  const q = query(incomeSourcesCol(uid), orderBy('createdAt', 'asc'))

  return onSnapshot(q, async (snapshot) => {
    const sources = await Promise.all(
      snapshot.docs.map(async (snap) => {
        const source = { id: snap.id, ...snap.data() }

        const recordsSnap = await getDocs(query(incomeRecordsCol(uid, source.id), orderBy('periodo', 'asc')))
        const records = recordsSnap.docs.map((r) => ({
          id: r.id,
          ...r.data(),
        }))

        return {
          ...source,
          registros: records,
        }
      })
    )

    callback(sources)
  })
}

export async function createIncomeSourceDoc(uid, payload = {}) {
  if (!uid) throw new Error('uid requerido')

  const source = createIncomeSource(payload)

  await setDoc(incomeSourceDoc(uid, source.id), {
    ...source,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return source
}

export async function updateIncomeSourceDoc(uid, sourceId, patch = {}) {
  if (!uid || !sourceId) throw new Error('uid y sourceId requeridos')

  await setDoc(
    incomeSourceDoc(uid, sourceId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteIncomeSourceDoc(uid, sourceId) {
  if (!uid || !sourceId) throw new Error('uid y sourceId requeridos')

  const recordsSnap = await getDocs(incomeRecordsCol(uid, sourceId))
  await Promise.all(recordsSnap.docs.map((r) => deleteDoc(incomeRecordDoc(uid, sourceId, r.id))))
  await deleteDoc(incomeSourceDoc(uid, sourceId))
}

export async function createIncomeRecordDoc(uid, sourceId, payload = {}) {
  if (!uid || !sourceId) throw new Error('uid y sourceId requeridos')

  const record = createIncomeRecord(payload.periodo || '')
  const next = {
    ...record,
    ...payload,
  }

  await setDoc(incomeRecordDoc(uid, sourceId, next.id), {
    ...next,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(
    incomeSourceDoc(uid, sourceId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return next
}

export async function updateIncomeRecordDoc(uid, sourceId, recordId, patch = {}) {
  if (!uid || !sourceId || !recordId) throw new Error('uid, sourceId y recordId requeridos')

  await setDoc(
    incomeRecordDoc(uid, sourceId, recordId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  await setDoc(
    incomeSourceDoc(uid, sourceId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteIncomeRecordDoc(uid, sourceId, recordId) {
  if (!uid || !sourceId || !recordId) throw new Error('uid, sourceId y recordId requeridos')

  await deleteDoc(incomeRecordDoc(uid, sourceId, recordId))

  await setDoc(
    incomeSourceDoc(uid, sourceId),
    {
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}