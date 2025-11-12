'use strict';
// Node script to generate a complete template CSV/XLSX based on an example Excel,
// adding missing columns and normalizing key fields.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const INPUT_XLSX = path.resolve(__dirname, '..', 'esempio import cvs.xlsx');
const OUTPUT_CSV = path.resolve(__dirname, '..', 'template_completo_contratti_corretto.csv');
const OUTPUT_XLSX = path.resolve(__dirname, '..', 'template_completo_contratti_corretto.xlsx');

function normalizeHeader(h) {
  if (!h) return '';
  const s = String(h).trim().toLowerCase();
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\/\s*/g, '_')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

function mapSynonym(key) {
  if (!key || typeof key !== 'string') return null;
  const k = normalizeHeader(key);
  
  const synonyms = {
    'tipo_record': ['tipo_record', 'tipo', 'record_type'],
    'modalita_import': ['modalita_import', 'modalita', 'import_mode'],
    'nome': ['nome', 'name', 'first_name', 'nome_cliente', 'nominativo_cliente'],
    'cognome': ['cognome', 'surname', 'last_name', 'cognome_cliente'],
    'codice_fiscale': ['codice_fiscale', 'cf', 'fiscal_code', 'tax_code', 'codicefiscale'],
    'data_nascita': ['data_nascita', 'birth_date', 'date_of_birth'],
    'email_principale': ['email_principale', 'email', 'main_email', 'email_primaria', 'mail_fatturazione', 'e_mail', 'mail'],
    'telefono_mobile': ['telefono_mobile', 'mobile', 'cellulare', 'phone'],
    'via_residenza': ['via_residenza', 'indirizzo', 'address', 'via', 'indirizzo_residenza_sede_legale'],
    'civico_residenza': ['civico_residenza', 'civico', 'number'],
    'cap_residenza': ['cap_residenza', 'cap', 'postal_code'],
    'citta_residenza': ['citta_residenza', 'citta', 'city', 'comune', 'comune_residenza_sede_legale'],
    'provincia_residenza': ['provincia_residenza', 'provincia', 'province', 'provincia_residenza_sede_legale'],
    'ragione_sociale': ['ragione_sociale', 'company_name', 'business_name', 'ragionesociale'],
    'partita_iva': ['partita_iva', 'piva', 'vat_number'],
    'codice_ateco': ['codice_ateco', 'ateco', 'ateco_code'],
    'pec_aziendale': ['pec_aziendale', 'pec', 'certified_email'],
    'numero_contratto': ['numero_contratto', 'contratto', 'contract_number', 'n_contratto'],
    'pod': ['pod', 'point_of_delivery'],
    'pdr': ['pdr', 'point_of_redelivery', 'pdp'],
    'fornitore': ['fornitore', 'supplier', 'provider', 'venditore'],
    'data_attivazione': ['data_attivazione', 'activation_date', 'start_date', 'data_decorrenza', 'data_inizio'],
    'data_scadenza': ['data_scadenza', 'expiry_date', 'end_date'],
    'prezzo_energia': ['prezzo_energia', 'energy_price', 'prezzo_luce'],
    'prezzo_gas': ['prezzo_gas', 'gas_price'],
    'stato_contratto': ['stato_contratto', 'contract_status', 'status', 'stato_procedura'],
    'agente_email': ['agente_email', 'agent_email'],
    'agente_nome': ['agente_nome', 'agent_name'],
    'assigned_agent_id': ['assigned_agent_id', 'agent_id'],
    'commissione_luce': ['commissione_luce', 'light_commission'],
    'commissione_gas': ['commissione_gas', 'gas_commission'],
    'commissione_pattuita': ['commissione_pattuita', 'agreed_commission'],
    'stato_cliente': ['stato_cliente', 'customer_status'],
    'commodity': ['commodity', 'tipo_energia', 'energy_type', 'prodotto', 'energia', 'tipo_commodity'],
     'pod_pdr': ['pod_pdr', 'point_code', 'pdp'],
     // Mappature specifiche per i campi del fornitore
     'codice_cliente': ['codice_cliente', 'customer_code'],
     'consumo_annuale': ['consumo_annuale', 'annual_consumption'],
     'tipo_uso_ee': ['tipo_uso_ee', 'electricity_use_type'],
     'ene_potenza_disponibile': ['ene_potenza_disponibile', 'available_power'],
     'gas_tipologia_utenza': ['gas_tipologia_utenza', 'gas_user_type'],
     'gas_categoria_uso': ['gas_categoria_uso', 'gas_use_category'],
     'frequenza_fatturazione': ['frequenza_fatturazione', 'billing_frequency'],
     'termini_pagamento': ['termini_pagamento', 'payment_terms'],
     'modalita_spedizione': ['modalita_spedizione', 'shipping_method'],
     'indirizzo_fatturazione': ['indirizzo_fatturazione', 'billing_address'],
     'comune_fatturazione': ['comune_fatturazione', 'billing_city'],
     'provincia_fatturazione': ['provincia_fatturazione', 'billing_province'],
     'metodo_pagamento': ['metodo_pagamento', 'payment_method'],
     'codice_procedura': ['codice_procedura', 'procedure_code'],
     'motivazione_inammissibilita': ['motivazione_inammissibilita', 'inadmissibility_reason'],
     'diritto_ripensamento': ['diritto_ripensamento', 'right_of_withdrawal'],
     'nome_offerta': ['nome_offerta', 'offer_name'],
     'indirizzo_fornitura': ['indirizzo_fornitura', 'supply_address'],
     'comune_fornitura': ['comune_fornitura', 'supply_city'],
     'provincia_fornitura': ['provincia_fornitura', 'supply_province']
   };
   
   for (const [canonical, variants] of Object.entries(synonyms)) {
     if (variants.includes(k)) return canonical;
   }
   
   return k;
}

