// Genera un template CSV/XLSX con solo i campi critici e
// alcune righe di esempio reale per contratti luce/gas.
// Uso: node scripts/genera_template_minimo.js

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function writeCsv(rows, outPath) {
  if (!rows || rows.length === 0) return;
  const headers = Array.from(
    rows.reduce((set, r) => { Object.keys(r).forEach(k => set.add(k)); return set; }, new Set())
  );
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

function generateTemplateRows() {
  // Campi critici per contratti con identificativi cliente minimi
  // - tipo_record: contratto_luce | contratto_gas
  // - commodity: luce | gas
  // - pod (luce) | pdr (gas)
  // - fornitore, numero_contratto, data_attivazione (YYYY-MM-DD)
  // - identificativi cliente minimi: nome, cognome, email_principale, codice_fiscale
  const rows = [
    {
      tipo_record: 'contratto_luce',
      commodity: 'luce',
      pod: 'IT001E12345678',
      fornitore: 'Enel Energia',
      numero_contratto: 'LUCE-0001',
      data_attivazione: '2024-01-15',
      nome: 'Mario',
      cognome: 'Rossi',
      email_principale: 'm.rossi@example.com',
      codice_fiscale: 'RSSMRA80A01H501Z'
    },
    {
      tipo_record: 'contratto_gas',
      commodity: 'gas',
      pdr: 'IT001G87654321',
      fornitore: 'Eni Plenitude',
      numero_contratto: 'GAS-0001',
      data_attivazione: '2024-02-01',
      nome: 'Luisa',
      cognome: 'Bianchi',
      email_principale: 'l.bianchi@example.com',
      codice_fiscale: 'BNCLSU85C41F205X'
    }
  ];
  return rows;
}

function main() {
  const outCsv = path.join(process.cwd(), 'template_minimo_contratti.csv');
  const outXlsx = path.join(process.cwd(), 'template_minimo_contratti.xlsx');
  const rows = generateTemplateRows();

  // CSV
  writeCsv(rows, outCsv);

  // XLSX
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TemplateMinimo');
  XLSX.writeFile(wb, outXlsx);

  console.log('✅ Template generati:');
  console.log(' -', outCsv);
  console.log(' -', outXlsx);
  console.log('\nCampi inclusi: tipo_record, commodity, pod/pdr, fornitore, numero_contratto, data_attivazione, nome, cognome, email_principale, codice_fiscale');
  console.log('Formato date consigliato: YYYY-MM-DD');
}

main();