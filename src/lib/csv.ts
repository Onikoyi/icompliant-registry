export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    // Minimal CSV parser that supports commas, quoted fields, and newlines.
    // For demo: good enough; later we can swap to a robust library if needed.
    const lines: string[] = []
    let cur = ''
    let inQuotes = false
  
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      const next = text[i + 1]
  
      if (ch === '"' && inQuotes && next === '"') {
        cur += '"'
        i++
        continue
      }
  
      if (ch === '"') {
        inQuotes = !inQuotes
        continue
      }
  
      if (ch === '\n' && !inQuotes) {
        lines.push(cur.replace(/\r$/, ''))
        cur = ''
        continue
      }
  
      cur += ch
    }
    if (cur.trim().length) lines.push(cur.replace(/\r$/, ''))
  
    const splitRow = (row: string) => {
      const out: string[] = []
      let cell = ''
      let q = false
  
      for (let i = 0; i < row.length; i++) {
        const ch = row[i]
        const next = row[i + 1]
  
        if (ch === '"' && q && next === '"') {
          cell += '"'
          i++
          continue
        }
        if (ch === '"') {
          q = !q
          continue
        }
        if (ch === ',' && !q) {
          out.push(cell.trim())
          cell = ''
          continue
        }
        cell += ch
      }
      out.push(cell.trim())
      return out
    }
  
    if (lines.length === 0) return { headers: [], rows: [] }
  
    const headers = splitRow(lines[0]).map((h) => h.trim())
    const rows = lines.slice(1).filter((l) => l.trim().length).map((l) => {
      const cells = splitRow(l)
      const obj: Record<string, string> = {}
      for (let i = 0; i < headers.length; i++) obj[headers[i]] = cells[i] ?? ''
      return obj
    })
  
    return { headers, rows }
  }