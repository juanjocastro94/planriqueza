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
import { createAsset } from '../../domain/factories'

function assetsCol(uid) {
  return collection(db, 'users', uid, 'assets')
}

function assetDoc(uid, assetId) {
  return doc(db, 'users', uid, 'assets', assetId)
}

export function subscribeAssets(uid, callback) {
  if (!uid) throw new Error('uid requerido')

  const q = query(assetsCol(uid), orderBy('createdAt', 'asc'))

  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    )
  })
}

export async function createAssetDoc(uid, payload = {}) {
  if (!uid) throw new Error('uid requerido')

  const item = createAsset(payload)

  await setDoc(assetDoc(uid, item.id), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return item
}

export async function updateAssetDoc(uid, assetId, patch = {}) {
  if (!uid || !assetId) throw new Error('uid y assetId requeridos')

  await setDoc(
    assetDoc(uid, assetId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function deleteAssetDoc(uid, assetId) {
  if (!uid || !assetId) throw new Error('uid y assetId requeridos')
  await deleteDoc(assetDoc(uid, assetId))
}