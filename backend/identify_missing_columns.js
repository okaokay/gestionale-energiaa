const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const db = new sqlite3.Database('./gestionale_energia.db');

console.log('🔍 ANALISI COMPLETA COLONNE MANCANTI PER IMPORT FUNZIONANTE');
console.log('=' .repeat(70));

// Funzione per ottenere la struttura di una tabella
function getTableStructure(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Funzione per leggere e analizzare il CSV in modo più robusto
function analyzeCsvFile() {
    const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
    
    if (!fs.existsSync(csvPath)) {
        console.log('❌ File CSV non trovato:', csvPath);
        return null;
    }

    try {
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            console.log('❌ File CSV vuoto');
            return null;
        }

        // Prendi la prima riga come header
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        console.log(`📊 File CSV analizzato:`);
        console.log(`   - Righe totali: ${lines.length - 1}`);
        console.log(`   - Colonne totali: ${headers.length}`);

        return {
            headers: headers,
            totalRows: lines.length - 1
        };
    } catch (error) {
        console.log('❌ Errore nel parsing del CSV:', error.message);
        return null;
    }
}

async function identifyMissingColumns() {
    try {
        console.log('\n📄 ANALISI FILE CSV:');
        console.log('-' .repeat(40));
        
        const csvData = analyzeCsvFile();
        if (!csvData) {
            console.log('❌ Impossibile analizzare il file CSV');
            return;
        }

        console.log('\n📋 COLONNE NEL CSV:');
        csvData.headers.forEach((header, index) => {
            console.log(`   ${(index + 1).toString().padStart(2)}. ${header}`);
        });

        // Ottieni strutture delle tabelle principali
        console.log('\n🗄️  ANALISI STRUTTURE DATABASE:');
        console.log('-' .repeat(50));

        const tables = {
            clienti_privati: await getTableStructure('clienti_privati'),
            contratti_luce: await getTableStructure('contratti_luce'),
            contratti_gas: await getTableStructure('contratti_gas')
        };

        // Mostra strutture attuali
        Object.entries(tables).forEach(([tableName, structure]) => {
            console.log(`\n📊 ${tableName.toUpperCase()} (${structure.length} colonne):`);
            structure.forEach((col, index) => {
                console.log(`   ${(index + 1).toString().padStart(2)}. ${col.name} (${col.type})`);
            });
        });

        // Mapping delle colonne CSV alle tabelle basato sul CSV reale
        const csvToTableMapping = {
            // Colonne per clienti_privati
            cliente_privato: {
                table: 'clienti_privati',
                csvColumns: csvData.headers.filter(h => 
                    ['nome', 'cognome', 'codice_fiscale', 'data_nascita', 'email_principale', 
                     'telefono_mobile', 'via_residenza', 'civico_residenza', 'cap_residenza', 
                     'citta_residenza', 'provincia_residenza', 'tipo_documento', 'numero_documento', 
                     'ente_rilascio', 'data_scadenza_documento', 'iban', 'consenso_privacy', 'consenso_marketing'].includes(h)
                )
            },
            // Colonne per contratti_luce
            contratto_luce: {
                table: 'contratti_luce',
                csvColumns: csvData.headers.filter(h => 
                    ['numero_contratto', 'pod', 'fornitore', 'data_attivazione', 'data_scadenza', 
                     'prezzo_energia', 'stato_contratto'].includes(h)
                )
            },
            // Colonne per contratti_gas
            contratto_gas: {
                table: 'contratti_gas',
                csvColumns: csvData.headers.filter(h => 
                    ['numero_contratto', 'pdr', 'fornitore', 'data_attivazione', 'data_scadenza', 
                     'prezzo_gas', 'stato_contratto'].includes(h)
                )
            }
        };

        console.log('\n🔍 ANALISI COLONNE MANCANTI PER TIPO DI RECORD:');
        console.log('=' .repeat(60));

        const allMissingColumns = [];

        for (const [recordType, mapping] of Object.entries(csvToTableMapping)) {
            console.log(`\n📊 ${recordType.toUpperCase()} -> ${mapping.table.toUpperCase()}`);
            console.log('-' .repeat(50));

            const tableColumns = tables[mapping.table].map(col => col.name);
            const missingColumns = [];

            console.log('🔍 CONTROLLO COLONNE CSV:');
            mapping.csvColumns.forEach(csvCol => {
                if (tableColumns.includes(csvCol)) {
                    console.log(`   ✅ ${csvCol} - PRESENTE`);
                } else {
                    console.log(`   ❌ ${csvCol} - MANCANTE`);
                    missingColumns.push({
                        table: mapping.table,
                        column: csvCol,
                        recordType: recordType
                    });
                }
            });

            if (missingColumns.length > 0) {
                console.log(`\n🚫 COLONNE MANCANTI IN ${mapping.table.toUpperCase()}:`);
                missingColumns.forEach((missing, index) => {
                    console.log(`   ${index + 1}. ${missing.column}`);
                    allMissingColumns.push(missing);
                });
            } else {
                console.log(`\n✅ Tutte le colonne CSV sono presenti in ${mapping.table}`);
            }
        }

        // Controllo specifico per le colonne problematiche identificate nei log
        console.log('\n🔍 CONTROLLO SPECIFICO COLONNE PROBLEMATICHE DAI LOG:');
        console.log('-' .repeat(60));

        const problematicColumns = [
            { table: 'contratti_gas', column: 'stato_contratto', description: 'Errore nei log: table contratti_gas has no column named stato_contratto' },
            { table: 'contratti_luce', column: 'stato_contratto', description: 'Dovrebbe essere presente come in contratti_luce' },
            { table: 'contratti_gas', column: 'pod', description: 'Colonna specifica per contratti luce, non dovrebbe essere in gas' },
            { table: 'contratti_luce', column: 'pdr', description: 'Colonna specifica per contratti gas, non dovrebbe essere in luce' },
            { table: 'contratti_gas', column: 'prezzo_energia', description: 'Dovrebbe essere prezzo_gas per contratti gas' },
            { table: 'contratti_luce', column: 'prezzo_gas', description: 'Dovrebbe essere prezzo_energia per contratti luce' }
        ];

        problematicColumns.forEach(({ table, column, description }) => {
            const tableStructure = tables[table];
            const columnExists = tableStructure && tableStructure.some(col => col.name === column);
            
            console.log(`\n🔍 ${table}.${column}:`);
            console.log(`   ${columnExists ? '✅ PRESENTE' : '❌ MANCANTE'}`);
            console.log(`   📝 ${description}`);
        });

        // Riepilogo finale
        console.log('\n📋 RIEPILOGO FINALE - COLONNE DA AGGIUNGERE:');
        console.log('=' .repeat(60));

        if (allMissingColumns.length === 0) {
            console.log('🎉 Tutte le colonne CSV di base sono presenti nel database!');
        } else {
            console.log(`❌ Trovate ${allMissingColumns.length} colonne mancanti dalle colonne CSV:`);
            
            // Raggruppa per tabella
            const missingByTable = {};
            allMissingColumns.forEach(missing => {
                if (!missingByTable[missing.table]) {
                    missingByTable[missing.table] = [];
                }
                missingByTable[missing.table].push(missing.column);
            });

            Object.entries(missingByTable).forEach(([table, columns]) => {
                console.log(`\n🗄️  ${table.toUpperCase()}:`);
                columns.forEach((col, index) => {
                    console.log(`   ${index + 1}. ${col}`);
                });
            });
        }

        // Genera SQL per le colonne critiche mancanti
        console.log('\n🛠️  SQL PER AGGIUNGERE LE COLONNE CRITICHE:');
        console.log('=' .repeat(50));

        const criticalMissingColumns = [
            { table: 'contratti_gas', column: 'stato_contratto', type: 'TEXT', reason: 'Errore nei log di importazione' },
            { table: 'contratti_luce', column: 'stato_contratto', type: 'TEXT', reason: 'Consistenza con contratti_gas' }
        ];

        // Controlla se le colonne critiche esistono
        const actualMissingCritical = [];
        for (const critical of criticalMissingColumns) {
            const tableStructure = tables[critical.table];
            const columnExists = tableStructure && tableStructure.some(col => col.name === critical.column);
            
            if (!columnExists) {
                actualMissingCritical.push(critical);
            }
        }

        if (actualMissingCritical.length > 0) {
            console.log('\n-- COLONNE CRITICHE DA AGGIUNGERE:');
            actualMissingCritical.forEach(({ table, column, type, reason }) => {
                console.log(`-- ${reason}`);
                console.log(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
                console.log('');
            });
        } else {
            console.log('✅ Tutte le colonne critiche sono già presenti!');
        }

        // Aggiungi anche le colonne mancanti dal CSV se ce ne sono
        if (allMissingColumns.length > 0) {
            console.log('\n-- COLONNE DAL CSV DA AGGIUNGERE:');
            const missingByTable = {};
            allMissingColumns.forEach(missing => {
                if (!missingByTable[missing.table]) {
                    missingByTable[missing.table] = [];
                }
                missingByTable[missing.table].push(missing.column);
            });

            Object.entries(missingByTable).forEach(([table, columns]) => {
                console.log(`\n-- Aggiungere a ${table.toUpperCase()}:`);
                columns.forEach(col => {
                    // Determina il tipo di dato basandosi sul nome della colonna
                    let dataType = 'TEXT';
                    if (col.includes('data_') || col.includes('date')) {
                        dataType = 'TEXT'; // SQLite gestisce le date come TEXT
                    } else if (col.includes('prezzo_') || col.includes('price')) {
                        dataType = 'REAL';
                    } else if (col.includes('consenso_') || col.includes('attivo')) {
                        dataType = 'INTEGER'; // Boolean come INTEGER
                    }
                    
                    console.log(`ALTER TABLE ${table} ADD COLUMN ${col} ${dataType};`);
                });
            });
        }

        console.log('\n✅ ANALISI COMPLETATA!');
        console.log('\n💡 RACCOMANDAZIONI:');
        console.log('1. Eseguire gli script SQL generati per aggiungere le colonne mancanti');
        console.log('2. Ricompilare il backend dopo le modifiche al database');
        console.log('3. Riavviare il server per applicare le modifiche');
        console.log('4. Testare nuovamente l\'importazione');

    } catch (error) {
        console.error('❌ Errore durante l\'analisi:', error);
    } finally {
        db.close();
    }
}

identifyMissingColumns();