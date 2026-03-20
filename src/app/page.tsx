'use client'

import { DataProvider, useData } from './context'
import Link from 'next/link'
import styles from './page.module.css'

const SECTOR_ICONS = ['🏘️', '🏗️', '🏠', '🌆']
const SECTOR_COLORS = [
  'linear-gradient(135deg,#1e3a5f,#0d1117)',
  'linear-gradient(135deg,#2d1b69,#0d1117)',
  'linear-gradient(135deg,#1a3a2a,#0d1117)',
  'linear-gradient(135deg,#3a1a1a,#0d1117)',
]

function HomeScreen() {
  const { data, loading, error } = useData()

  if (loading) return (
    <div className={styles.centered}>
      <div className={styles.spinner} />
      <p className={styles.loadingText}>Loading data from server...</p>
      <p className={styles.loadingSubText}>Fetching latest records securely</p>
    </div>
  )

  if (error) return (
    <div className={styles.centered}>
      <div className={styles.errorIcon}>⚠️</div>
      <p className={styles.errorText}>{error}</p>
    </div>
  )

  const sectors = Object.keys(data!.sectors).sort()

  return (
    <div className={styles.homeWrap}>
      <div className={styles.heroBar}>
        <div className={styles.heroIcon}>🏙️</div>
        <div>
          <h1 className={styles.heroTitle}>Sector D-12</h1>
          <p className={styles.heroSub}>Fee Collection Tracker</p>
        </div>
      </div>

      <p className={styles.sectionLabel}>Select Sub-Sector</p>

      <div className={styles.sectorGrid}>
        {sectors.map((sector, i) => {
          const streets = data!.sectors[sector]
          const streetCount = Object.keys(streets).length
          const houseCount = Object.values(streets).reduce((s, h) => s + h.length, 0)

          return (
            <Link key={sector} href={`/streets/${encodeURIComponent(sector)}`} className={styles.sectorCard} style={{ background: SECTOR_COLORS[i] }}>
              <div className={styles.sectorCardInner}>
                <span className={styles.sectorIcon}>{SECTOR_ICONS[i]}</span>
                <span className={styles.sectorName}>{sector}</span>
                <span className={styles.sectorMeta}>{streetCount} streets</span>
                <span className={styles.sectorMeta}>{houseCount} houses</span>
              </div>
            </Link>
          )
        })}
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
