// Valida e ripulisce i file combined_unified.csv/xlsx esistenti
// Uso: node scripts/validate_unified_file.js [path_csv] [path_xlsx]

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { parse } = require('csv-parse/sync');

function norm(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return v;
}

function normalizeDate(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function looksLikePOD(v) {
  const s = String(v || '').trim().toUpperCase();
  return s && /^IT[0-9A-Z]{12,}$/.test(s) && s.includes('E');
}
function looksLikePDR(v) {
  const s = String(v || '').trim().toUpperCase();
  return s && /^IT[0-9A-Z]{12,}$/.test(s) && s.includes('G');
}

function sanitizePlaceholders(obj) {
  const BAD = new Set([
    'Comune residenza/sede legale',
    'Indirizzo Fornitura',
    'Indirizzo residenza/sede legale',
    'Provincia residenza/sede legale',
    'Consumo Annuale',
    'PDP'
  ]);
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'string' && BAD.has(v.trim())) obj[k] = null;
  }
  return obj;
}

function writeCsv(rows, outPath) {
  if (!rows || rows.length === 0) return;
  const headers = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach(k => set.add(k)); return set; }, new Set()));
  const lines = [headers.join(',')];
  for (const r of rows) {
    const vals = headers.map(h => {
      const v = r[h] ?? '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    });
    lines.push(vals.join(','));
  }
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
}

function clean(rows) {
  const out = [];
  const issues = [];
  let kept = 0, dropped = 0;
  rows.forEach((r, idx) => {
    const rec = sanitizePlaceholders({ ...r });
    const tipo = String(rec.tipo_record || '').trim();
    if (tipo === 'cliente_privato' || tipo === 'cliente_azienda') {
      const ok = !!(norm(rec.codice_fiscale) || norm(rec.partita_iva) || norm(rec.email_principale) || (norm(rec.nome) && norm(rec.cognome)) || norm(rec.ragione_sociale));
      if (!ok) {
        dropped++;
        issues.push({ row: idx + 1, reason: 'cliente senza identificativi minimi' });
        return;
      }
      out.push(rec); kept++;
      return;
    }
    if (tipo === 'contratto_luce') {
      let pod = norm(rec.pod);
      if (!pod && looksLikePOD(rec.pod_pdr)) pod = rec.pod_pdr;
      if (!pod && looksLikePOD(rec.pdp)) pod = rec.pdp;
      if (!pod) { dropped++; issues.push({ row: idx + 1, reason: 'contratto_luce senza POD' }); return; }
      rec.pod = pod;
      rec.data_attivazione = normalizeDate(rec.data_attivazione) || normalizeDate(rec.data_stipula) || new Date().toISOString().slice(0, 10);
      out.push(rec); kept++;
      return;
    }
    if (tipo === 'contratto_gas') {
      let pdr = norm(rec.pdr);
      if (!pdr && looksLikePDR(rec.pod_pdr)) pdr = rec.pod_pdr;
      if (!pdr) { dropped++; issues.push({ row: idx + 1, reason: 'contratto_gas senza PDR' }); return; }
      rec.pdr = pdr;
      rec.data_attivazione = normalizeDate(rec.data_attivazione) || normalizeDate(rec.data_stipula) || new Date().toISOString().slice(0, 10);
      out.push(rec); kept++;
      return;
    }
    dropped++; issues.push({ row: idx + 1, reason: `tipo_record non gestito: ${tipo || 'vuoto'}` });
  });
  return { rows: out, kept, dropped, issues };
}

function readCombinedCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const recs = parse(content, { columns: true, skip_empty_lines: true, relax_column_count: true });
  return recs;
}

function readCombinedXlsx(filePath) {
  const wb = XLSX.readFile(filePath);
  const all = [];
  wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name];
    const arr = XLSX.utils.sheet_to_json(ws, { defval: null });
    all.push(...arr);
  });
  return all;
}

async function main() {
  const csvPath = process.argv[2] || path.join(process.cwd(), 'combined_unified.csv');
  const xlsxPath = process.argv[3] || path.join(process.cwd(), 'combined_unified.xlsx');
  const hasCsv = fs.existsSync(csvPath);
  const hasXlsx = fs.existsSync(xlsxPath);
  if (!hasCsv && !hasXlsx) {
    console.error('❌ Nessun combined_unified.* trovato. Specifica i percorsi o genera i file prima.');
    process.exit(1);
  }

  const inputRows = hasCsv ? readCombinedCsv(csvPath) : readCombinedXlsx(xlsxPath);
  console.log(`📄 Righe lette: ${inputRows.length}`);
  const { rows, kept, dropped, issues } = clean(inputRows);
  console.log(`🧹 Pulite: tenute=${kept}, scartate=${dropped}`);
  if (issues.length) {
    console.log('⚠️  Problemi riscontrati (prime 20):');
    issues.slice(0, 20).forEach(i => console.log(` - riga ${i.row}: ${i.reason}`));
  }

  const outCsv = path.join(process.cwd(), 'combined_unified.cleaned.csv');
  const outXlsx = path.join(process.cwd(), 'combined_unified.cleaned.xlsx');
  writeCsv(rows, outCsv);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cleaned');
  XLSX.writeFile(wb, outXlsx);
  console.log('📝 File ripuliti generati:');
  console.log('   -', outCsv);
  console.log('   -', outXlsx);
}

main().catch(err => { console.error('❌ Errore:', err?.message || err); process.exit(1); });