function cleanValue(v) {
  if (v == null) return '';
  let s = String(v).trim();
  if (!s) return '';
  // Remove common placeholders
  const placeholders = new Set(['x', 'xx', 'xxx', '-', 'n/a', 'na', 'null', 'undefined', 'vuoto', 'manca', 'missing']);
  if (placeholders.has(s.toLowerCase())) return '';
  return s;
}

function detectPod(val) {
  const s = cleanValue(val).toUpperCase();
  if (!s) return '';
  if (s.startsWith('POD')) return s.replace(/^POD[:\s-]*/, '');
  // Simplistic POD heuristic: alphanumeric, length >= 14, contains letters
  if (/^[A-Z0-9]{14,40}$/.test(s) && /[A-Z]/.test(s)) return s;
  return '';
}
function detectPdr(val) {
  const s = cleanValue(val).toUpperCase();
  if (!s) return '';
  if (s.startsWith('PDR')) return s.replace(/^PDR[:\s-]*/, '');
  // PDR heuristic: numeric string length >= 10
  if (/^[0-9]{10,40}$/.test(s)) return s;
  return '';
}

function deriveCommodity(rec) {
  const c = cleanValue(rec.commodity).toLowerCase();
  if (c.includes('luce') || c.includes('ee') || c.includes('energia elettrica')) return 'LUCE';
  if (c.includes('gas')) return 'GAS';
  if (cleanValue(rec.pod)) return 'LUCE';
  if (cleanValue(rec.pdr)) return 'GAS';
  if (cleanValue(rec.pod_pdr)) {
    const pod = detectPod(rec.pod_pdr);
    const pdr = detectPdr(rec.pod_pdr);
    if (pod) return 'LUCE';
    if (pdr) return 'GAS';
  }
  return '';
}

function generateValueForField(fieldName, row, systemHeaders, supplierHeaders) {
  switch (fieldName) {
    case 'tipo_record':
      return 'contratto';
    
    case 'commodity':
      // Deriva dalla colonna commodity del fornitore o dal PDP
      const commodityIndex = supplierHeaders.indexOf('commodity');
      const pdpIndex = supplierHeaders.indexOf('PDP');
      
      if (commodityIndex >= 0 && row[commodityIndex]) {
        const commodity = String(row[commodityIndex]).toLowerCase();
        if (commodity.includes('gas')) return 'gas';
        if (commodity.includes('luce') || commodity.includes('energia') || commodity.includes('elettric')) return 'luce';
      }
      
      if (pdpIndex >= 0 && row[pdpIndex]) {
        // PDP può essere sia POD che PDR, controlliamo la lunghezza
        const pdpValue = String(row[pdpIndex]).trim();
        if (pdpValue.length === 14) return 'gas'; // PDR tipicamente 14 caratteri
        if (pdpValue.length === 15) return 'luce'; // POD tipicamente 15 caratteri
      }
      return '';
    
    case 'pod_pdr':
      // Prende il valore PDP dal fornitore
      const pdp = row[supplierHeaders.indexOf('PDP')] || '';
      return pdp;
    
    case 'data_attivazione':
      // Normalizza la data di decorrenza del fornitore
      const dataIndex = supplierHeaders.indexOf('Data Decorrenza');
      
      if (dataIndex >= 0 && row[dataIndex]) {
        const dateStr = String(row[dataIndex]).trim();
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }
      }
      return '';
    
    default:
      return '';
  }
}

