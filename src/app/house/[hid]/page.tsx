'use client'

import { use } from 'react'
import { DataProvider, useData } from '../../context'
import type { HouseData } from '../../context'
import { NavHeader } from '../../components'
import styles from './page.module.css'

// Calendar year quarters
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const Q_LABELS: Record<string, string> = {
  Q1: 'Jan–Mar', Q2: 'Apr–Jun', Q3: 'Jul–Sep', Q4: 'Oct–Dec'
}
const EXPECTED: Record<number, number> = { 0: 1000, 1: 1000, 2: 500 }

function quarterToNum(year: number, q: string): number {
  return year * 4 + parseInt(q[1])
}

type CellStatus = 'paid' | 'partial' | 'missed' | 'na' | 'before'

function getCellStatus(
  amount: number | undefined,
  expectedFee: number,
  isConstructed: boolean,
  year: number,
  quarter: string,
  firstYear: number | null,
  firstQuarter: string | null
): CellStatus {
  if (!isConstructed) return 'na'

  // Before first payment period — don't count as missed
  if (firstYear !== null && firstQuarter !== null) {
    if (quarterToNum(year, quarter) < quarterToNum(firstYear, firstQuarter)) {
      return 'before'
    }
  } else {
    // No payments ever made — don't show as missed
    return 'na'
  }

  if (amount === undefined || amount === null || amount === 0) return 'missed'
  if (amount >= expectedFee) return 'paid'
  return 'partial'
}

function DetailScreen({ hid }: { hid: string }) {
  const { data, loading, error } = useData()

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /><p>Loading records...</p></div>
  if (error)   return <div className={styles.loading}><p style={{ color: 'var(--red)' }}>{error}</p></div>

  const h: HouseData | undefined = data!.houses[hid]
  if (!h) return <div className={styles.loading}><p style={{ color: 'var(--red)' }}>House not found.</p></div>

  const isConstructed = h.status === 'Constructed'
  const expectedFee   = EXPECTED[h.cat] ?? 1000
  const payments      = h.payments ?? {}
  const years         = Object.keys(payments).map(Number).sort()

  const minYear = h.firstPaymentYear ?? (years.length ? Math.min(...years) : new Date().getFullYear())
  const maxYear = Math.max(...years, new Date().getFullYear())
  const allYears: number[] = []
  for (let y = minYear; y <= maxYear; y++) allYears.push(y)

  // Summary counts — only after first payment
  let paid = 0, partial = 0, missed = 0, totalPaid = 0
  allYears.forEach(y => {
    QUARTERS.forEach(q => {
      const amt = payments[String(y)]?.[q]
      const status = getCellStatus(amt, expectedFee, isConstructed, y, q, h.firstPaymentYear, h.firstPaymentQuarter)
      if (status === 'paid')    { paid++;    totalPaid += amt! }
      if (status === 'partial') { partial++; totalPaid += amt! }
      if (status === 'missed')  { missed++ }
    })
  })

  const nameDisplay = h.name && h.name !== 'nan' ? h.name : '—'
  const statusCls = h.status === 'Plot' ? styles.badgePlot
                  : h.status === 'Constructed' ? styles.badgeBuilt
                  : styles.badgeUnder

  return (
    <>
      <NavHeader
        title={`House ${h.house}`}
        subtitle={`${h.sector} · Street ${h.street}`}
        backHref={`/houses/${encodeURIComponent(h.sector)}/${encodeURIComponent(h.street)}`}
        crumbs={[
          { label: h.sector, href: `/streets/${encodeURIComponent(h.sector)}` },
          { label: `St.${h.street}`, href: `/houses/${encodeURIComponent(h.sector)}/${encodeURIComponent(h.street)}` },
          { label: `H.${h.house}` }
        ]}
      />

      <div className={styles.content}>
        {/* House Info Card — NO phone number */}
        <div className={styles.infoCard}>
          <div className={styles.infoTop}>
            <div>
              <div className={styles.houseNo}>House {h.house}</div>
              <div className={styles.houseAddr}>Street {h.street} · {h.sector}</div>
            </div>
            <span className={`${styles.badge} ${statusCls}`}>{h.status}</span>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>👤 {nameDisplay}</div>
            <span className={styles.catTag}>Cat {h.cat}</span>
          </div>
          {isConstructed && (
            <div className={styles.expectedFee}>
              Expected: <strong>Rs. {expectedFee.toLocaleString()} / quarter</strong>
            </div>
          )}
        </div>

        {/* Summary */}
        {isConstructed && h.firstPaymentYear && (
          <div className={styles.summaryStrip}>
            <div className={styles.summaryItem}>
              <div className={styles.summaryVal} style={{ color: 'var(--green)' }}>{paid}</div>
              <div className={styles.summaryLbl}>Paid</div>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <div className={styles.summaryVal} style={{ color: 'var(--yellow)' }}>{partial}</div>
              <div className={styles.summaryLbl}>Partial</div>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <div className={styles.summaryVal} style={{ color: 'var(--red)' }}>{missed}</div>
              <div className={styles.summaryLbl}>Missed</div>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <div className={styles.summaryVal} style={{ color: 'var(--accent)' }}>
                {totalPaid >= 1000 ? `${Math.round(totalPaid/1000)}k` : totalPaid}
              </div>
              <div className={styles.summaryLbl}>Total Rs.</div>
            </div>
          </div>
        )}

        {/* Legend */}
        {isConstructed && (
          <div className={styles.legend}>
            <div className={styles.legendItem}><span className={styles.dot} style={{background:'var(--green)'}}/>Paid</div>
            <div className={styles.legendItem}><span className={styles.dot} style={{background:'var(--yellow)'}}/>Partial</div>
            <div className={styles.legendItem}><span className={styles.dot} style={{background:'var(--red)'}}/>Missed</div>
            <div className={styles.legendItem}><span className={styles.dot} style={{background:'var(--border)'}}/>N/A</div>
          </div>
        )}

        {/* Payment Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thYear}>Year</th>
                {QUARTERS.map(q => (
                  <th key={q} className={styles.th}>
                    {q}<br/><span className={styles.thSub}>{Q_LABELS[q]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allYears.map(y => (
                <tr key={y}>
                  <td className={styles.tdYear}>{y}</td>
                  {QUARTERS.map(q => {
                    const amt    = payments[String(y)]?.[q]
                    const status = getCellStatus(amt, expectedFee, isConstructed, y, q, h.firstPaymentYear, h.firstPaymentQuarter)
                    return (
                      <td key={q} className={`${styles.td} ${styles[status]}`}>
                        {status === 'paid'    && amt!.toLocaleString()}
                        {status === 'partial' && amt!.toLocaleString()}
                        {status === 'missed'  && '✗'}
                        {status === 'na'      && '—'}
                        {status === 'before'  && '·'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {h.status === 'Plot' && (
          <p className={styles.plotNote}>⚠️ Plot only — fee collection does not apply.</p>
        )}
        {isConstructed && !h.firstPaymentYear && (
          <p className={styles.plotNote}>ℹ️ No payments recorded for this property yet.</p>
        )}
      </div>
    </>
  )
}

export default function HouseDetailPage({ params }: { params: Promise<{ hid: string }> }) {
  const { hid } = use(params)
  return (
    <DataProvider>
      <DetailScreen hid={decodeURIComponent(hid)} />
    </DataProvider>
  )
}
