const fs = require('fs');
const { parse } = require('csv-parse/sync');
const Database = require('better-sqlite3');

console.log('🔍 DEBUG INSERIMENTO STEP BY STEP');
console.log('=================================');

const csvFile = './test_contratti_corretto.csv';
const dbPath = './gestionale_energia.db';

// Leggi e parsa il file
const rawContent = fs.readFileSync(csvFile, 'utf8');
const records = parse(rawContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    skip_records_with_error: false
});

console.log(`\n📊 RECORD PARSATI: ${records.length}`);

// Connetti al database
const db = new Database(dbPath);

// Raggruppa per tipo
const recordsByType = {};
records.forEach((record, index) => {
    const recordType = record.tipo_record || 'unknown';
    if (!recordsByType[recordType]) {
        recordsByType[recordType] = [];
    }
    recordsByType[recordType].push({ ...record, rowNumber: index + 1 });
});

console.log('\n📊 RAGGRUPPAMENTO:');
Object.entries(recordsByType).forEach(([type, records]) => {
    console.log(`${type}: ${records.length} record`);
});

// Ordine di processamento
const processingOrder = [
    'cliente_privato',
    'cliente_azienda', 
    'contratto_luce',
    'contratto_gas'
];

let totalInserted = 0;
let totalSkipped = 0;

// Processa i record nell'ordine corretto
for (const recordType of processingOrder) {
    if (recordsByType[recordType]) {
        console.log(`\n📝 PROCESSANDO ${recordsByType[recordType].length} record di tipo: ${recordType}`);
        console.log('='.repeat(50));
        
        for (let i = 0; i < recordsByType[recordType].length; i++) {
            const record = recordsByType[recordType][i];
            console.log(`\n🔄 Record ${i + 1}/${recordsByType[recordType].length} (riga ${record.rowNumber})`);
            
            try {
                let result = null;
                
                if (recordType === 'cliente_privato') {
                    console.log(`   👤 Cliente: ${record.nome} ${record.cognome}`);
                    console.log(`   📧 Email: ${record.email_principale || 'N/A'}`);
                    console.log(`   🆔 CF: ${record.codice_fiscale || 'N/A'}`);
                    
                    // Controlla se esiste già
                    let existing = null;
                    if (record.codice_fiscale) {
                        existing = db.prepare('SELECT id FROM clienti_privati WHERE codice_fiscale = ?').get(record.codice_fiscale);
                    }
                    
                    if (existing) {
                        console.log(`   ⚠️ Cliente già esistente con ID: ${existing.id}`);
                        totalSkipped++;
                    } else {
                        console.log(`   ✅ Nuovo cliente - procedendo con inserimento`);
                        totalInserted++;
                    }
                    
                } else if (recordType === 'cliente_azienda') {
                    console.log(`   🏢 Azienda: ${record.ragione_sociale}`);
                    console.log(`   📧 Email: ${record.email_principale || 'N/A'}`);
                    console.log(`   🆔 P.IVA: ${record.partita_iva || 'N/A'}`);
                    
                    // Controlla se esiste già
                    let existing = null;
                    if (record.partita_iva) {
                        existing = db.prepare('SELECT id FROM clienti_aziende WHERE partita_iva = ?').get(record.partita_iva);
                    }
                    
                    if (existing) {
                        console.log(`   ⚠️ Azienda già esistente con ID: ${existing.id}`);
                        totalSkipped++;
                    } else {
                        console.log(`   ✅ Nuova azienda - procedendo con inserimento`);
                        totalInserted++;
                    }
                    
                } else if (recordType === 'contratto_luce') {
                    console.log(`   ⚡ Contratto Luce: ${record.numero_contratto}`);
                    console.log(`   👤 Cliente: ${record.nome || record.ragione_sociale}`);
                    console.log(`   🆔 CF/P.IVA: ${record.codice_fiscale || record.partita_iva || 'N/A'}`);
                    
                    // Cerca il cliente associato
                    let cliente = null;
                    if (record.codice_fiscale) {
                        cliente = db.prepare('SELECT id FROM clienti_privati WHERE codice_fiscale = ?').get(record.codice_fiscale);
                    } else if (record.partita_iva) {
                        cliente = db.prepare('SELECT id FROM clienti_aziende WHERE partita_iva = ?').get(record.partita_iva);
                    }
                    
                    if (!cliente) {
                        console.log(`   ❌ Cliente non trovato - contratto saltato`);
                        totalSkipped++;
                    } else {
                        console.log(`   ✅ Cliente trovato con ID: ${cliente.id}`);
                        
                        // Controlla se il contratto esiste già
                        const existing = db.prepare('SELECT id FROM contratti_luce WHERE numero_contratto = ?').get(record.numero_contratto);
                        if (existing) {
                            console.log(`   ⚠️ Contratto già esistente con ID: ${existing.id}`);
                            totalSkipped++;
                        } else {
                            console.log(`   ✅ Nuovo contratto - procedendo con inserimento`);
                            totalInserted++;
                        }
                    }
                    
                } else if (recordType === 'contratto_gas') {
                    console.log(`   🔥 Contratto Gas: ${record.numero_contratto}`);
                    console.log(`   👤 Cliente: ${record.nome || record.ragione_sociale}`);
                    console.log(`   🆔 CF/P.IVA: ${record.codice_fiscale || record.partita_iva || 'N/A'}`);
                    
                    // Cerca il cliente associato
                    let cliente = null;
                    if (record.codice_fiscale) {
                        cliente = db.prepare('SELECT id FROM clienti_privati WHERE codice_fiscale = ?').get(record.codice_fiscale);
                    } else if (record.partita_iva) {
                        cliente = db.prepare('SELECT id FROM clienti_aziende WHERE partita_iva = ?').get(record.partita_iva);
                    }
                    
                    if (!cliente) {
                        console.log(`   ❌ Cliente non trovato - contratto saltato`);
                        totalSkipped++;
                    } else {
                        console.log(`   ✅ Cliente trovato con ID: ${cliente.id}`);
                        
                        // Controlla se il contratto esiste già
                        const existing = db.prepare('SELECT id FROM contratti_gas WHERE numero_contratto = ?').get(record.numero_contratto);
                        if (existing) {
                            console.log(`   ⚠️ Contratto già esistente con ID: ${existing.id}`);
                            totalSkipped++;
                        } else {
                            console.log(`   ✅ Nuovo contratto - procedendo con inserimento`);
                            totalInserted++;
                        }
                    }
                }
                
            } catch (error) {
                console.error(`   ❌ Errore: ${error.message}`);
                totalSkipped++;
            }
        }
    }
}

console.log('\n📊 RIEPILOGO SIMULAZIONE:');
console.log('========================');
console.log(`✅ Record che verrebbero inseriti: ${totalInserted}`);
console.log(`⚠️ Record che verrebbero saltati: ${totalSkipped}`);
console.log(`📊 Totale processati: ${totalInserted + totalSkipped}`);

db.close();
console.log('\n✅ Debug completato!');