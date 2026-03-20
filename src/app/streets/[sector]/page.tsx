'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { DataProvider, useData } from '../../context'
import { NavHeader, SearchBar, EmptyState } from '../../components'
import styles from './page.module.css'

function StreetsScreen({ sector }: { sector: string }) {
  const { data, loading, error } = useData()
  const [search, setSearch] = useState('')

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /><p>Loading...</p></div>
  if (error)   return <div className={styles.loading}><p style={{color:'var(--red)'}}>{error}</p></div>

  const streets = Object.keys(data!.sectors[sector] ?? {}).sort((a, b) => {
    const na = parseFloat(a), nb = parseFloat(b)
    return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b)
  })

  const filtered = streets.filter(s => !search || s.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <NavHeader
        title={sector}
        subtitle="Select a Street"
        backHref="/"
        crumbs={[{ label: sector }]}
      />
      <SearchBar placeholder="Search street number..." value={search} onChange={setSearch} />

      <div className={styles.content}>
        <p className={styles.sectionLabel}>{filtered.length} Streets</p>

        {filtered.length === 0
          ? <EmptyState message="No streets match your search" />
          : filtered.map(street => {
              const count = data!.sectors[sector][street].length
              return (
                <Link
                  key={street}
                  href={`/houses/${encodeURIComponent(sector)}/${encodeURIComponent(street)}`}
                  className={styles.listItem}
                >
                  <div className={styles.listLeft}>
                    <div className={styles.listIcon}>🛣️</div>
                    <div>
                      <div className={styles.listName}>Street {street}</div>
                      <div className={styles.listSub}>{count} house{count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <span className={styles.arrow}>›</span>
                </Link>
              )
            })
        }
      </div>
    </>
  )
}

export default function StreetsPage({ params }: { params: Promise<{ sector: string }> }) {
  const { sector } = use(params)
  const decoded = decodeURIComponent(sector)

  return (
    <DataProvider>
      <StreetsScreen sector={decoded} />
    </DataProvider>
  )
}
