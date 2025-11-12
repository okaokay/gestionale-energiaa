// Combina i due file forniti (XLSX super admin + CSV utente),
// genera un file unificato e lo invia all'endpoint /api/unified-import/upload
// Uso: node scripts/combine_and_import.js "<path_xlsx>" "<path_csv>"

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const axios = require('axios');
const FormData = require('form-data');
const { parse } = require('csv-parse/sync');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

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
  // Supporta DD/MM/YYYY, YYYY-MM-DD e seriali Excel
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const num = Number(s);
  if (!isNaN(num) && num > 20000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + num * 24 * 60 * 60 * 1000;
    const d = new Date(ms);
    return d.toISOString().slice(0, 10);
  }
  // Fallback: prova Date()
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function splitNominativo(nominativo) {
  const n = norm(nominativo);
  if (!n) return { nome: null, cognome: null, ragione_sociale: null };
  // Se contiene parole chiave tipiche azienda, usa ragione_sociale
  if (/srl|spa|sas|snc|coop|societa|società|impresa|ditta/i.test(n)) {
    return { nome: null, cognome: null, ragione_sociale: n };
  }
  const parts = n.split(/\s+/);
  if (parts.length === 1) return { nome: parts[0], cognome: null, ragione_sociale: null };
  return { nome: parts[0], cognome: parts.slice(1).join(' '), ragione_sociale: null };
}

function detectCommodity(row) {
  const u = (norm(row.utility) || norm(row.Utility) || norm(row.commodity) || norm(row.Commodity) || '').toLowerCase();
  if (u.includes('gas') || (norm(row.pdr) && !norm(row.pod))) return 'gas';
  if (u.includes('power') || u.includes('luce') || u.includes('elect')) return 'luce';
  // Pod/pdr heuristica
  if (norm(row.pod) || /pod/i.test(Object.keys(row).join(','))) return 'luce';
  if (norm(row.pdr) || /pdr/i.test(Object.keys(row).join(','))) return 'gas';
  return null;
}

function extractPodPdr(row) {
  return (
    norm(row.pod) ||
    norm(row.pod_pdr) ||
    norm(row.POD) ||
    norm(row.pod) ||
    norm(row.PDR) ||
    norm(row.pdr) ||
    norm(row.pdp) ||
    norm(row.PDP) ||
    null
  );
}

function looksLikePOD(value) {
  const v = String(value || '').trim().toUpperCase();
  if (!v) return false;
  // POD tipicamente inizia con IT e contiene una lettera E, lunghezza 14+
  return /^IT[0-9A-Z]{12,}$/.test(v) && v.includes('E');
}

function looksLikePDR(value) {
  const v = String(value || '').trim().toUpperCase();
  if (!v) return false;
  // PDR tipicamente inizia con IT e contiene una lettera G, lunghezza 14+
  return /^IT[0-9A-Z]{12,}$/.test(v) && v.includes('G');
}

function sanitizePlaceholders(obj) {
  // Rimuove valori che sembrano etichette/header accidentalmente finite nei dati
  const BAD_VALUES = new Set([
    'Comune residenza/sede legale',
    'Indirizzo Fornitura',
    'Indirizzo residenza/sede legale',
    'Provincia residenza/sede legale',
    'Consumo Annuale',
    'PDP'
  ]);
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'string' && BAD_VALUES.has(v.trim())) {
      obj[k] = null;
    }
  }
  return obj;
}

