const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { csv: false, csvImport: false, out: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--csv') opts.csv = true;
    else if (a === '--csv-import' || a === '--import-csv') opts.csvImport = true;
    else if (a === '--out') {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) throw new Error('Uso: --out <percorso_file>');
      opts.out = next;
      i++;
    }
  }
  return opts;
}

function csvEscape(value) {
  return '"' + String(value ?? '').replace(/"/g, '""') + '"';
}

function buildCSV(results) {
  const header = [
    'id','tipo',
    'nome','cognome','ragione_sociale',
    'codice_fiscale','partita_iva',
    'codice_ateco','descrizione_ateco','pec_aziendale',
    'data_nascita',
    'email_principale','email_secondaria','email_referente',
    'telefono_mobile','telefono_principale','telefono_fisso','telefono_referente',
    'via_residenza','civico_residenza','cap_residenza','citta_residenza','provincia_residenza',
    'via_sede_legale','civico_sede_legale','cap_sede_legale','citta_sede_legale','provincia_sede_legale',
    'via_sede_operativa','civico_sede_operativa','cap_sede_operativa','citta_sede_operativa','provincia_sede_operativa',
    'nome_referente','cognome_referente','ruolo_referente',
    'dimensione_azienda','settore_merceologico','fatturato_annuo','iban_aziendale','codice_sdi',
    'note','consenso_privacy','consenso_marketing','stato','created_at',
    'contratti_luce','contratti_gas','documenti','email_inviate','note_count',
    'eventi_storico','procedure_contratti','consensi_gdpr','tasks',
    'metadata_data_esportazione','metadata_versione_export'
  ];
  const rows = [header.join(',')];
  for (const r of results) {
    if (r.error) continue;
    const p = r.data || {};
    const dati = p?.cliente?.dati || {};
    const contratti_luce = (p?.contratti?.luce || []).length;
    const contratti_gas = (p?.contratti?.gas || []).length;
    const documenti = (p?.documenti || []).length;
    const email_inviate = (p?.comunicazioni?.email || []).length;
    const note_count = (p?.note || []).length;
    const eventi_storico = (p?.storico?.eventi || []).length;
    const procedure_contratti = (p?.storico?.procedure_contratti || []).length;
    const consensi_gdpr = (p?.consensi_gdpr || []).length;
    const tasks = (p?.tasks || []).length;
    const metadata_data_esportazione = p?.metadata?.data_esportazione || '';
    const metadata_versione_export = p?.metadata?.versione_export || '';

    const line = [
      csvEscape(r.id),
      csvEscape(r.tipo),
      csvEscape(dati.nome),
      csvEscape(dati.cognome),
      csvEscape(dati.ragione_sociale),
      csvEscape(dati.codice_fiscale),
      csvEscape(dati.partita_iva),
      csvEscape(dati.codice_ateco),
      csvEscape(dati.descrizione_ateco),
      csvEscape(dati.pec_aziendale),
      csvEscape(dati.data_nascita),
      csvEscape(dati.email_principale),
      csvEscape(dati.email_secondaria),
      csvEscape(dati.email_referente),
      csvEscape(dati.telefono_mobile),
      csvEscape(dati.telefono_principale),
      csvEscape(dati.telefono_fisso),
      csvEscape(dati.telefono_referente),
      csvEscape(dati.via_residenza),
      csvEscape(dati.civico_residenza),
      csvEscape(dati.cap_residenza),
      csvEscape(dati.citta_residenza),
      csvEscape(dati.provincia_residenza),
      csvEscape(dati.via_sede_legale),
      csvEscape(dati.civico_sede_legale),
      csvEscape(dati.cap_sede_legale),
      csvEscape(dati.citta_sede_legale),
      csvEscape(dati.provincia_sede_legale),
      csvEscape(dati.via_sede_operativa),
      csvEscape(dati.civico_sede_operativa),
      csvEscape(dati.cap_sede_operativa),
      csvEscape(dati.citta_sede_operativa),
      csvEscape(dati.provincia_sede_operativa),
      csvEscape(dati.nome_referente),
      csvEscape(dati.cognome_referente),
      csvEscape(dati.ruolo_referente),
      csvEscape(dati.dimensione_azienda),
      csvEscape(dati.settore_merceologico),
      csvEscape(dati.fatturato_annuo),
      csvEscape(dati.iban_aziendale),
      csvEscape(dati.codice_sdi),
      csvEscape(dati.note),
      csvEscape(dati.consenso_privacy),
      csvEscape(dati.consenso_marketing),
      csvEscape(dati.stato),
      csvEscape(dati.created_at),
      contratti_luce,
      contratti_gas,
      documenti,
      email_inviate,
      note_count,
      eventi_storico,
      procedure_contratti,
      consensi_gdpr,
      tasks,
      csvEscape(metadata_data_esportazione),
      csvEscape(metadata_versione_export)
    ].join(',');
    rows.push(line);
  }
  return rows.join('\n');
}

async function run() {
  const opts = parseArgs();
  try {
    console.log('🔐 Login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@gestionale.it',
      password: 'Admin123!'
    });
    const token = loginRes.data?.data?.token;
    if (!token) throw new Error('Token mancante');
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Login OK');

    console.log('👥 Recupero lista clienti...');
    const listRes = await axios.get(`${BASE_URL}/clienti`, { headers, params: { limit: 200 } });
    let clienti = listRes.data?.data?.clienti || [];
    console.log(`📋 Clienti totali: ${clienti.length}`);

    const hasAzienda = clienti.some(c => c.tipo === 'azienda');
    if (!hasAzienda) {
      console.log('➕ Nessuna azienda presente. Creo un cliente azienda di test...');
      const createRes = await axios.post(`${BASE_URL}/clienti/aziende`, {
        ragione_sociale: 'Test Azienda Export',
        email_referente: 'referente@test-azienda.local'
      }, { headers });
      const nuovaAzienda = createRes.data?.data;
      if (nuovaAzienda?.id) {
        clienti.push({ id: nuovaAzienda.id, tipo: 'azienda', nome: nuovaAzienda.ragione_sociale });
        console.log(`✅ Azienda creata: ID=${nuovaAzienda.id}`);
      }
    }

    console.log('📦 Eseguo export completo per tutti i clienti...');
    const results = [];
    for (const c of clienti) {
      const tipo = c.tipo === 'privato' ? 'privato' : 'azienda';
      try {
        const expRes = await axios.get(`${BASE_URL}/clienti/${tipo}/${c.id}/export-complete`, { headers });
        results.push({ id: c.id, tipo, status: expRes.status, data: expRes.data?.data || expRes.data });
        process.stdout.write('.');
      } catch (err) {
        results.push({ id: c.id, tipo, error: err.response?.data || err.message });
        process.stdout.write('x');
      }
    }
    console.log('\n');

    const okCount = results.filter(r => !r.error).length;
    const errCount = results.filter(r => r.error).length;

    if (opts.csv || opts.csvImport) {
      const csvContent = opts.csvImport ? buildImportUniversalCSV(results) : buildCSV(results);
      const defaultName = opts.csvImport ? 'import_universale_clienti_contratti.csv' : 'clienti_completi_export.csv';
      const outPath = path.isAbsolute(opts.out || '')
        ? (opts.out || defaultName)
        : path.join(__dirname, '..', opts.out || defaultName);
      fs.writeFileSync(outPath, csvContent, 'utf8');
      console.log('💾 File CSV salvato:', outPath);
      console.log('✅ Esportazioni riuscite:', okCount);
      console.log('❌ Errori:', errCount);
    } else {
      const output = {
        generated_at: new Date().toISOString(),
        count: results.length,
        ok: okCount,
        errors: errCount,
        clients: results
      };
      const defaultName = 'clienti_completi_export.json';
      const outPath = path.isAbsolute(opts.out || '')
        ? (opts.out || defaultName)
        : path.join(__dirname, '..', opts.out || defaultName);
      fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
      console.log('💾 File JSON salvato:', outPath);
      console.log('✅ Esportazioni riuscite:', okCount);
      console.log('❌ Errori:', errCount);
    }

  } catch (error) {
    console.error('❌ Errore esecuzione:', error.response?.data || error.message);
    process.exitCode = 1;
  }
}

