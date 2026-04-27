import * as React from 'react'
import type { CrmRecord, CrmRecordPatch } from '../types'

interface CrmOverrideValue {
  records: CrmRecord[]
  updateAny: (id: string, patch: CrmRecordPatch) => void
}

const CrmOverrideContext = React.createContext<CrmOverrideValue | null>(null)

export function CrmContextOverride({
  records,
  updateAny,
  children,
}: {
  records: CrmRecord[]
  updateAny: (id: string, patch: CrmRecordPatch) => void
  children: React.ReactNode
}) {
  const value = React.useMemo(() => ({ records, updateAny }), [records, updateAny])
  return <CrmOverrideContext.Provider value={value}>{children}</CrmOverrideContext.Provider>
}

export function useCrmOverride() {
  const ctx = React.useContext(CrmOverrideContext)
  if (!ctx) throw new Error('useCrmOverride must be used inside <CrmContextOverride>.')
  return ctx
}