function mapExcelRow(row) {
  // Mappa colonne comuni dal file del super admin
  const nominativo = row['Nominativo Cliente'] || row['Nominativo'] || row['Cliente'] || null;
  const { nome, cognome, ragione_sociale } = splitNominativo(nominativo);

  const codiceFiscale = row['CF'] || row['Codice Fiscale'] || row['Codice fiscale'] || null;
  const partitaIVA = row['PI'] || row['Partita IVA'] || row['P.IVA'] || null;
  const email = row['Email'] || row['E-mail'] || row['EMAIL'] || null;
  const telefono = row['Telefono'] || row['Cellulare'] || row['Telefono Mobile'] || null;
  const indirizzo = row['Indirizzo'] || row['Via'] || null;
  const citta = row['Citta'] || row['Città'] || null;
  const cap = row['CAP'] || null;
  const provincia = row['Prov'] || row['Provincia'] || null;

  const commodity = detectCommodity(row);
  const podPdr = extractPodPdr(row);
  const fornitore = row['Utility'] || row['Fornitore'] || row['Supplier'] || row['fornitore'] || null;
  const numeroContratto = row['Codice Proposta'] || row['Numero contratto'] || row['numero_contratto'] || null;
  const dataStipula = normalizeDate(row['Data Stipula'] || row['Stipula'] || row['Data']);
  const dataAttivazione = normalizeDate(row['Data Attivazione'] || row['Attivazione']);
  const prezzoEnergia = row['Prezzo'] || row['Prezzo Energia'] || row['prezzo_energia'] || null;
  const prezzoGas = row['Prezzo Gas'] || row['prezzo_gas'] || null;

  return {
    tipo_record: null, // auto-detect lato backend
    modalita_import: 'unione_excel_sed',
    nome: norm(nome),
    cognome: norm(cognome),
    ragione_sociale: norm(ragione_sociale),
    codice_fiscale: norm(codiceFiscale),
    partita_iva: norm(partitaIVA),
    email_principale: norm(email),
    telefono_mobile: norm(telefono),
    via_residenza: norm(indirizzo),
    citta_residenza: norm(citta),
    cap_residenza: norm(cap),
    provincia_residenza: norm(provincia),
    commodity: norm(commodity),
    pod_pdr: norm(podPdr),
    pdp: norm(row['PDP']) || norm(row['pdp']) || null,
    pod: norm(row['pod']) || norm(row['POD']) || null,
    pdr: norm(row['pdr']) || norm(row['PDR']) || null,
    fornitore: norm(fornitore),
    numero_contratto: norm(numeroContratto),
    data_stipula: norm(dataStipula),
    data_attivazione: norm(dataAttivazione),
    prezzo_energia: norm(prezzoEnergia),
    prezzo_gas: norm(prezzoGas)
  };
}

function mapCsvRow(row) {
  // Prova a dedurre colonne dal CSV utente sed.csv
  const nominativo = row['Nominativo'] || row['Nominativo Cliente'] || row['Cliente'] || row['nome_cognome'] || null;
  const { nome, cognome, ragione_sociale } = splitNominativo(nominativo);
  const codiceFiscale = row['CF'] || row['codice_fiscale'] || row['cf'] || null;
  const partitaIVA = row['PI'] || row['partita_iva'] || null;
  const email = row['Email'] || row['email'] || row['email_principale'] || null;
  const telefono = row['Telefono'] || row['telefono'] || row['cell'] || null;
  const indirizzo = row['Indirizzo'] || row['via'] || row['indirizzo_residenza'] || null;
  const citta = row['Citta'] || row['citta'] || null;
  const cap = row['CAP'] || row['cap'] || null;
  const provincia = row['Provincia'] || row['provincia'] || null;
  const commodity = detectCommodity(row);
  const podPdr = extractPodPdr(row);
  const fornitore = row['Fornitore'] || row['utility'] || null;
  const numeroContratto = row['Numero_Contratto'] || row['numero_contratto'] || null;
  const dataStipula = normalizeDate(row['Data_Stipula'] || row['data_stipula']);
  const dataAttivazione = normalizeDate(row['Data_Attivazione'] || row['data_attivazione']);
  const prezzoEnergia = row['Prezzo_Energia'] || row['prezzo_energia'] || row['prezzo'] || null;
  const prezzoGas = row['Prezzo_Gas'] || row['prezzo_gas'] || null;

  return {
    tipo_record: null,
    modalita_import: 'unione_excel_sed',
    nome: norm(nome),
    cognome: norm(cognome),
    ragione_sociale: norm(ragione_sociale),
    codice_fiscale: norm(codiceFiscale),
    partita_iva: norm(partitaIVA),
    email_principale: norm(email),
    telefono_mobile: norm(telefono),
    via_residenza: norm(indirizzo),
    citta_residenza: norm(citta),
    cap_residenza: norm(cap),
    provincia_residenza: norm(provincia),
    commodity: norm(commodity),
    pod_pdr: norm(podPdr),
    fornitore: norm(fornitore),
    numero_contratto: norm(numeroContratto),
    data_stipula: norm(dataStipula),
    data_attivazione: norm(dataAttivazione),
    prezzo_energia: norm(prezzoEnergia),
    prezzo_gas: norm(prezzoGas)
  };
}

