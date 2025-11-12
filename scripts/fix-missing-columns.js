const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'gestionale_energia.db');

console.log('🔧 Fixing missing columns in database...\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connesso al database SQLite');
});

// Colonne da aggiungere alla tabella clienti_aziende
const columnsToAdd = [
    'ALTER TABLE clienti_aziende ADD COLUMN incomplete_data INTEGER DEFAULT 0',
    'ALTER TABLE clienti_aziende ADD COLUMN missing_fields TEXT',
    'ALTER TABLE clienti_aziende ADD COLUMN data_quality_score REAL DEFAULT 0',
    'ALTER TABLE clienti_aziende ADD COLUMN last_quality_check TEXT'
];

console.log('📋 Aggiungendo colonne mancanti a clienti_aziende...\n');

let completed = 0;
const total = columnsToAdd.length;

columnsToAdd.forEach((sql, index) => {
    db.run(sql, (err) => {
        completed++;
        
        if (err) {
            if (err.message.includes('duplicate column name')) {
                const columnName = sql.split('ADD COLUMN ')[1]?.split(' ')[0];
                console.log(`⚠️  Colonna ${columnName} già esistente, skip`);
            } else {
                console.error(`❌ Errore aggiungendo colonna: ${err.message}`);
            }
        } else {
            const columnName = sql.split('ADD COLUMN ')[1]?.split(' ')[0];
            console.log(`✅ Aggiunta colonna: ${columnName}`);
        }
        
        if (completed === total) {
            console.log('\n🎉 Tutte le colonne sono state processate!');
            
            // Verifica finale
            db.all("PRAGMA table_info(clienti_aziende)", (err, rows) => {
                if (err) {
                    console.error('❌ Errore verifica finale:', err.message);
                } else {
                    console.log('\n📊 Struttura finale tabella clienti_aziende:');
                    rows.forEach(row => {
                        console.log(`   - ${row.name} (${row.type})`);
                    });
                }
                
                db.close((err) => {
                    if (err) {
                        console.error('❌ Errore chiusura database:', err.message);
                    } else {
                        console.log('\n✅ Database chiuso correttamente');
                    }
                });
            });
        }
    });
});