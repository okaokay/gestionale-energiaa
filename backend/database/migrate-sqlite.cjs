/**
 * Script migrazione SQLite
 * Crea database e dati iniziali
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '../../gestionale_energia.db');
const db = new Database(dbPath);

async function runMigration() {
    try {
        console.log('🚀 Inizio migrazione SQLite...');
        
        // Abilita foreign keys
        db.pragma('foreign_keys = ON');
        
        // Tabella users
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                nome TEXT NOT NULL,
                cognome TEXT NOT NULL,
                ruolo TEXT NOT NULL CHECK (ruolo IN ('super_admin', 'admin', 'operatore', 'visualizzatore')),
                attivo INTEGER DEFAULT 1,
                ultimo_accesso TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log('✅ Tabella users creata');
        
        // Inserisci Super Admin
        const passwordHash = await bcrypt.hash('Admin123!', 10);
        const adminId = randomUUID();
        
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO users (id, email, password_hash, nome, cognome, ruolo, attivo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(adminId, 'admin@gestionale.it', passwordHash, 'Super', 'Admin', 'super_admin', 1);
        
        console.log('✅ Utente Super Admin creato');
        console.log('   Email: admin@gestionale.it');
        console.log('   Password: Admin123!');
        
        // Tabelle clienti
        db.exec(`
            CREATE TABLE IF NOT EXISTS clienti_privati (
                id TEXT PRIMARY KEY,
                nome TEXT,
                cognome TEXT,
                codice_fiscale TEXT UNIQUE,
                data_nascita TEXT,
                email_principale TEXT,
                email_secondaria TEXT,
                telefono_mobile TEXT,
                telefono_fisso TEXT,
                pec TEXT,
                via_residenza TEXT,
                civico_residenza TEXT,
                cap_residenza TEXT,
                citta_residenza TEXT,
                provincia_residenza TEXT,
                via_fornitura TEXT,
                civico_fornitura TEXT,
                cap_fornitura TEXT,
                citta_fornitura TEXT,
                provincia_fornitura TEXT,
                tipo_documento TEXT,
                numero_documento TEXT,
                ente_rilascio TEXT,
                data_scadenza_documento TEXT,
                iban TEXT,
                consenso_privacy INTEGER DEFAULT 0,
                consenso_marketing INTEGER DEFAULT 0,
                data_consenso TEXT,
                note TEXT,
                created_by TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS clienti_aziende (
                id TEXT PRIMARY KEY,
                ragione_sociale TEXT,
                partita_iva TEXT UNIQUE,
                codice_fiscale TEXT,
                codice_ateco TEXT,
                email_principale TEXT,
                email_secondaria TEXT,
                telefono_principale TEXT,
                telefono_secondario TEXT,
                pec TEXT,
                via_sede_legale TEXT,
                civico_sede_legale TEXT,
                cap_sede_legale TEXT,
                citta_sede_legale TEXT,
                provincia_sede_legale TEXT,
                via_sede_operativa TEXT,
                civico_sede_operativa TEXT,
                cap_sede_operativa TEXT,
                citta_sede_operativa TEXT,
                provincia_sede_operativa TEXT,
                nome_referente TEXT,
                cognome_referente TEXT,
                email_referente TEXT,
                telefono_referente TEXT,
                ruolo_referente TEXT,
                iban TEXT,
                consenso_privacy INTEGER DEFAULT 0,
                consenso_marketing INTEGER DEFAULT 0,
                data_consenso TEXT,
                note TEXT,
                created_by TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log('✅ Tabelle clienti create');
        
        // Tabelle contratti
        db.exec(`
            CREATE TABLE IF NOT EXISTS contratti_luce (
                id TEXT PRIMARY KEY,
                cliente_privato_id TEXT,
                cliente_azienda_id TEXT,
                tipo_cliente TEXT NOT NULL,
                numero_contratto TEXT UNIQUE NOT NULL,
                pod TEXT NOT NULL,
                fornitore TEXT NOT NULL,
                data_attivazione TEXT NOT NULL,
                data_scadenza TEXT NOT NULL,
                prezzo_energia REAL NOT NULL,
                stato TEXT DEFAULT 'attivo',
                created_by TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cliente_privato_id) REFERENCES clienti_privati(id) ON DELETE CASCADE,
                FOREIGN KEY (cliente_azienda_id) REFERENCES clienti_aziende(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS contratti_gas (
                id TEXT PRIMARY KEY,
                cliente_privato_id TEXT,
                cliente_azienda_id TEXT,
                tipo_cliente TEXT NOT NULL,
                numero_contratto TEXT UNIQUE NOT NULL,
                pdr TEXT NOT NULL,
                fornitore TEXT NOT NULL,
                data_attivazione TEXT NOT NULL,
                data_scadenza TEXT NOT NULL,
                prezzo_gas REAL NOT NULL,
                stato TEXT DEFAULT 'attivo',
                created_by TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cliente_privato_id) REFERENCES clienti_privati(id) ON DELETE CASCADE,
                FOREIGN KEY (cliente_azienda_id) REFERENCES clienti_aziende(id) ON DELETE CASCADE
            );
        `);
        
        console.log('✅ Tabelle contratti create');

        // Colonne aggiuntive per compatibilità con le API contratti
        const addCols = [
            // contratti_luce
            { table: 'contratti_luce', name: 'data_inizio', sql: 'ALTER TABLE contratti_luce ADD COLUMN data_inizio TEXT' },
            { table: 'contratti_luce', name: 'data_fine', sql: 'ALTER TABLE contratti_luce ADD COLUMN data_fine TEXT' },
            { table: 'contratti_luce', name: 'note', sql: 'ALTER TABLE contratti_luce ADD COLUMN note TEXT' },
            { table: 'contratti_luce', name: 'data_stipula', sql: 'ALTER TABLE contratti_luce ADD COLUMN data_stipula TEXT' },
            { table: 'contratti_luce', name: 'agente', sql: 'ALTER TABLE contratti_luce ADD COLUMN agente TEXT' },
            { table: 'contratti_luce', name: 'nome_offerta', sql: 'ALTER TABLE contratti_luce ADD COLUMN nome_offerta TEXT' },
            { table: 'contratti_luce', name: 'validita_offerta', sql: 'ALTER TABLE contratti_luce ADD COLUMN validita_offerta TEXT' },
            { table: 'contratti_luce', name: 'commodity', sql: 'ALTER TABLE contratti_luce ADD COLUMN commodity TEXT' },
            { table: 'contratti_luce', name: 'procedure', sql: 'ALTER TABLE contratti_luce ADD COLUMN procedure TEXT' },
            { table: 'contratti_luce', name: 'pdp', sql: 'ALTER TABLE contratti_luce ADD COLUMN pdp TEXT' },
            { table: 'contratti_luce', name: 'tipo_offerta', sql: 'ALTER TABLE contratti_luce ADD COLUMN tipo_offerta TEXT' },
            { table: 'contratti_luce', name: 'updated_at', sql: "ALTER TABLE contratti_luce ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP" },

            // contratti_gas
            { table: 'contratti_gas', name: 'data_inizio', sql: 'ALTER TABLE contratti_gas ADD COLUMN data_inizio TEXT' },
            { table: 'contratti_gas', name: 'data_fine', sql: 'ALTER TABLE contratti_gas ADD COLUMN data_fine TEXT' },
            { table: 'contratti_gas', name: 'note', sql: 'ALTER TABLE contratti_gas ADD COLUMN note TEXT' },
            { table: 'contratti_gas', name: 'data_stipula', sql: 'ALTER TABLE contratti_gas ADD COLUMN data_stipula TEXT' },
            { table: 'contratti_gas', name: 'agente', sql: 'ALTER TABLE contratti_gas ADD COLUMN agente TEXT' },
            { table: 'contratti_gas', name: 'nome_offerta', sql: 'ALTER TABLE contratti_gas ADD COLUMN nome_offerta TEXT' },
            { table: 'contratti_gas', name: 'validita_offerta', sql: 'ALTER TABLE contratti_gas ADD COLUMN validita_offerta TEXT' },
            { table: 'contratti_gas', name: 'commodity', sql: 'ALTER TABLE contratti_gas ADD COLUMN commodity TEXT' },
            { table: 'contratti_gas', name: 'procedure', sql: 'ALTER TABLE contratti_gas ADD COLUMN procedure TEXT' },
            { table: 'contratti_gas', name: 'pdp', sql: 'ALTER TABLE contratti_gas ADD COLUMN pdp TEXT' },
            { table: 'contratti_gas', name: 'tipo_offerta', sql: 'ALTER TABLE contratti_gas ADD COLUMN tipo_offerta TEXT' },
            { table: 'contratti_gas', name: 'updated_at', sql: "ALTER TABLE contratti_gas ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP" }
        ];

        for (const col of addCols) {
            try {
                db.exec(col.sql);
                console.log(`   ✅ Aggiunta colonna ${col.table}.${col.name}`);
            } catch (e) {
                if (typeof e.message === 'string' && e.message.includes('duplicate column name')) {
                    console.log(`   ⚠️  ${col.table}.${col.name} già presente, skip`);
                } else {
                    console.log(`   ⚠️  Impossibile aggiungere ${col.table}.${col.name}:`, e.message || e);
                }
            }
        }
        
        // Tabella offerte
        db.exec(`
            CREATE TABLE IF NOT EXISTS offerte (
                id TEXT PRIMARY KEY,
                nome_offerta TEXT NOT NULL,
                fornitore TEXT NOT NULL,
                tipo_energia TEXT NOT NULL,
                data_inizio_validita TEXT NOT NULL,
                data_fine_validita TEXT NOT NULL,
                prezzo_luce REAL,
                prezzo_gas REAL,
                costo_fisso_mensile_luce REAL,
                costo_fisso_mensile_gas REAL,
                durata_vincolo_mesi INTEGER,
                target_clienti TEXT NOT NULL,
                consumo_minimo_kwh REAL,
                consumo_massimo_kwh REAL,
                codici_ateco_ammessi TEXT,
                condizioni_particolari TEXT,
                pdf_filename TEXT,
                pdf_path TEXT,
                dati_estratti_ai TEXT,
                stato TEXT DEFAULT 'attiva',
                analizzato_da_ai INTEGER DEFAULT 0,
                creato_da TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (creato_da) REFERENCES users(id)
            );
        `);
        
        console.log('✅ Tabella offerte creata');
        
        console.log('\n🎉 Migrazione completata con successo!');
        console.log('📊 Database SQLite pronto per l\'uso');
        
    } catch (error) {
        console.error('❌ Errore durante la migrazione:', error);
        throw error;
    } finally {
        db.close();
    }
}

// Esegui migrazione
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('\n✅ Script migrazione completato!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Errore nell\'esecuzione della migrazione:', error);
            process.exit(1);
        });
}

module.exports = { runMigration };