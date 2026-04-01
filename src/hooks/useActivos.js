import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  subscribeAssets,
  createAssetDoc,
  updateAssetDoc,
  deleteAssetDoc,
} from '../services/firestore/activos'

function deriveAssetsState(items = []) {
  const activos = items || []

  const metrics = activos.reduce(
    (acc, item) => {
      if (item.activo !== false) {
        acc.totalActivos += 1
        acc.valorTotal += Number(item.valorActual || 0)
      }
      return acc
    },
    {
      totalActivos: 0,
      valorTotal: 0,
    }
  )

  return {
    items: activos,
    metrics,
  }
}

export function useActivos(uid) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)

    const unsubscribe = subscribeAssets(uid, (nextItems) => {
      setItems(nextItems || [])
      setLoading(false)
    })

    return () => unsubscribe()
  }, [uid])

  const state = useMemo(() => deriveAssetsState(items), [items])

  const createActivo = useCallback(async (payload) => {
    await createAssetDoc(uid, payload)
  }, [uid])

  const updateActivo = useCallback(async (assetId, patch) => {
    await updateAssetDoc(uid, assetId, patch)
  }, [uid])

  const deleteActivo = useCallback(async (assetId) => {
    await deleteAssetDoc(uid, assetId)
  }, [uid])

  return {
    loading,
    items: state.items,
    metrics: state.metrics,
    createActivo,
    updateActivo,
    deleteActivo,
  }
}