run();

// --- Modalità CSV per Import Unificato ---
function buildImportUniversalCSV(results) {
  // Prima riga "sep=," per Excel; BOM per UTF-8
  const lines = ['sep=,'];
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

  const header = [
    'tipo_record','modalita_import',
    // cliente privato
    'nome','cognome','codice_fiscale','data_nascita','email_principale','telefono_mobile','via_residenza','civico_residenza','cap_residenza','citta_residenza','provincia_residenza',
    // cliente azienda
    'ragione_sociale','partita_iva','codice_ateco','pec_aziendale',
    // contratto
    'numero_contratto','pod','pdr','fornitore','data_attivazione','data_scadenza','prezzo_energia','prezzo_gas','stato_contratto'
  ];
  lines.push(header.join(','));

  for (const r of results) {
    if (r.error) continue;
    const p = r.data || {};
    const d = p?.cliente?.dati || {};
    const tipoCliente = p?.cliente?.tipo === 'privato' ? 'privato' : 'azienda';

    // Record cliente
    if (tipoCliente === 'privato') {
      lines.push([
        'cliente_privato','update',
        esc(d.nome),esc(d.cognome),esc(d.codice_fiscale),esc(d.data_nascita),esc(d.email_principale),esc(d.telefono_mobile),
        esc(d.via_residenza),esc(d.civico_residenza),esc(d.cap_residenza),esc(d.citta_residenza),esc(d.provincia_residenza),
        '', '', esc(d.codice_ateco), esc(d.pec_aziendale),
        '', '', '', '', '', '', '', '', ''
      ].join(','));
    } else {
      lines.push([
        'cliente_azienda','update',
        '', '', '', '', esc(d.email_principale), esc(d.telefono_mobile), '', '', '', '', '',
        esc(d.ragione_sociale), esc(d.partita_iva), esc(d.codice_ateco), esc(d.pec_aziendale),
        '', '', '', '', '', '', '', '', ''
      ].join(','));
    }

    // Contratti luce
    const contrattiLuce = Array.isArray(p?.contratti?.luce) ? p.contratti.luce : [];
    for (const c of contrattiLuce) {
      lines.push([
        'contratto_luce','update',
        tipoCliente === 'privato' ? esc(d.nome) : '',
        tipoCliente === 'privato' ? esc(d.cognome) : '',
        tipoCliente === 'privato' ? esc(d.codice_fiscale) : '',
        '', esc(d.email_principale), esc(d.telefono_mobile), '', '', '', '', '',
        tipoCliente === 'azienda' ? esc(d.ragione_sociale) : '',
        tipoCliente === 'azienda' ? esc(d.partita_iva) : '',
        '', '',
        esc(c.numero_contratto), esc(c.pod), '', esc(c.fornitore), esc(c.data_attivazione), esc(c.data_scadenza), esc(c.prezzo_energia), '', esc(c.stato || c.stato_contratto)
      ].join(','));
    }

    // Contratti gas
    const contrattiGas = Array.isArray(p?.contratti?.gas) ? p.contratti.gas : [];
    for (const c of contrattiGas) {
      lines.push([
        'contratto_gas','update',
        tipoCliente === 'privato' ? esc(d.nome) : '',
        tipoCliente === 'privato' ? esc(d.cognome) : '',
        tipoCliente === 'privato' ? esc(d.codice_fiscale) : '',
        '', esc(d.email_principale), esc(d.telefono_mobile), '', '', '', '', '',
        tipoCliente === 'azienda' ? esc(d.ragione_sociale) : '',
        tipoCliente === 'azienda' ? esc(d.partita_iva) : '',
        '', '',
        esc(c.numero_contratto), '', esc(c.pdr), esc(c.fornitore), esc(c.data_attivazione), esc(c.data_scadenza), '', esc(c.prezzo_gas), esc(c.stato || c.stato_contratto)
      ].join(','));
    }
  }

  const bom = '\uFEFF';
  return bom + lines.join('\r\n');
}