'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './nav.module.css'

type Props = {
  title: string
  subtitle?: string
  backHref?: string
  crumbs?: { label: string; href?: string }[]
}

export function NavHeader({ title, subtitle, backHref, crumbs }: Props) {
  const router = useRouter()

  return (
    <div className={styles.header}>
      <div className={styles.headerTop}>
        {backHref ? (
          <button className={styles.backBtn} onClick={() => router.back()} aria-label="Go back">←</button>
        ) : (
          <div className={styles.logoMark}>D12</div>
        )}
        <div className={styles.headerText}>
          <h1 className={styles.headerTitle}>{title}</h1>
          {subtitle && <p className={styles.headerSub}>{subtitle}</p>}
        </div>
        {/* Home button — always visible except on home screen */}
        {backHref && (
          <Link href="/" className={styles.homeBtn} aria-label="Go to home">🏠</Link>
        )}
      </div>
      {crumbs && crumbs.length > 0 && (
        <div className={styles.breadcrumb}>
          <Link href="/" className={styles.crumbLink}>Home</Link>
          {crumbs.map((c, i) => (
            <span key={i}>
              <span className={styles.crumbSep}>›</span>
              {c.href
                ? <Link href={c.href} className={styles.crumbLink}>{c.label}</Link>
                : <span className={styles.crumbActive}>{c.label}</span>
              }
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function SearchBar({ placeholder, value, onChange }: {
  placeholder: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className={styles.searchWrap}>
      <div className={styles.searchBox}>
        <span className={styles.searchIcon}>⌕</span>
        <input
          type="search" placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          className={styles.searchInput} autoComplete="off"
        />
        {value && <button className={styles.clearBtn} onClick={() => onChange('')}>✕</button>}
      </div>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>🔍</div>
      <p>{message}</p>
    </div>
  )
}
