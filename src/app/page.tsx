'use client'

import { DataProvider, useData } from './context'
import Link from 'next/link'
import styles from './page.module.css'

// Sector layout: D-12/2 D-12/3 / D-12/1 D-12/4
const SECTOR_LAYOUT = [
  ['D-12/2', 'D-12/3'],
  ['D-12/1', 'D-12/4'],
]

const SECTOR_COLORS: Record<string, string> = {
  'D-12/1': 'linear-gradient(135deg,#1e3a5f,#0d1117)',
  'D-12/2': 'linear-gradient(135deg,#2d1b69,#0d1117)',
  'D-12/3': 'linear-gradient(135deg,#1a3a2a,#0d1117)',
  'D-12/4': 'linear-gradient(135deg,#3a1a1a,#0d1117)',
}

const SECTOR_ICONS: Record<string, string> = {
  'D-12/1': '🏘️',
  'D-12/2': '🏗️',
  'D-12/3': '🏠',
  'D-12/4': '🌆',
}

function HomeScreen() {
  const { data, loading, error } = useData()

  if (loading) return (
    <div className={styles.centered}>
      <div className={styles.spinner} />
      <p className={styles.loadingText}>Loading D-12 records...</p>
      <p className={styles.loadingSubText}>Fetching securely from server</p>
    </div>
  )

  if (error) return (
    <div className={styles.centered}>
      <div className={styles.errorIcon}>⚠️</div>
      <p className={styles.errorText}>{error}</p>
    </div>
  )

  // Count total houses
  const totalHouses = Object.values(data!.sectors).reduce((t, streets) =>
    t + Object.values(streets).reduce((s, h) => s + h.length, 0), 0)

  return (
    <div className={styles.homeWrap}>
      <div className={styles.heroBar}>
        <div className={styles.heroIcon}>🏙️</div>
        <div>
          <h1 className={styles.heroTitle}>Sector D-12</h1>
          <p className={styles.heroSub}>Fee Collection Tracker · {totalHouses.toLocaleString()} properties</p>
        </div>
      </div>

      <p className={styles.sectionLabel}>Select Sub-Sector</p>

      <div className={styles.sectorWrap}>
        {SECTOR_LAYOUT.map((row, ri) => (
          <div key={ri} className={styles.sectorRow}>
            {row.map(sector => {
              const streets = data!.sectors[sector] ?? {}
              const streetCount = Object.keys(streets).length
              const houseCount  = Object.values(streets).reduce((s, h) => s + h.length, 0)
              return (
                <Link
                  key={sector}
                  href={`/streets/${encodeURIComponent(sector)}`}
                  className={styles.sectorCard}
                  style={{ background: SECTOR_COLORS[sector] }}
                >
                  <span className={styles.sectorIcon}>{SECTOR_ICONS[sector]}</span>
                  <span className={styles.sectorName}>{sector}</span>
                  <span className={styles.sectorMeta}>{streetCount} streets</span>
                  <span className={styles.sectorMeta}>{houseCount} properties</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      <p className={styles.footer}>D-12 Sector Office · Fee Tracker</p>
    </div>
  )
}

export default function Home() {
  return (
    <DataProvider>
      <HomeScreen />
    </DataProvider>
  )
}
