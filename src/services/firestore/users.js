import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { createEmptyState } from '../../domain/factories'

export function getUserRootRef(uid) {
  return doc(db, 'users', uid)
}

export async function ensureUserDocument(uid) {
  if (!uid) throw new Error('uid requerido')

  const ref = getUserRootRef(uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    await setDoc(ref, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      appVersion: 1,
    })
  }

  return ref
}

export async function ensureUserSettings(uid) {
  if (!uid) throw new Error('uid requerido')

  await ensureUserDocument(uid)

  const ref = doc(db, 'users', uid, 'settings', 'main')
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    const empty = createEmptyState()
    await setDoc(ref, {
      ...empty.profile,
      ...empty.settings,
      schemaVersion: empty.schemaVersion,
      initialized: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  return ref
}