function mergeByKeys(records) {
  // Merge basato su chiavi forti: codice_fiscale, partita_iva, altrimenti email
  const idx = new Map();
  function keyOf(r) {
    return (
      r.codice_fiscale?.toLowerCase() ||
      r.partita_iva?.toLowerCase() ||
      r.email_principale?.toLowerCase() ||
      null
    );
  }
  const result = [];
  for (const r of records) {
    const k = keyOf(r);
    if (!k) { result.push(r); continue; }
    if (!idx.has(k)) {
      idx.set(k, r);
      result.push(r);
    } else {
      const t = idx.get(k);
      // Unisci campo per campo: mantieni esistente, riempi null con nuovo
      for (const [col, val] of Object.entries(r)) {
        if (t[col] === null || t[col] === undefined || t[col] === '') {
          t[col] = val;
        }
      }
    }
  }
  return result;
}

function cleanExploded(rows) {
  const cleaned = [];
  for (const r of rows) {
    const rec = sanitizePlaceholders({ ...r });
    if (rec.tipo_record === 'cliente_privato' || rec.tipo_record === 'cliente_azienda') {
      const hasIdentity = !!(norm(rec.codice_fiscale) || norm(rec.partita_iva) || (norm(rec.email_principale)) || (norm(rec.nome) && norm(rec.cognome)) || norm(rec.ragione_sociale));
      if (!hasIdentity) continue; // salta clienti senza identificativi minimi
      cleaned.push(rec);
      continue;
    }
    if (rec.tipo_record === 'contratto_luce') {
      // Assicurati che pod sia valorizzato
      let pod = norm(rec.pod);
      if (!pod && looksLikePOD(rec.pod_pdr)) pod = rec.pod_pdr;
      if (!pod && looksLikePOD(rec.pdp)) pod = rec.pdp; // alcuni fornitori usano PDP come POD
      if (!pod) continue; // senza POD non possiamo creare il contratto luce
      rec.pod = pod;
      // Normalizza data_attivazione
      rec.data_attivazione = normalizeDate(rec.data_attivazione) || normalizeDate(rec.data_stipula) || new Date().toISOString().slice(0, 10);
      cleaned.push(rec);
      continue;
    }
    if (rec.tipo_record === 'contratto_gas') {
      // Assicurati che pdr sia valorizzato
      let pdr = norm(rec.pdr);
      if (!pdr && looksLikePDR(rec.pod_pdr)) pdr = rec.pod_pdr;
      if (!pdr) continue; // senza PDR non possiamo creare il contratto gas
      rec.pdr = pdr;
      rec.data_attivazione = normalizeDate(rec.data_attivazione) || normalizeDate(rec.data_stipula) || new Date().toISOString().slice(0, 10);
      cleaned.push(rec);
      continue;
    }
    // ignora tipi sconosciuti
  }
  return cleaned;
}

function writeCsv(rows, outPath) {
  if (!rows || rows.length === 0) return;
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach(k => set.add(k));
      return set;
    }, new Set())
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

async function loginAdmin() {
  try {
    const resp = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: process.env.ADMIN_EMAIL || 'admin@gestionale.it',
      password: process.env.ADMIN_PASSWORD || 'Admin123!'
    });
    if (resp.data && resp.data.success) {
      return resp.data.data.token;
    }
  } catch (e) {
    console.log('⚠️  Login fallito o non richiesto:', e.message || e);
  }
  return null;
}

async function uploadUnified(filePath, token) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('options', JSON.stringify({ autoDetectType: true, batchSize: 200, skipValidation: false, skipAssociation: false }));
  const headers = form.getHeaders();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await axios.post(`${BASE_URL}/api/unified-import/upload`, form, { headers });
  return resp.data?.data?.importId || resp.data?.data?.id || null;
}

