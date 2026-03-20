'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { DataProvider, useData, HouseData } from '../../../context'
import { NavHeader, SearchBar, EmptyState } from '../../../components'
import styles from './page.module.css'

function statusBadge(status: string) {
  if (status === 'Plot')        return { label: 'Plot',        cls: styles.badgePlot }
  if (status === 'Constructed') return { label: 'Built',       cls: styles.badgeBuilt }
  return                               { label: 'Under Const', cls: styles.badgeUnder }
}

function HousesScreen({ sector, street }: { sector: string; street: string }) {
  const { data, loading, error } = useData()
  const [search, setSearch] = useState('')

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>
  if (error)   return <div className={styles.loading}><p style={{color:'var(--red)'}}>{error}</p></div>

  const houseIds = Object.entries(data!.houses)
    .filter(([, h]) => h.sector === sector && h.street === street)
    .map(([id, h]) => ({ id, ...h }))
    .sort((a, b) => {
      const na = parseFloat(a.house), nb = parseFloat(b.house)
      return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.house.localeCompare(b.house)
    })

  const filtered = houseIds.filter(h =>
    !search ||
    h.house.toLowerCase().includes(search.toLowerCase()) ||
    h.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <NavHeader
        title={`Street ${street}`}
        subtitle={`${sector} · Select a House`}
        backHref={`/streets/${encodeURIComponent(sector)}`}
        crumbs={[
          { label: sector, href: `/streets/${encodeURIComponent(sector)}` },
          { label: `Street ${street}` }
        ]}
      />
      <SearchBar placeholder="Search house or name..." value={search} onChange={setSearch} />

      <div className={styles.content}>
        <p className={styles.sectionLabel}>{filtered.length} Houses on Street {street}</p>

        {filtered.length === 0
          ? <EmptyState message="No houses match your search" />
          : filtered.map(h => {
              const badge = statusBadge(h.status)
              const nameDisplay = h.name && h.name !== 'nan' ? h.name : '—'
              return (
                <Link
                  key={h.id}
                  href={`/house/${encodeURIComponent(h.id)}`}
                  className={styles.listItem}
                >
                  <div className={styles.listLeft}>
                    <div className={styles.listIcon}>🏠</div>
                    <div>
                      <div className={styles.listName}>
                        House {h.house}
                        <span className={`${styles.badge} ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className={styles.listSub}>{nameDisplay} · Cat {h.cat}</div>
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

export default function HousesPage({ params }: { params: Promise<{ sector: string; street: string }> }) {
  const { sector, street } = use(params)
  return (
    <DataProvider>
      <HousesScreen sector={decodeURIComponent(sector)} street={decodeURIComponent(street)} />
    </DataProvider>
  )
}
