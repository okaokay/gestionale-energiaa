/**
 * Script: build_unified_from_esempio_excel.js
 * Scopo: Legge l'Excel fornito dal super admin (esempio import cvs.xlsx)
 *        e genera un file UNICO con tutte le colonne richieste:
 *        - Le colonne attuali del DB
 *        - Le colonne del file del super admin
 * Output: ./esempio_unificato.xlsx e ./esempio_unificato.csv
 * Uso:    node scripts/build_unified_from_esempio_excel.js [input.xlsx] [output.xlsx]
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Colonne attuali del DB (ordine richiesto)
const MY_COLUMNS = [
  'modalita_import',
  'nome',
  'cognome',
  'codice_fiscale',
  'data_nascita',
  'email_principale',
  'telefono_mobile',
  'via_residenza',
  'civico_residenza',
  'cap_residenza',
  'citta_residenza',
  'provincia_residenza',
  'ragione_sociale',
  'partita_iva',
  'codice_ateco',
  'pec_aziendale',
  'numero_contratto',
  'pod',
  'pdr',
  'fornitore',
  'data_attivazione',
  'data_scadenza',
  'prezzo_energia',
  'prezzo_gas',
  'stato_contratto',
  'agente_email',
  'agente_nome',
  'assigned_agent_id',
  'commissione_luce',
  'commissione_gas',
  'commissione_pattuita',
  'stato_cliente',
];

// Colonne del super admin (ordine richiesto)
const ADMIN_COLUMNS = [
  'Agenzia',
  'Agente/Owner proposta',
  'Utility',
  'Tipo cliente',
  'Codice ATECO1',
  'Codice ATECO2',
  'Codice Proposta',
  'Tipo Proposta',
  'Stato Proposta',
  'Data Stipula',
  'Data Decorrenza',
  'Diritto di ripensamento',
  'Nome Offerta',
  'Codice Cliente',
  'Nominativo Cliente',
  'PIVA',
  'CF',
  'Indirizzo residenza/sede legale',
  'Comune residenza/sede legale',
  'Provincia residenza/sede legale',
  'Indirizzo Fornitura',
  'Comune Fornitura',
  'Provincia Fornitura',
  'PDP',
  'Consumo Annuale',
  'Tipo uso EE',
  'ENE Potenza Disponibile',
  'GAS Tipologia Utenza',
  'GAS Categoria Uso',
  'Frequenza di fatturazione',
  'Termini di Pagamento',
  'Modalita di spedizione',
  'Mail Fatturazione',
  'Indirizzo Fatturazione',
  'Comune Fatturazione',
  'Provincia Fatturazione',
  'Metodo Pagamento',
  'Codice Procedura',
  'Stato Procedura',
  'Motivazione inammissibilita',
  'Stato contratto',
];

// Unione colonne: prima le nostre, poi le sue (evitando duplicati esatti)
const ALL_COLUMNS = [...MY_COLUMNS, ...ADMIN_COLUMNS.filter(c => !MY_COLUMNS.includes(c))];

function normalizeString(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function normalizeDate(v) {
  if (v === null || v === undefined || v === '') return '';
  // Gestione seriale Excel
  if (typeof v === 'number') {
    const date = XLSX.SSF.parse_date_code(v);
    if (!date) return '';
    const yyyy = String(date.y).padStart(4, '0');
    const mm = String(date.m).padStart(2, '0');
    const dd = String(date.d).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  // Stringa: prova a normalizzare (gg/mm/aaaa, aaaa-mm-gg, ecc.)
  const s = normalizeString(v)
    .replace(/\./g, '/')
    .replace(/\s+/g, ' ');
  // dd/mm/yyyy
  const m1 = s.match(/^([0-3]?\d)[/.-]([0-1]?\d)[/.-](\d{2,4})$/);
  if (m1) {
    const dd = m1[1].padStart(2, '0');
    const mm = m1[2].padStart(2, '0');
    let yyyy = m1[3];
    if (yyyy.length === 2) yyyy = `20${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  }
  // yyyy-mm-dd
  const m2 = s.match(/^(\d{4})[-/.]([0-1]?\d)[-/.]([0-3]?\d)$/);
  if (m2) {
    const yyyy = m2[1];
    const mm = m2[2].padStart(2, '0');
    const dd = m2[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return s; // fallback
}

function splitName(nominativo, isCompany) {
  const name = normalizeString(nominativo);
  if (!name) return { nome: '', cognome: '', ragione_sociale: '' };
  if (isCompany) return { nome: '', cognome: '', ragione_sociale: name };
  // Formati: "Cognome, Nome" oppure "Nome Cognome"
  if (name.includes(',')) {
    const [cognome, nome] = name.split(',').map(s => s.trim());
    return { nome: nome || '', cognome: cognome || '', ragione_sociale: '' };
  }
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return { nome: parts[0], cognome: '', ragione_sociale: '' };
  const nome = parts[0];
  const cognome = parts.slice(1).join(' ');
  return { nome, cognome, ragione_sociale: '' };
}

function parseAddress(addrStr) {
  const addr = normalizeString(addrStr);
  if (!addr) return { via: '', civico: '', cap: '' };
  // Estrai CAP (5 cifre)
  const capMatch = addr.match(/\b(\d{5})\b/);
  const cap = capMatch ? capMatch[1] : '';
  // Estrai civico (numero con eventuale lettera)
  const civicoMatch = addr.match(/\b(\d{1,4}[A-Za-z]?)\b/);
  const civico = civicoMatch ? civicoMatch[1] : '';
  // Via: rimuovi civico e cap
  let via = addr
    .replace(capMatch ? capMatch[0] : '', '')
    .replace(civicoMatch ? civicoMatch[0] : '', '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { via, civico, cap };
}

function chooseAteco(a1, a2) {
  const v1 = normalizeString(a1);
  const v2 = normalizeString(a2);
  return v1 || v2 || '';
}

function mapToDBFields(row) {
  const out = Object.fromEntries(ALL_COLUMNS.map(c => [c, '']));

  // Copia diretta delle colonne admin (se presenti)
  for (const key of ADMIN_COLUMNS) {
    if (row[key] !== undefined) out[key] = normalizeString(row[key]);
  }

  // Derivazioni verso le nostre colonne
  out.modalita_import = 'xlsx_unificato';
  out.fornitore = normalizeString(row['Utility'] || out.fornitore);
  out.codice_ateco = chooseAteco(row['Codice ATECO1'], row['Codice ATECO2']);
  out.numero_contratto = normalizeString(row['Codice Proposta']);
  out.data_attivazione = normalizeDate(row['Data Stipula']);
  out.data_scadenza = normalizeDate(row['Data Decorrenza']);
  out.email_principale = normalizeString(row['Mail Fatturazione']);
  out.stato_contratto = normalizeString(row['Stato contratto'] || out.stato_contratto);

  const cf = normalizeString(row['CF']);
  const piva = normalizeString(row['PIVA']);
  out.codice_fiscale = cf;
  out.partita_iva = piva;

  const tipoCliente = normalizeString(row['Tipo cliente']).toLowerCase();
  const isCompany = !!piva || ['azienda', 'impresa', 'business', 'societa', 'società'].some(t => tipoCliente.includes(t));
  const { nome, cognome, ragione_sociale } = splitName(row['Nominativo Cliente'], isCompany);
  out.nome = nome;
  out.cognome = cognome;
  out.ragione_sociale = ragione_sociale;

  const addr = parseAddress(row['Indirizzo residenza/sede legale']);
  out.via_residenza = addr.via;
  out.civico_residenza = addr.civico;
  out.cap_residenza = addr.cap;
  out.citta_residenza = normalizeString(row['Comune residenza/sede legale']);
  out.provincia_residenza = normalizeString(row['Provincia residenza/sede legale']);

  // POD/PDR dedotti da PDP + indicatori
  const pdp = normalizeString(row['PDP']);
  const hasEE = normalizeString(row['Tipo uso EE']);
  const hasGas = normalizeString(row['GAS Tipologia Utenza']) || normalizeString(row['GAS Categoria Uso']);
  if (pdp) {
    if (hasGas && !hasEE) {
      out.pdr = pdp;
    } else {
      out.pod = pdp; // default luce
    }
  }

  // Agente nome
  out.agente_nome = normalizeString(row['Agente/Owner proposta']);
  // Altri campi lasciati vuoti (non presenti nell'excel):
  // telefono_mobile, prezzo_energia, prezzo_gas, agente_email, assigned_agent_id,
  // commissione_luce, commissione_gas, commissione_pattuita, stato_cliente, pec_aziendale.

  // Allineamento duplicato: se "Stato contratto" (admin) esiste ma il nostro è vuoto, copia
  if (!out.stato_contratto && out['Stato contratto']) {
    out.stato_contratto = out['Stato contratto'];
  }

  return out;
}

function readAllRowsFromWorkbook(wb) {
  const rows = [];
  const sheetNames = wb.SheetNames || [];
  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const js = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
    for (const r of js) rows.push(r);
  }
  return rows;
}

function buildOutputRows(rows) {
  return rows.map(mapToDBFields);
}

function writeExcelAndCsv(outputRows, outputXlsxPath, outputCsvPath) {
  // Scrivi XLSX
  const wb = XLSX.utils.book_new();
  const sheetData = outputRows.map(r => {
    const o = {};
    for (const col of ALL_COLUMNS) o[col] = r[col] ?? '';
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(sheetData, { header: ALL_COLUMNS });
  XLSX.utils.book_append_sheet(wb, ws, 'Unificato');
  XLSX.writeFile(wb, outputXlsxPath);

  // Scrivi CSV (UTF-8)
  const escapeCsv = (val) => {
    const v = val === null || val === undefined ? '' : String(val);
    if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  };
  const lines = [];
  lines.push(ALL_COLUMNS.join(','));
  for (const row of outputRows) {
    lines.push(ALL_COLUMNS.map(c => escapeCsv(row[c] ?? '')).join(','));
  }
  fs.writeFileSync(outputCsvPath, lines.join('\n'), 'utf8');
}

function main() {
  const inputPath = process.argv[2] || path.resolve(process.cwd(), 'esempio import cvs.xlsx');
  const outputXlsx = process.argv[3] || path.resolve(process.cwd(), 'esempio_unificato.xlsx');
  const outputCsv = path.resolve(process.cwd(), 'esempio_unificato.csv');

  if (!fs.existsSync(inputPath)) {
    console.error('File di input non trovato:', inputPath);
    process.exit(1);
  }

  console.log('Leggo workbook:', inputPath);
  const wb = XLSX.readFile(inputPath);
  const inputRows = readAllRowsFromWorkbook(wb);
  console.log('Righe lette:', inputRows.length);

  const outputRows = buildOutputRows(inputRows);
  console.log('Righe elaborate:', outputRows.length);

  writeExcelAndCsv(outputRows, outputXlsx, outputCsv);
  console.log('File generati:');
  console.log(' -', outputXlsx);
  console.log(' -', outputCsv);
}

if (require.main === module) {
  main();
}