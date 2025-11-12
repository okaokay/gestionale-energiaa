// Quick test script to validate the universal CSV structure and parsing
// Usage: node test_unified_parser.js <path-to-csv>

const fs = require('fs');

function parseCsvSimple(content) {
  let lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], records: [] };
  const firstLineClean = lines[0].replace(/^\uFEFF/, '').trim();
  if (/^sep\s*=\s*[,;\t]$/i.test(firstLineClean)) {
    lines = lines.slice(1);
  }
  if (lines.length < 2) return { headers: [], records: [] };
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = headerLine.split(',').map(h => h.trim().replace(/(^"|"$)/g, ''));
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    let raw = lines[i];
    if (!raw.trim()) continue;
    raw = raw.replace(/^\uFEFF/, '');
    const values = raw.split(',').map(v => v.trim().replace(/(^"|"$)/g, ''));
    const rec = {};
    headers.forEach((h, idx) => {
      rec[h] = values[idx] || '';
    });
    records.push(rec);
  }
  return { headers, records };
}

function detectRecordType(rec) {
  const t = (rec.tipo_record || rec.cliente_tipo || rec.tipo || '').toLowerCase();
  if (t.includes('privat')) return 'cliente_privato';
  if (t.includes('aziend')) return 'cliente_azienda';
  if (t.includes('luce')) return 'contratto_luce';
  if (t.includes('gas')) return 'contratto_gas';
  if (rec.pod || rec.contratto_luce_pod) return 'contratto_luce';
  if (rec.pdr || rec.contratto_gas_pdr) return 'contratto_gas';
  if (rec.codice_fiscale || rec.email_principale || rec.cliente_email) return 'cliente_privato';
  return 'unknown';
}

function main() {
  const file = process.argv[2] || 'd:/Progetti/dfgh - Copia - Copia con import avanzato ma file sporchi - Copia - Copia/export_universale_clienti_contratti_2025-10-30.csv';
  const content = fs.readFileSync(file, 'utf8');
  const { headers, records } = parseCsvSimple(content);
  const counts = { cliente_privato: 0, cliente_azienda: 0, contratto_luce: 0, contratto_gas: 0, unknown: 0 };
  for (const r of records) {
    const tipo = detectRecordType(r);
    counts[tipo] = (counts[tipo] || 0) + 1;
  }
  console.log('Headers:', headers);
  console.log('Total records:', records.length);
  console.log('Counts:', counts);
  console.log('First 2 records sample:', records.slice(0, 2));
}

main();