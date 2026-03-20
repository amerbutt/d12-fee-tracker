import { NextResponse } from 'next/server'

const MONTH_MAP: Record<string, number> = {
  Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6,
  Jul:7, Aug:8, Sept:9, Sep:9, Oct:10, Nov:11, Dec:12
}

function parseDate(d: string): { year: number; month: number } | null {
  const m = d.match(/(\d+)-(\w+)-(\d+)/)
  if (!m) return null
  let year = parseInt(m[3])
  if (year < 100) year += 2000
  return { year, month: MONTH_MAP[m[2]] ?? 0 }
}

function getQuarter(month: number): string | null {
  if ([7,8,9].includes(month))   return 'Q1'
  if ([10,11,12].includes(month)) return 'Q2'
  if ([1,2,3].includes(month))   return 'Q3'
  if ([4,5,6].includes(month))   return 'Q4'
  return null
}

function parseCSV(text: string) {
  const lines = text.split('\n').filter(l => l.trim())
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

  return lines.slice(1).map(line => {
    // Handle quoted fields with commas inside
    const cols: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ }
      else if (line[i] === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += line[i]
    }
    cols.push(cur.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (cols[i] ?? '').replace(/^"|"$/g, '') })
    return row
  })
}

export async function GET() {
  try {
    const token    = process.env.GITHUB_TOKEN
    const username = process.env.GITHUB_USERNAME
    const repo     = process.env.GITHUB_REPO
    const filePath = process.env.GITHUB_FILE_PATH

    if (!token || !username || !repo || !filePath) {
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
    }

    // Fetch raw CSV from GitHub private repo using token
    const url = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`
    const ghRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3.raw',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      // No caching — always fresh
      cache: 'no-store'
    })

    if (!ghRes.ok) {
      return NextResponse.json({ error: `GitHub error: ${ghRes.status}` }, { status: 500 })
    }

    const csvText = await ghRes.text()
    const rows = parseCSV(csvText)

    // Build data structure
    type HouseData = {
      id: string
      sector: string
      street: string
      house: string
      name: string
      cell: string
      cat: number
      status: string
      payments: Record<string, Record<string, number>>
    }

    const housesMap: Record<string, HouseData> = {}
    const sectorsMap: Record<string, Record<string, Set<string>>> = {}

    for (const row of rows) {
      const sector = row['Sector']?.trim()
      const street = row['Street #']?.trim()
      const house  = row['House #']?.trim()
      const rid    = row['Resident _Id']?.trim()
      const date   = row['Date']?.trim()
      const amtStr = row['Amount']?.trim()
      const cat    = parseInt(row['Cat.'] ?? '0') || 0
      const status = row['Status']?.trim() ?? ''
      const name   = row['Name']?.trim() ?? ''
      const cell   = row['Cell #']?.trim() ?? ''

      if (!sector || !street || !house || !rid || !date) continue

      const parsed = parseDate(date)
      if (!parsed) continue
      const { year, month } = parsed
      const quarter = getQuarter(month)
      if (!quarter) continue

      const amount = parseInt(amtStr) || 0
      const yr = String(year)

      if (!housesMap[rid]) {
        housesMap[rid] = { id: rid, sector, street, house, name, cell, cat, status, payments: {} }
      }
      if (!housesMap[rid].payments[yr]) housesMap[rid].payments[yr] = {}
      housesMap[rid].payments[yr][quarter] = (housesMap[rid].payments[yr][quarter] ?? 0) + amount

      // Sectors index
      if (!sectorsMap[sector]) sectorsMap[sector] = {}
      if (!sectorsMap[sector][street]) sectorsMap[sector][street] = new Set()
      sectorsMap[sector][street].add(house)
    }

    // Convert Sets to arrays
    const sectors: Record<string, Record<string, string[]>> = {}
    for (const [s, streets] of Object.entries(sectorsMap)) {
      sectors[s] = {}
      for (const [st, houses] of Object.entries(streets)) {
        sectors[s][st] = Array.from(houses)
      }
    }

    return NextResponse.json({ sectors, houses: housesMap })

  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
