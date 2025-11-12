const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 VERIFICA E CREAZIONE TABELLE');
console.log('===============================\n');

// Lista tutte le tabelle esistenti
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error('❌ Errore:', err.message);
        return;
    }
    
    console.log('📋 Tabelle esistenti:');
    tables.forEach(table => {
        console.log(`   - ${table.name}`);
    });
    
    const existingTables = tables.map(t => t.name);
    
    // Verifica se esistono le tabelle principali
    const requiredTables = ['clienti', 'contratti_luce', 'contratti_gas'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
        console.log(`\n❌ Tabelle mancanti: ${missingTables.join(', ')}`);
        console.log('\n🔧 Creazione tabelle...');
        
        // Crea tabella clienti
        const createClientiSQL = `
        CREATE TABLE IF NOT EXISTS clienti (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codice_cliente TEXT UNIQUE,
            tipo_cliente TEXT NOT NULL,
            ragione_sociale TEXT,
            nome TEXT,
            cognome TEXT,
            codice_fiscale TEXT,
            partita_iva TEXT,
            email TEXT,
            telefono TEXT,
            indirizzo TEXT,
            citta TEXT,
            cap TEXT,
            provincia TEXT,
            data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_modifica DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
        
        // Crea tabella contratti luce
        const createContrattiLuceSQL = `
        CREATE TABLE IF NOT EXISTS contratti_luce (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_contratto TEXT UNIQUE NOT NULL,
            codice_cliente TEXT NOT NULL,
            pod TEXT,
            potenza REAL,
            consumo_annuo INTEGER,
            prezzo_energia REAL,
            fornitore TEXT,
            data_inizio DATE,
            data_fine DATE,
            stato TEXT DEFAULT 'attivo',
            data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (codice_cliente) REFERENCES clienti(codice_cliente)
        )`;
        
        // Crea tabella contratti gas
        const createContrattiGasSQL = `
        CREATE TABLE IF NOT EXISTS contratti_gas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_contratto TEXT UNIQUE NOT NULL,
            codice_cliente TEXT NOT NULL,
            pdr TEXT,
            consumo_annuo INTEGER,
            prezzo_gas REAL,
            fornitore TEXT,
            data_inizio DATE,
            data_fine DATE,
            stato TEXT DEFAULT 'attivo',
            data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (codice_cliente) REFERENCES clienti(codice_cliente)
        )`;
        
        db.serialize(() => {
            db.run(createClientiSQL, (err) => {
                if (err) console.error('❌ Errore creazione clienti:', err.message);
                else console.log('✅ Tabella clienti creata');
            });
            
            db.run(createContrattiLuceSQL, (err) => {
                if (err) console.error('❌ Errore creazione contratti_luce:', err.message);
                else console.log('✅ Tabella contratti_luce creata');
            });
            
            db.run(createContrattiGasSQL, (err) => {
                if (err) console.error('❌ Errore creazione contratti_gas:', err.message);
                else console.log('✅ Tabella contratti_gas creata');
                
                // Verifica finale
                setTimeout(() => {
                    db.get('SELECT COUNT(*) as count FROM clienti', [], (err, row) => {
                        if (err) {
                            console.error('❌ Errore verifica finale:', err.message);
                        } else {
                            console.log(`\n📊 Clienti attuali: ${row.count}`);
                        }
                        db.close();
                    });
                }, 1000);
            });
        });
        
    } else {
        console.log('\n✅ Tutte le tabelle richieste esistono');
        
        // Conta i record
        db.get('SELECT COUNT(*) as count FROM clienti', [], (err, row) => {
            if (err) {
                console.error('❌ Errore conteggio clienti:', err.message);
            } else {
                console.log(`📊 Clienti attuali: ${row.count}`);
            }
            db.close();
        });
    }
});