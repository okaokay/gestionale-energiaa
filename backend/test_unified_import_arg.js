const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

async function run(csvPathArg, modeArg) {
  console.log('🚀 Test Import Unificato (parametrico)');
  console.log('======================================\n');

  try {
    // 1) Login
    console.log('🔐 1. Effettuo login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@gestionale.it',
      password: 'Admin123!'
    });

    const token = loginResponse.data?.data?.token || loginResponse.data?.token;
    if (!token) throw new Error('Token non ricevuto dal login');
    console.log('✅ Login effettuato con successo');

    // 2) CSV path
    const csvPath = csvPathArg || path.join(__dirname, '..', 'template_import_perfetto.csv');
    if (!fs.existsSync(csvPath)) {
      throw new Error(`File CSV non trovato: ${csvPath}`);
    }
    console.log(`\n📁 CSV: ${csvPath}`);

    // 3) Upload con opzioni nel campo "options"
    const isDryRun = String(modeArg || '').toLowerCase() !== 'real';
    console.log(`\n🚀 2. Avvio import (${isDryRun ? 'dry run' : 'reale'})...`);
    const formData = new FormData();
    formData.append('file', fs.createReadStream(csvPath));
    formData.append('options', JSON.stringify({
      dryRun: isDryRun,
      autoDetectType: true,
      skipValidation: false,
      skipAssociation: false,
      batchSize: 100
    }));

    const importResponse = await axios.post(`${BASE_URL}/api/unified-import/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      },
      timeout: 60000
    });

    if (!importResponse.data?.success) {
      throw new Error(`Upload fallito: ${importResponse.data?.message}`);
    }
    const importId = importResponse.data.data.importId;
    console.log(`✅ Import avviato, ID: ${importId}`);

    // 4) Poll progresso
    console.log('\n📊 3. Monitoraggio progresso...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30;
    while (!completed && attempts < maxAttempts) {
      attempts++;
      try {
        const progressResp = await axios.get(`${BASE_URL}/api/unified-import/progress/${importId}`);
        const progress = progressResp.data?.data;
        if (progress) {
          console.log(`📈 ${progress.stage} - ${progress.progress}% - ${progress.message}`);
          if (progress.stage === 'completed' || progress.stage === 'failed') {
            completed = true;
          }
        }
      } catch (e) {
        console.log(`⚠️ Errore progresso: ${e.message}`);
      }
      if (!completed) await new Promise(r => setTimeout(r, 1000));
    }

    // 5) Risultato finale
    console.log('\n📋 4. Risultato finale...');
    const resultResp = await axios.get(`${BASE_URL}/api/unified-import/result/${importId}`);
    const result = resultResp.data?.data;
    if (!resultResp.data?.success || !result) {
      throw new Error(resultResp.data?.message || 'Errore nel risultato');
    }

    console.log('\n🎉 RISULTATO IMPORT');
    console.log('===================');
    console.log(`✅ Successo: ${result.success}`);
    console.log(`📁 File: ${result.fileName}`);
    console.log(`📊 Righe totali: ${result.totalRows}`);
    console.log(`📌 Inseriti — Clienti: ${result.inserted?.clienti_privati || 0}, Luce: ${result.inserted?.contratti_luce || 0}, Gas: ${result.inserted?.contratti_gas || 0}`);
    if (Array.isArray(result.errors) && result.errors.length > 0) {
      console.log('\n❌ Errori (prime 10):');
      result.errors.slice(0, 10).forEach((e, i) => console.log(`${i + 1}. Riga ${e.row}: ${e.error}`));
    } else {
      console.log('\n✅ Nessun errore riportato');
    }

    if (Array.isArray(result.warnings) && result.warnings.length > 0) {
      console.log('\n⚠️ Avvisi (prime 15):');
      result.warnings.slice(0, 15).forEach((w, i) => console.log(`${i + 1}. ${w}`));
    }

    console.log('\n✅ Test completato');
  } catch (error) {
    console.error('\n❌ Errore test:', error.message);
    if (error.response?.data) console.error('Dettagli:', error.response.data);
    process.exitCode = 1;
  }
}

const csvArg = process.argv[2];
const modeArg = process.argv[3];
run(csvArg, modeArg);