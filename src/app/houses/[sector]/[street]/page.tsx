'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DataProvider, useData } from '../../../context'
import { NavHeader, SearchBar, EmptyState } from '../../../components'
import styles from './page.module.css'

function statusBadge(status: string) {
  if (status === 'Plot')        return { label: 'Plot',  cls: styles.badgePlot }
  if (status === 'Constructed') return { label: 'Built', cls: styles.badgeBuilt }
  return                               { label: 'U/C',   cls: styles.badgeUnder }
}

function HousesScreen({ sector, street }: { sector: string; street: string }) {
  const { data, loading, error } = useData()
  const [search, setSearch] = useState('')

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>
  if (error)   return <div className={styles.loading}><p style={{color:'var(--red)'}}>{error}</p></div>

  const houses = Object.entries(data?.houses ?? {})
    .filter(([, h]) => h.sector === sector && h.street === street)
    .map(([hid, h]) => ({ hid, ...h }))
    .sort((a, b) => {
      const na = parseFloat(a.house), nb = parseFloat(b.house)
      return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.house.localeCompare(b.house)
    })

  const filtered = houses.filter(h =>
    !search || h.house.toLowerCase().includes(search.toLowerCase())
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
      <SearchBar placeholder="Search house number..." value={search} onChange={setSearch} />
      <div className={styles.content}>
        <p className={styles.sectionLabel}>{filtered.length} Houses on Street {street}</p>
        {filtered.length === 0
          ? <EmptyState message="No houses match your search" />
          : filtered.map(h => {
              const badge = statusBadge(h.status)
              return (
                <Link
                  key={h.hid}
                  href={`/house/${encodeURIComponent(h.hid)}`}
                  className={styles.listItem}
                >
                  <div className={styles.listLeft}>
                    <div className={styles.listIcon}>🏠</div>
                    <div>
                      <div className={styles.listName}>
                        House {h.house}
                        <span className={`${styles.badge} ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className={styles.listSub}>Category {h.cat}</div>
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

export default function HousesPage({ params }: { params: { sector: string; street: string } }) {
  return (
    <DataProvider>
      <HousesScreen
        sector={decodeURIComponent(params.sector)}
        street={decodeURIComponent(params.street)}
      />
    </DataProvider>
  )
}
