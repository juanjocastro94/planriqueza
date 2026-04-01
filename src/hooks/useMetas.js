import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  subscribeGoals,
  createGoalDoc,
  updateGoalDoc,
  deleteGoalDoc,
} from '../services/firestore/metas'

function sortByDate(items = []) {
  return [...items].sort((a, b) => (a.fechaObjetivo || '').localeCompare(b.fechaObjetivo || ''))
}

function deriveGoalsState(items = []) {
  const metas = sortByDate(items || [])

  const metrics = metas.reduce(
    (acc, item) => {
      if (item.activo !== false) {
        acc.totalMetas += 1
        acc.valorObjetivoTotal += Number(item.valorObjetivo || 0)
      }
      return acc
    },
    {
      totalMetas: 0,
      valorObjetivoTotal: 0,
    }
  )

  return {
    items: metas,
    metrics,
  }
}

export function useMetas(uid) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)

    const unsubscribe = subscribeGoals(uid, (nextItems) => {
      setItems(nextItems || [])
      setLoading(false)
    })

    return () => unsubscribe()
  }, [uid])

  const state = useMemo(() => deriveGoalsState(items), [items])

  const createMeta = useCallback(async (payload) => {
    await createGoalDoc(uid, payload)
  }, [uid])

  const updateMeta = useCallback(async (goalId, patch) => {
    await updateGoalDoc(uid, goalId, patch)
  }, [uid])

  const deleteMeta = useCallback(async (goalId) => {
    await deleteGoalDoc(uid, goalId)
  }, [uid])

  return {
    loading,
    items: state.items,
    metrics: state.metrics,
    createMeta,
    updateMeta,
    deleteMeta,
  }
}