'use client'

import { useState, useEffect, useRef } from 'react'
import { DataProvider, useData } from '../../context'
import type { HouseData, QuarterData } from '../../context'
import { NavHeader } from '../../components'
import styles from './page.module.css'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const Q_LABELS: Record<string, string> = {
  Q1: 'Jan–Mar', Q2: 'Apr–Jun', Q3: 'Jul–Sep', Q4: 'Oct–Dec'
}

const NEW_MONTHLY: Record<number, number> = { 0: 1500, 1: 1300, 2: 700 }
const OLD_MONTHLY: Record<number, number> = { 0: 1000, 1: 1000, 2: 500 }
const RATE_CHANGE_QNUM = 2025 * 4 + 3

function getExpectedQtrly(cat: number, year: number, quarter: string): number {
  const qnum = year * 4 + parseInt(quarter[1])
  const monthly = qnum >= RATE_CHANGE_QNUM ? (NEW_MONTHLY[cat] ?? 1300) : (OLD_MONTHLY[cat] ?? 1000)
  return monthly * 3
}

function getCurrentRates(cat: number) {
  const monthly = NEW_MONTHLY[cat] ?? 1300
  return { monthly, quarterly: monthly * 3, biannual: monthly * 6, yearly: monthly * 12 }
}

function quarterToNum(year: number, q: string): number {
  return year * 4 + parseInt(q[1])
}

type CellStatus = 'paid' | 'partial' | 'advance' | 'missed' | 'dash' | 'na' | 'before'

function getCellStatus(
  qData: QuarterData | undefined,
  isConstructed: boolean,
  year: number,
  quarter: string,
  firstYear: number | null,
  firstQuarter: string | null,
  currentQNum: number,
  cat: number
): CellStatus {
  if (!isConstructed) return 'na'

  const qNum     = quarterToNum(year, quarter)
  const isFuture = qNum > currentQNum
  const expectedQtr = getExpectedQtrly(cat, year, quarter)

  if (firstYear !== null && firstQuarter !== null) {
    if (qNum < quarterToNum(firstYear, firstQuarter)) return 'before'
  } else return 'na'

  const total = qData?.total ?? 0

  if (total > 0) {
    if (total < expectedQtr) return 'partial'   // ANY underpayment = orange
    if (isFuture)            return 'advance'   // future full payment = blue
    return 'paid'                               // past/current full = green
  }

  if (isFuture || qNum === currentQNum) return 'dash'  // current/future unpaid = dash
  return 'missed'                                       // past unpaid = red
}

