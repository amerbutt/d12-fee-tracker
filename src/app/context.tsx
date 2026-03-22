'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type QuarterData = {
  total: number
  months: number[]
}

export type HouseData = {
  id: string
  sector: string
  street: string
  house: string
  name: string
  cat: number
  status: string
  firstPaymentYear: number | null
  firstPaymentQuarter: string | null
  payments: Record<string, Record<string, QuarterData>>
}

export type AppData = {
  sectors: Record<string, Record<string, string[]>>
  houses: Record<string, HouseData>
  lastUpdated: number
}

type DataContextType = {
  data: AppData | null
  loading: boolean
  error: string | null
}

const DataContext = createContext<DataContextType>({ data: null, loading: true, error: null })

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData]       = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to connect. Please check your internet connection.'))
      .finally(() => setLoading(false))
  }, [])

  return <DataContext.Provider value={{ data, loading, error }}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