async function pollProgress(importId, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let lastStage = '';
  for (let i = 0; i < 120; i++) { // max ~4 minuti
    await new Promise(r => setTimeout(r, 2000));
    try {
      const prog = await axios.get(`${BASE_URL}/api/unified-import/progress/${importId}`, { headers });
      const p = prog.data?.data;
      if (p && p.stage !== lastStage) {
        console.log(`⏱️  Stato: ${p.stage} | ${p.progress}% - ${p.message}`);
        lastStage = p.stage;
      }
      if (p && p.stage === 'completed') break;
    } catch (e) {
      // continua
    }
  }
  const res = await axios.get(`${BASE_URL}/api/unified-import/result/${importId}`, { headers });
  return res.data?.data;
}

async function main() {
  const xlsxPath = process.argv[2];
  const csvPath = process.argv[3];
  if (!xlsxPath || !csvPath) {
    console.error('Uso: node scripts/combine_and_import.js "<path_xlsx>" "<path_csv>"');
    process.exit(1);
  }

  if (!fs.existsSync(xlsxPath)) {
    console.error('❌ File XLSX non trovato:', xlsxPath);
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error('❌ File CSV non trovato:', csvPath);
    process.exit(1);
  }

  console.log('📁 Leggo XLSX:', xlsxPath);
  const wb = XLSX.readFile(xlsxPath);
  const excelRows = [];
  wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name];
    const arr = XLSX.utils.sheet_to_json(ws, { defval: null });
    arr.forEach(r => excelRows.push(mapExcelRow(r)));
  });
  console.log(`✅ XLSX: ${excelRows.length} righe mappate`);

  console.log('📁 Leggo CSV:', csvPath);
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  // Rileva delimiter automaticamente (virgola o punto e virgola) e consenti righe irregolari
  const firstLine = csvContent.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';
  const csvRecords = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter, relax_column_count: true });
  const csvRows = csvRecords.map(mapCsvRow);
  console.log(`✅ CSV: ${csvRows.length} righe mappate`);

  // Unione e deduplica
  const merged = mergeByKeys([...excelRows, ...csvRows]);
  console.log(`🔗 Unione completata: ${merged.length} record unici`);

  // Esplode in più righe per tipo_record (cliente + eventuali contratti)
  const exploded = [];
  for (const r of merged) {
    const isAzienda = !!(r.ragione_sociale || r.partita_iva);
    const baseCliente = {
      modalita_import: r.modalita_import,
      nome: r.nome,
      cognome: r.cognome,
      ragione_sociale: r.ragione_sociale,
      codice_fiscale: r.codice_fiscale,
      partita_iva: r.partita_iva,
      email_principale: r.email_principale,
      telefono_mobile: r.telefono_mobile,
      via_residenza: r.via_residenza,
      citta_residenza: r.citta_residenza,
      cap_residenza: r.cap_residenza,
      provincia_residenza: r.provincia_residenza
    };
    exploded.push({ ...baseCliente, tipo_record: isAzienda ? 'cliente_azienda' : 'cliente_privato' });

    const commodity = (r.commodity || '').toLowerCase();
    const podPdr = r.pod_pdr || r.pod || r.pdr || r.pdp || null;
    const commonLink = {
      // chiavi per associare/creare cliente lato backend
      codice_fiscale: r.codice_fiscale,
      partita_iva: r.partita_iva,
      email_principale: r.email_principale,
      ragione_sociale: r.ragione_sociale,
      nome: r.nome,
      cognome: r.cognome
    };

    if (podPdr && (commodity.includes('luce') || commodity.includes('power') || commodity.includes('elect') || !!r.pod)) {
      exploded.push({
        tipo_record: 'contratto_luce',
        modalita_import: r.modalita_import,
        commodity: 'luce',
        pod_pdr: r.pod_pdr || r.pod,
        pod: r.pod || r.pod_pdr, // per compatibilità con rilevamento backend
        pdp: r.pdp,
        fornitore: r.fornitore,
        numero_contratto: r.numero_contratto,
        data_stipula: r.data_stipula,
        data_attivazione: r.data_attivazione,
        prezzo_energia: r.prezzo_energia,
        ...commonLink
      });
    }

    if (podPdr && (commodity.includes('gas') || !!r.pdr)) {
      exploded.push({
        tipo_record: 'contratto_gas',
        modalita_import: r.modalita_import,
        commodity: 'gas',
        pod_pdr: r.pod_pdr || r.pdr,
        pdr: r.pdr || r.pod_pdr, // per compatibilità con rilevamento backend
        pdp: r.pdp,
        fornitore: r.fornitore,
        numero_contratto: r.numero_contratto,
        data_stipula: r.data_stipula,
        data_attivazione: r.data_attivazione,
        prezzo_gas: r.prezzo_gas,
        ...commonLink
      });
    }
  }

  // Pulisce e garantisce campi essenziali
  const finalRows = cleanExploded(exploded);
  console.log(`🧹 Pulizia completata: ${finalRows.length} righe valide (da ${exploded.length})`);

  // Scrive CSV/XLSX unificati
  const outCsv = path.join(process.cwd(), 'combined_unified.csv');
  const outXlsx = path.join(process.cwd(), 'combined_unified.xlsx');
  writeCsv(finalRows, outCsv);
  const wsOut = XLSX.utils.json_to_sheet(finalRows);
  const wbOut = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbOut, wsOut, 'Unificato');
  XLSX.writeFile(wbOut, outXlsx);
  console.log('📝 File generati:');
  console.log('   -', outCsv);
  console.log('   -', outXlsx);

  // Upload al backend
  console.log('\n🚀 Avvio import via API...');
  const token = await loginAdmin();
  const importId = await uploadUnified(outCsv, token);
  if (!importId) {
    console.error('❌ Upload fallito o nessun importId restituito');
    process.exit(1);
  }
  console.log('📦 Import avviato. ID:', importId);
  const result = await pollProgress(importId, token);
  if (!result) {
    console.error('❌ Nessun risultato ottenuto');
    process.exit(1);
  }
  console.log('\n✅ Import completato');
  console.log('   Totale righe:', result.totalRows);
  console.log('   Processate:', result.processed);
  console.log('   Inseriti clienti_privati:', result.inserted?.clienti_privati);
  console.log('   Inseriti contratti_luce:', result.inserted?.contratti_luce);
  console.log('   Inseriti contratti_gas:', result.inserted?.contratti_gas);
  if (result.errors && result.errors.length) {
    console.log('   ❌ Errori:', result.errors.slice(0, 5));
  }

  // Se non sono stati creati contratti, prova un secondo pass solo per Excel
  if ((result.inserted?.contratti_luce || 0) === 0 && (result.inserted?.contratti_gas || 0) === 0) {
    const contracts = [];
    for (const r of excelRows) {
      const commodity = (r.commodity || '').toLowerCase();
      const podPdr = r.pod_pdr || r.pod || r.pdr || r.pdp || null;
      if (!podPdr) continue;
      const base = {
        modalita_import: r.modalita_import,
        codice_fiscale: r.codice_fiscale,
        email_principale: r.email_principale,
        nome: r.nome,
        cognome: r.cognome,
        ragione_sociale: r.ragione_sociale,
        fornitore: r.fornitore,
        numero_contratto: r.numero_contratto,
        data_stipula: r.data_stipula,
        data_attivazione: r.data_attivazione
      };
      if (commodity.includes('gas')) {
        contracts.push({ ...base, tipo_record: 'contratto_gas', commodity: 'gas', pod_pdr: podPdr, pdr: r.pdr || podPdr, prezzo_gas: r.prezzo_gas });
      } else {
        contracts.push({ ...base, tipo_record: 'contratto_luce', commodity: 'luce', pod_pdr: podPdr, pod: r.pod || podPdr, prezzo_energia: r.prezzo_energia });
      }
    }
    if (contracts.length > 0) {
      const outContracts = path.join(process.cwd(), 'contracts_from_excel.csv');
      writeCsv(contracts, outContracts);
      console.log('\n📝 Generato file contratti:', outContracts);
      const importId2 = await uploadUnified(outContracts, token);
      console.log('📦 Import contratti avviato. ID:', importId2);
      const res2 = await pollProgress(importId2, token);
      console.log('\n✅ Import contratti completato');
      console.log('   Totale righe:', res2.totalRows);
      console.log('   Processate:', res2.processed);
      console.log('   Inseriti contratti_luce:', res2.inserted?.contratti_luce);
      console.log('   Inseriti contratti_gas:', res2.inserted?.contratti_gas);
    } else {
      console.log('\nℹ️ Nessun contratto dedotto dai dati Excel (mancano commodity/pod_pdr).');
    }
  }
}

main().catch(err => {
  console.error('❌ Errore generale:', err?.message || err);
  process.exit(1);
});