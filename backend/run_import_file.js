const fs = require('fs');
const path = require('path');

// Prefer dist build if available
let ImportService;
try {
  ({ UnifiedImportService: ImportService } = require('../dist/backend/services/unifiedImportService'));
} catch (e) {
  try {
    ({ UnifiedImportService: ImportService } = require('./services/unifiedImportService'));
  } catch (e2) {
    console.error('❌ Impossibile caricare UnifiedImportService da dist o src');
    process.exit(1);
  }
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Uso: node backend/run_import_file.js <path_file_csv_o_xlsx>');
    process.exit(1);
  }

  const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    console.error('❌ File non trovato:', filePath);
    process.exit(1);
  }

  const fileName = path.basename(filePath);
  const buffer = fs.readFileSync(filePath);
  const service = new ImportService();

  console.log('🚀 Avvio import diretto (senza API)');
  console.log('📄 File:', filePath);

  try {
    const result = await service.importFile(buffer, fileName, {
      dryRun: false,
      autoDetectType: true,
      skipValidation: false,
      skipAssociation: false,
      batchSize: 100,
    });

    console.log('\n🎯 RISULTATO');
    console.log(`- Righe totali: ${result.totalRows}`);
    console.log(`- Processate: ${result.processedRows}`);
    console.log(`- Inserite: ${result.insertedRows}`);
    console.log(`- Aggiornate: ${result.updatedRows}`);
    console.log(`- Errori: ${result.errorRows}`);

    if (Array.isArray(result.errorReport) && result.errorReport.length > 0) {
      console.log('\n⚠️ Errori:');
      result.errorReport.slice(0, 10).forEach((e, i) => {
        console.log(`${i + 1}. ${e.message} (Riga: ${e.rowNumber})`);
      });
      if (result.errorReport.length > 10) {
        console.log(`... altri ${result.errorReport.length - 10} errori`);
      }
    } else {
      console.log('\n✅ Nessun errore di import');
    }

    console.log('\n✅ Import completato');
  } catch (err) {
    console.error('❌ Errore durante l\'import:', err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'));
    process.exit(1);
  }
}

main();