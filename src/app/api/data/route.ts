import { NextResponse } from 'next/server'

const MONTH_MAP: Record<string, number> = {
  Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6,
  Jul:7, Aug:8, Sept:9, Sep:9, Oct:10, Nov:11, Dec:12
}

function getCalendarQuarter(month: number): string | null {
  if ([1,2,3].includes(month))    return 'Q1'
  if ([4,5,6].includes(month))    return 'Q2'
  if ([7,8,9].includes(month))    return 'Q3'
  if ([10,11,12].includes(month)) return 'Q4'
  return null
}

function parseDate(d: string): { year: number; month: number } | null {
  const m = d.match(/(\d+)-(\w+)-(\d+)/)
  if (!m) return null
  let year = parseInt(m[3])
  if (year < 100) year += 2000
  const month = MONTH_MAP[m[2]] ?? 0
  if (!month) return null
  return { year, month }
}

function quarterToNum(year: number, q: string): number {
  return year * 4 + parseInt(q[1])
}

function splitCSVLine(line: string): string[] {
  const cols: string[] = []
  let cur = '', inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { cols.push(cur); cur = '' }
    else cur += ch
  }
  cols.push(cur)
  return cols
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const headers = splitCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const cols = splitCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h.trim()] = (cols[i] ?? '').trim() })
    return row
  })
}

// 5-minute server cache
let cache: unknown = null
let cacheTime = 0
const CACHE_MS = 5 * 60 * 1000

export async function GET() {
  try {
    if (cache && Date.now() - cacheTime < CACHE_MS) {
      return NextResponse.json(cache)
    }

    const token    = process.env.GITHUB_TOKEN
    const username = process.env.GITHUB_USERNAME
    const repo     = process.env.GITHUB_REPO
    const filePath = process.env.GITHUB_FILE_PATH

    if (!token || !username || !repo || !filePath) {
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
    }

    const url = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`
    const ghRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3.raw',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      cache: 'no-store'
    })

    if (!ghRes.ok) {
      return NextResponse.json({ error: `GitHub error: ${ghRes.status}` }, { status: 500 })
    }

    const csvText = await ghRes.text()
    const rows = parseCSV(csvText)

    type HouseData = {
      id: string; sector: string; street: string; house: string
      name: string; cat: number; status: string
      firstPaymentYear: number | null; firstPaymentQuarter: string | null
      payments: Record<string, Record<string, number>>
    }

    const housesMap: Record<string, HouseData> = {}
    const rawPayments: Record<string, { yr: number; q: string; amount: number }[]> = {}

    for (const row of rows) {
      const sector = row['Sector']?.trim()
      const street = row['Street #']?.trim()
      const house  = row['House #']?.trim()
      const rid    = row['Resident _Id']?.trim()
      const date   = row['Date']?.trim()
      const amt    = parseInt(row['Amount']?.trim() ?? '0') || 0
      const cat    = parseInt(row['Cat.']?.trim() ?? '0') || 0
      const status = row['Status']?.trim() ?? ''
      const name   = row['Name']?.trim() ?? ''

      if (!sector || !street || !house || !rid || !date) continue
      const parsed = parseDate(date)
      if (!parsed) continue
      const { year, month } = parsed
      const quarter = getCalendarQuarter(month)
      if (!quarter) continue

      if (!housesMap[rid]) {
        housesMap[rid] = {
          id: rid, sector, street, house,
          name: (name && name !== 'nan') ? name : '',
          cat, status,
          firstPaymentYear: null, firstPaymentQuarter: null,
          payments: {}
        }
        rawPayments[rid] = []
      }

      const yr = String(year)
      if (!housesMap[rid].payments[yr]) housesMap[rid].payments[yr] = {}
      housesMap[rid].payments[yr][quarter] =
        (housesMap[rid].payments[yr][quarter] ?? 0) + amt

      rawPayments[rid].push({ yr: year, q: quarter, amount: amt })
    }

    // Find first non-zero payment
    for (const [rid, pmts] of Object.entries(rawPayments)) {
      const nonZero = pmts
        .filter(p => p.amount > 0)
        .sort((a, b) => quarterToNum(a.yr, a.q) - quarterToNum(b.yr, b.q))
      if (nonZero.length > 0) {
        housesMap[rid].firstPaymentYear    = nonZero[0].yr
        housesMap[rid].firstPaymentQuarter = nonZero[0].q
      }
    }

    // Build sectors index
    const sectorsRaw: Record<string, Record<string, Set<string>>> = {}
    for (const h of Object.values(housesMap)) {
      if (!sectorsRaw[h.sector]) sectorsRaw[h.sector] = {}
      if (!sectorsRaw[h.sector][h.street]) sectorsRaw[h.sector][h.street] = new Set()
      sectorsRaw[h.sector][h.street].add(h.house)
    }

    const sectors: Record<string, Record<string, string[]>> = {}
    for (const [s, streets] of Object.entries(sectorsRaw)) {
      sectors[s] = {}
      for (const [st, houses] of Object.entries(streets)) {
        sectors[s][st] = Array.from(houses).sort((a, b) => {
          const na = parseFloat(a), nb = parseFloat(b)
          return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b)
        })
      }
    }

    const result = { sectors, houses: housesMap, lastUpdated: Date.now() }
    cache = result
    cacheTime = Date.now()

    return NextResponse.json(result)

  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
