'use client'

import { DataProvider, useData } from '../../context'
import type { HouseData, QuarterData } from '../../context'
import { NavHeader } from '../../components'
import styles from './page.module.css'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const Q_LABELS: Record<string, string> = {
  Q1: 'Jan–Mar', Q2: 'Apr–Jun', Q3: 'Jul–Sep', Q4: 'Oct–Dec'
}

const NEW_MONTHLY: Record<number, number> = { 0: 1500, 1: 1300, 2: 700 }

function getCurrentRates(cat: number) {
  const monthly = NEW_MONTHLY[cat] ?? 1300
  return {
    monthly,
    quarterly: monthly * 3,
    biannual:  monthly * 6,
    yearly:    monthly * 12,
  }
}

function quarterToNum(year: number, q: string): number {
  return year * 4 + parseInt(q[1])
}

type CellStatus = 'paid' | 'partial' | 'missed' | 'future' | 'na' | 'before'

function getCellStatus(
  qData: QuarterData | undefined,
  isConstructed: boolean,
  year: number,
  quarter: string,
  firstYear: number | null,
  firstQuarter: string | null,
  currentQNum: number
): CellStatus {
  if (!isConstructed) return 'na'

  const qNum = quarterToNum(year, quarter)

  // Future quarter — not due yet
  if (qNum > currentQNum) {
    if (qData && qData.total > 0) return 'paid' // advance payment
    return 'future'
  }

  // Before first payment period
  if (firstYear !== null && firstQuarter !== null) {
    if (qNum < quarterToNum(firstYear, firstQuarter)) return 'before'
  } else {
    return 'na'
  }

  if (!qData || qData.monthCount === 0) return 'missed'
  if (qData.total === 0) return 'missed'

  // PARTIAL if:
  // 1. Any month is missing (< 3 months recorded)
  // 2. Any month has zero amount
  // 3. From Q3 2025 onwards: any month paid below prescribed rate
  if (qData.monthCount < 3 || qData.hasZero || qData.hasBelowRate) return 'partial'

  return 'paid'
}

function DetailScreen({ hid }: { hid: string }) {
  const { data, loading, error } = useData()

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /><p>Loading records...</p></div>
  if (error)   return <div className={styles.loading}><p style={{ color: 'var(--red)' }}>{error}</p></div>

  const h: HouseData | undefined = data!.houses[hid]
  if (!h) return <div className={styles.loading}><p style={{ color: 'var(--red)' }}>House not found.</p></div>

  const isConstructed = h.status === 'Constructed'
  const currentQNum   = data!.currentQuarterNum
  const payments      = h.payments ?? {}
  const rates         = getCurrentRates(h.cat)

  const years      = Object.keys(payments).map(Number).sort()
  const currentYear = Math.floor(currentQNum / 4)
  const minYear    = h.firstPaymentYear ?? (years.length ? Math.min(...years) : currentYear)
  const maxPayYear = years.length ? Math.max(...years) : currentYear
  const maxYear    = Math.max(maxPayYear, currentYear)

  const allYears: number[] = []
  for (let y = minYear; y <= maxYear; y++) allYears.push(y)

  // Summary counts
  let paid = 0, partial = 0, missed = 0, totalPaid = 0
  allYears.forEach(y => {
    QUARTERS.forEach(q => {
      const qData  = payments[String(y)]?.[q]
      const status = getCellStatus(qData, isConstructed, y, q, h.firstPaymentYear, h.firstPaymentQuarter, currentQNum)
      if (status === 'paid')    { paid++;    totalPaid += qData?.total ?? 0 }
      if (status === 'partial') { partial++; totalPaid += qData?.total ?? 0 }
      if (status === 'missed')  { missed++ }
    })
  })

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
        {/* House Info Card */}
        <div className={styles.infoCard}>
          <div className={styles.infoTop}>
            <div>
              <div className={styles.houseNo}>House {h.house}</div>
              <div className={styles.houseAddr}>Street {h.street} · {h.sector}</div>
            </div>
            <span className={`${styles.badge} ${statusCls}`}>{h.status}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.catTag}>Category {h.cat}</span>
          </div>
        </div>

        {/* Fee Rate Panel */}
        {isConstructed && (
          <div className={styles.rateCard}>
            <div className={styles.rateTitle}>Current Fee Rates (Cat {h.cat})</div>
            <div className={styles.rateGrid}>
              <div className={styles.rateItem}>
                <div className={styles.rateVal}>Rs. {rates.monthly.toLocaleString()}</div>
                <div className={styles.rateLbl}>Monthly</div>
              </div>
              <div className={styles.rateDivider} />
              <div className={styles.rateItem}>
                <div className={styles.rateVal}>Rs. {rates.quarterly.toLocaleString()}</div>
                <div className={styles.rateLbl}>Quarterly</div>
              </div>
              <div className={styles.rateDivider} />
              <div className={styles.rateItem}>
                <div className={styles.rateVal}>Rs. {rates.biannual.toLocaleString()}</div>
                <div className={styles.rateLbl}>6-Monthly</div>
              </div>
              <div className={styles.rateDivider} />
              <div className={styles.rateItem}>
                <div className={styles.rateVal}>Rs. {rates.yearly.toLocaleString()}</div>
                <div className={styles.rateLbl}>Yearly</div>
              </div>
            </div>
          </div>
        )}

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
            <div className={styles.legendItem}><span className={styles.dot} style={{background:'var(--accent)',opacity:0.4}}/>Advance</div>
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
              {allYears.map(y => {
                const isFutureYear = quarterToNum(y, 'Q1') > currentQNum
                const hasAdvance   = QUARTERS.some(q => {
                  const qd = payments[String(y)]?.[q]
                  return qd && qd.total > 0
                })
                if (isFutureYear && !hasAdvance) return null

                return (
                  <tr key={y}>
                    <td className={styles.tdYear}>{y}</td>
                    {QUARTERS.map(q => {
                      const qData  = payments[String(y)]?.[q]
                      const status = getCellStatus(qData, isConstructed, y, q, h.firstPaymentYear, h.firstPaymentQuarter, currentQNum)
                      const display = qData?.total ?? 0
                      return (
                        <td key={q} className={`${styles.td} ${styles[status]}`}>
                          {status === 'paid'    && display.toLocaleString()}
                          {status === 'partial' && display.toLocaleString()}
                          {status === 'missed'  && '✗'}
                          {status === 'future'  && <span className={styles.futureCell}>—</span>}
                          {status === 'na'      && '—'}
                          {status === 'before'  && '·'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
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

export default function HouseDetailPage({ params }: { params: { hid: string } }) {
  return (
    <DataProvider>
      <DetailScreen hid={decodeURIComponent(params.hid)} />
    </DataProvider>
  )
}