function ReceiptTooltip({ receipts, amount, onClose, position }: {
  receipts: string[]; amount: number; onClose: () => void; position: 'above' | 'below'
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 100)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClick) }
  }, [onClose])

  return (
    <div ref={ref} className={`${styles.tooltip} ${position === 'below' ? styles.tooltipBelow : styles.tooltipAbove}`}>
      <div className={position === 'below' ? styles.arrowUp : styles.arrowDown} />
      <div className={styles.tooltipHeader}>
        <span className={styles.tooltipAmount}>Rs. {amount.toLocaleString()}</span>
        <button className={styles.tooltipClose} onClick={e => { e.stopPropagation(); onClose() }}>✕</button>
      </div>
      {receipts.length > 0 ? (
        <>
          <div className={styles.tooltipLabel}>Receipt{receipts.length > 1 ? 's' : ''}</div>
          <div className={styles.tooltipReceipts}>
            {receipts.map((r, i) => <span key={i} className={styles.receiptBadge}>#{r}</span>)}
          </div>
        </>
      ) : (
        <div className={styles.tooltipNoReceipt}>No receipt recorded</div>
      )}
    </div>
  )
}

function PaymentCell({ status, qData, rowIndex }: {
  status: CellStatus; qData: QuarterData | undefined; rowIndex: number
}) {
  const [open, setOpen] = useState(false)
  const canTap = (status === 'paid' || status === 'partial' || status === 'advance') && qData
  const position: 'above' | 'below' = rowIndex < 3 ? 'below' : 'above'

  return (
    <td className={`${styles.td} ${styles[status]} ${canTap ? styles.tappable : ''}`}
        onClick={() => canTap && setOpen(o => !o)}>
      {status === 'paid'    && (qData?.total ?? 0).toLocaleString()}
      {status === 'partial' && (qData?.total ?? 0).toLocaleString()}
      {status === 'advance' && (qData?.total ?? 0).toLocaleString()}
      {status === 'missed'  && '✗'}
      {status === 'dash'    && <span className={styles.dashCell}>—</span>}
      {status === 'na'      && '—'}
      {status === 'before'  && '·'}
      {open && canTap && (
        <ReceiptTooltip receipts={qData!.receipts} amount={qData!.total}
          onClose={() => setOpen(false)} position={position} />
      )}
    </td>
  )
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

  const years       = Object.keys(payments).map(Number).sort()
  const currentYear = Math.floor(currentQNum / 4)
  const minYear     = h.firstPaymentYear ?? (years.length ? Math.min(...years) : currentYear)
  const maxYear     = Math.max(years.length ? Math.max(...years) : currentYear, currentYear)

  const visibleYears: number[] = []
  for (let y = maxYear; y >= minYear; y--) {
    const isFutureYear = quarterToNum(y, 'Q1') > currentQNum
    const hasData = QUARTERS.some(q => (payments[String(y)]?.[q]?.total ?? 0) > 0)
    if (!isFutureYear || hasData) visibleYears.push(y)
  }

  let paid = 0, partial = 0, missed = 0, advance = 0, totalPaid = 0
  visibleYears.forEach(y => {
    QUARTERS.forEach(q => {
      const qData  = payments[String(y)]?.[q]
      const status = getCellStatus(qData, isConstructed, y, q,
        h.firstPaymentYear, h.firstPaymentQuarter, currentQNum, h.cat)
      if (status === 'paid')    { paid++;    totalPaid += qData?.total ?? 0 }
      if (status === 'partial') { partial++; totalPaid += qData?.total ?? 0 }
      if (status === 'advance') { advance++; totalPaid += qData?.total ?? 0 }
      if (status === 'missed')  { missed++ }
    })
  })

  const statusCls = h.status === 'Plot' ? styles.badgePlot
                  : h.status === 'Constructed' ? styles.badgeBuilt : styles.badgeUnder

  return (
    <>
      <NavHeader
        title={`House ${h.house}`} subtitle={`${h.sector} · Street ${h.street}`}
        backHref={`/houses/${encodeURIComponent(h.sector)}/${encodeURIComponent(h.street)}`}
        crumbs={[
          { label: h.sector, href: `/streets/${encodeURIComponent(h.sector)}` },
          { label: `St.${h.street}`, href: `/houses/${encodeURIComponent(h.sector)}/${encodeURIComponent(h.street)}` },
          { label: `H.${h.house}` }
        ]}
      />

      <div className={styles.content}>
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
            {isConstructed && <span className={styles.tapHint}>Tap any amount to see receipt</span>}
          </div>
        </div>

        {isConstructed && (
          <div className={styles.rateCard}>
            <div className={styles.rateTitle}>Current Fee Rates (Cat {h.cat})</div>
            <div className={styles.rateGrid}>
              {[['Monthly', rates.monthly], ['Quarterly', rates.quarterly],
                ['6-Monthly', rates.biannual], ['Yearly', rates.yearly]].map(([lbl, val], i, arr) => (
                <div key={lbl as string} style={{display:'flex',alignItems:'center',flex:1}}>
                  <div className={styles.rateItem}>
                    <div className={styles.rateVal}>Rs. {(val as number).toLocaleString()}</div>
                    <div className={styles.rateLbl}>{lbl as string}</div>
                  </div>
                  {i < arr.length - 1 && <div className={styles.rateDivider} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {isConstructed && h.firstPaymentYear && (
          <div className={styles.summaryStrip}>
            {[
              { val: paid,    color: 'var(--green)',  lbl: 'Paid' },
              { val: partial, color: 'var(--yellow)', lbl: 'Partial' },
              { val: missed,  color: 'var(--red)',    lbl: 'Missed' },
              { val: advance, color: '#38bdf8',       lbl: 'Advance' },
              { val: `${totalPaid >= 1000 ? Math.round(totalPaid/1000)+'k' : totalPaid}`,
                color: 'var(--accent)', lbl: 'Total Rs.' },
            ].map((item, i, arr) => (
              <div key={item.lbl} style={{display:'flex',alignItems:'center',flex:1}}>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryVal} style={{ color: item.color }}>{item.val}</div>
                  <div className={styles.summaryLbl}>{item.lbl}</div>
                </div>
                {i < arr.length - 1 && <div className={styles.summaryDivider} />}
              </div>
            ))}
          </div>
        )}

        {isConstructed && (
          <div className={styles.legend}>
            {[['var(--green)','Paid'],['var(--yellow)','Partial'],
              ['var(--red)','Missed'],['#38bdf8','Advance'],['var(--border)','N/A']
            ].map(([color, lbl]) => (
              <div key={lbl} className={styles.legendItem}>
                <span className={styles.dot} style={{background: color}}/>
                {lbl}
              </div>
            ))}
          </div>
        )}

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
              {visibleYears.map((y, rowIndex) => (
                <tr key={y}>
                  <td className={styles.tdYear}>{y}</td>
                  {QUARTERS.map(q => {
                    const qData  = payments[String(y)]?.[q]
                    const status = getCellStatus(qData, isConstructed, y, q,
                      h.firstPaymentYear, h.firstPaymentQuarter, currentQNum, h.cat)
                    return <PaymentCell key={q} status={status} qData={qData} rowIndex={rowIndex} />
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {h.status === 'Plot' && <p className={styles.plotNote}>⚠️ Plot only — fee collection does not apply.</p>}
        {isConstructed && !h.firstPaymentYear && <p className={styles.plotNote}>ℹ️ No payments recorded yet.</p>}
      </div>
    </>
  )
}

export default function HouseDetailPage({ params }: { params: { hid: string } }) {
  return <DataProvider><DetailScreen hid={decodeURIComponent(params.hid)} /></DataProvider>
}