function buildOutputRows(workbook) {
  const mustHave = [
    'tipo_record', 'commodity', 'pod', 'pdr', 'fornitore', 'numero_contratto',
    'data_attivazione', 'nome', 'cognome', 'email_principale', 'codice_fiscale',
    'partita_iva', 'ragione_sociale', 'pod_pdr'
  ];
  const headerSet = new Set();
  const rawRows = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows || rows.length === 0) continue;
     
    // L'Excel ha una struttura particolare:
    // Riga 0: intestazioni del nostro sistema
    // Riga 1: vuota
    // Riga 2: intestazioni del fornitore originale  
    // Riga 3+: dati reali
    
    const systemHeaders = rows[0] || [];
    const supplierHeaders = rows[2] || [];
    
    // Aggiungi tutte le intestazioni mappate al set
    systemHeaders.forEach(h => {
      const mapped = mapSynonym(h);
      if (mapped) headerSet.add(mapped);
    });
    supplierHeaders.forEach(h => {
      const mapped = mapSynonym(h);
      if (mapped) headerSet.add(mapped);
    });
    
    // Processa le righe di dati (dalla riga 3 in poi)
    for (let r = 3; r < rows.length; r++) {
      const arr = rows[r];
      if (!arr || arr.every(cell => !cell || String(cell).trim() === '')) {
        continue; // Salta righe vuote
      }
      
      const rec = {};
      
      // I dati reali sono mappati alle intestazioni del fornitore (riga 2)
      // Le intestazioni del sistema (riga 0) sono solo per la struttura finale
      for (let c = 0; c < supplierHeaders.length && c < arr.length; c++) {
        const supplierHeader = supplierHeaders[c];
        if (!supplierHeader || !supplierHeader.trim()) continue;
        
        const key = mapSynonym(supplierHeader);
        if (key && arr[c] !== undefined && arr[c] !== null && String(arr[c]).trim()) {
          rec[key] = cleanValue(arr[c]);
        }
      }
      
      // Genera valori per i campi aggiuntivi
      for (const field of mustHave) {
        if (!rec[field]) {
          rec[field] = generateValueForField(field, arr, systemHeaders, supplierHeaders);
        }
      }
      
      // Mantieni solo le righe con almeno un valore significativo
      if (Object.values(rec).some(v => v && String(v).trim().length > 0)) {
        rawRows.push(rec);
      }
    }
  }

  // Assicurati che le intestazioni obbligatorie esistano
  mustHave.forEach(h => headerSet.add(h));
  const headers = Array.from(headerSet);

  // Costruisci le righe normalizzate
  const outRows = rawRows.map(rec => {
    const out = {};
    
    // Copia i valori esistenti
    for (const h of headers) {
      out[h] = cleanValue(rec[h]);
    }
    
    // Deriva pod/pdr dal campo combinato se necessario
    if (!out.pod && !out.pdr && cleanValue(rec.pod_pdr)) {
      const pod = detectPod(rec.pod_pdr);
      const pdr = detectPdr(rec.pod_pdr);
      if (pod) out.pod = pod;
      if (pdr) out.pdr = pdr;
    }
    
    // Deriva commodity se mancante
    if (!out.commodity) out.commodity = deriveCommodity(out);
    
    // Tipo record di default
    if (!out.tipo_record) out.tipo_record = 'contratto';
    
    // Normalizza le date in formato YYYY-MM-DD
    if (out.data_attivazione) {
      let d = String(out.data_attivazione).trim();
      // Converte formati comuni dd/mm/yyyy o dd-mm-yyyy
      const m = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (m) {
        const yyyy = m[3].length === 2 ? ('20' + m[3]) : m[3];
        const mm = m[2].padStart(2, '0');
        const dd = m[1].padStart(2, '0');
        out.data_attivazione = `${yyyy}-${mm}-${dd}`;
      }
    }
    
    return out;
  });

  return { headers, outRows };
}

function writeCsv(headers, rows, outPath) {
  const csvLines = [];
  csvLines.push(headers.join(','));
  for (const r of rows) {
    const line = headers.map(h => {
      const v = r[h] || '';
      const needsQuote = /[,"\n]/.test(v);
      return needsQuote ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',');
    csvLines.push(line);
  }
  fs.writeFileSync(outPath, csvLines.join('\n'), 'utf8');
}

function writeXlsx(headers, rows, outPath) {
  const aoa = [headers];
  for (const r of rows) {
    aoa.push(headers.map(h => r[h] || ''));
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'TemplateCompleto');
  XLSX.writeFile(wb, outPath);
}

function main() {
  if (!fs.existsSync(INPUT_XLSX)) {
    console.error(`File di input non trovato: ${INPUT_XLSX}`);
    process.exit(1);
  }
  const wb = XLSX.readFile(INPUT_XLSX);
  const { headers, outRows } = buildOutputRows(wb);
  writeCsv(headers, outRows, OUTPUT_CSV);
  writeXlsx(headers, outRows, OUTPUT_XLSX);
  console.log(`Creati:\n- ${OUTPUT_CSV}\n- ${OUTPUT_XLSX}\nRighe: ${outRows.length}, Colonne: ${headers.length}`);
}

if (require.main === module) {
  main();
}