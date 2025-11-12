const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 CREAZIONE TABELLE CORRETTE PER IMPORT');
console.log('========================================\n');

// Crea tabella clienti_privati
const createClientiPrivatiSQL = `
CREATE TABLE IF NOT EXISTS clienti_privati (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    codice_fiscale TEXT UNIQUE,
    email_principale TEXT,
    telefono_principale TEXT,
    data_nascita DATE,
    luogo_nascita TEXT,
    indirizzo_residenza TEXT,
    citta_residenza TEXT,
    cap_residenza TEXT,
    provincia_residenza TEXT,
    indirizzo_fornitura TEXT,
    citta_fornitura TEXT,
    cap_fornitura TEXT,
    provincia_fornitura TEXT,
    stato_cliente TEXT DEFAULT 'da_attivare',
    commissione_pattuita REAL,
    assigned_agent_id TEXT,
    iban TEXT,
    preferenza_email INTEGER DEFAULT 1,
    preferenza_sms INTEGER DEFAULT 1,
    preferenza_telefono INTEGER DEFAULT 1,
    note TEXT,
    consenso_privacy INTEGER DEFAULT 0,
    consenso_marketing INTEGER DEFAULT 0,
    data_consenso DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

// Crea tabella clienti_aziende
const createClientiAziendeSQL = `
CREATE TABLE IF NOT EXISTS clienti_aziende (
    id TEXT PRIMARY KEY,
    ragione_sociale TEXT NOT NULL,
    partita_iva TEXT UNIQUE,
    codice_fiscale TEXT,
    email_principale TEXT,
    telefono_principale TEXT,
    indirizzo_sede_legale TEXT,
    citta_sede_legale TEXT,
    cap_sede_legale TEXT,
    provincia_sede_legale TEXT,
    settore_attivita TEXT,
    numero_dipendenti INTEGER,
    fatturato_annuo REAL,
    nome_referente TEXT,
    cognome_referente TEXT,
    email_referente TEXT,
    telefono_referente TEXT,
    assigned_agent_id TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

// Aggiorna tabella contratti_luce per compatibilità
const updateContrattiLuceSQL = `
CREATE TABLE IF NOT EXISTS contratti_luce_new (
    id TEXT PRIMARY KEY,
    numero_contratto TEXT UNIQUE,
    pod TEXT UNIQUE,
    cliente_privato_id TEXT,
    cliente_azienda_id TEXT,
    potenza REAL,
    consumo_annuo INTEGER,
    prezzo_energia REAL,
    fornitore TEXT,
    data_inizio DATE,
    data_fine DATE,
    stato TEXT DEFAULT 'attivo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_privato_id) REFERENCES clienti_privati(id),
    FOREIGN KEY (cliente_azienda_id) REFERENCES clienti_aziende(id)
)`;

// Aggiorna tabella contratti_gas per compatibilità
const updateContrattiGasSQL = `
CREATE TABLE IF NOT EXISTS contratti_gas_new (
    id TEXT PRIMARY KEY,
    numero_contratto TEXT UNIQUE,
    pdr TEXT UNIQUE,
    cliente_privato_id TEXT,
    cliente_azienda_id TEXT,
    consumo_annuo INTEGER,
    prezzo_gas REAL,
    fornitore TEXT,
    data_inizio DATE,
    data_fine DATE,
    stato TEXT DEFAULT 'attivo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_privato_id) REFERENCES clienti_privati(id),
    FOREIGN KEY (cliente_azienda_id) REFERENCES clienti_aziende(id)
)`;

db.serialize(() => {
    console.log('🔧 Creazione tabella clienti_privati...');
    db.run(createClientiPrivatiSQL, (err) => {
        if (err) {
            console.error('❌ Errore creazione clienti_privati:', err.message);
        } else {
            console.log('✅ Tabella clienti_privati creata/verificata');
        }
    });

    console.log('🔧 Creazione tabella clienti_aziende...');
    db.run(createClientiAziendeSQL, (err) => {
        if (err) {
            console.error('❌ Errore creazione clienti_aziende:', err.message);
        } else {
            console.log('✅ Tabella clienti_aziende creata/verificata');
        }
    });

    // Backup e ricreazione contratti_luce se necessario
    console.log('🔧 Aggiornamento tabella contratti_luce...');
    db.run('DROP TABLE IF EXISTS contratti_luce_old', () => {
        db.run('ALTER TABLE contratti_luce RENAME TO contratti_luce_old', () => {
            db.run(updateContrattiLuceSQL.replace('contratti_luce_new', 'contratti_luce'), (err) => {
                if (err) {
                    console.error('❌ Errore aggiornamento contratti_luce:', err.message);
                } else {
                    console.log('✅ Tabella contratti_luce aggiornata');
                }
            });
        });
    });

    // Backup e ricreazione contratti_gas se necessario
    console.log('🔧 Aggiornamento tabella contratti_gas...');
    db.run('DROP TABLE IF EXISTS contratti_gas_old', () => {
        db.run('ALTER TABLE contratti_gas RENAME TO contratti_gas_old', () => {
            db.run(updateContrattiGasSQL.replace('contratti_gas_new', 'contratti_gas'), (err) => {
                if (err) {
                    console.error('❌ Errore aggiornamento contratti_gas:', err.message);
                } else {
                    console.log('✅ Tabella contratti_gas aggiornata');
                }

                // Verifica finale
                setTimeout(() => {
                    console.log('\n🔍 Verifica finale tabelle...');
                    
                    db.get('SELECT COUNT(*) as count FROM clienti_privati', [], (err, row) => {
                        if (err) {
                            console.error('❌ Errore verifica clienti_privati:', err.message);
                        } else {
                            console.log(`📊 Clienti privati: ${row.count}`);
                        }
                        
                        db.get('SELECT COUNT(*) as count FROM clienti_aziende', [], (err, row) => {
                            if (err) {
                                console.error('❌ Errore verifica clienti_aziende:', err.message);
                            } else {
                                console.log(`📊 Clienti aziende: ${row.count}`);
                            }
                            
                            console.log('\n✅ Setup tabelle completato!');
                            db.close();
                        });
                    });
                }, 2000);
            });
        });
    });
});