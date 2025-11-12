/**
 * Migrazione: Rende tutti i campi dei clienti opzionali (nullable)
 * Ricrea le tabelle clienti_privati e clienti_aziende senza vincoli NOT NULL
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../gestionale_energia.db');
const db = new Database(dbPath);

async function runMigration() {
    try {
        console.log('🚀 Inizio migrazione: Clienti Nullable...');
        
        db.pragma('foreign_keys = OFF');
        
        // ========================================
        // 1. BACKUP DATI ESISTENTI
        // ========================================
        
        console.log('📦 Backup dati clienti...');
        
        const clientiPrivatiData = db.prepare('SELECT * FROM clienti_privati').all();
        const clientiAziendeData = db.prepare('SELECT * FROM clienti_aziende').all();
        
        console.log(`   - ${clientiPrivatiData.length} clienti privati`);
        console.log(`   - ${clientiAziendeData.length} clienti aziende`);
        
        // ========================================
        // 2. DROP TABELLE ESISTENTI
        // ========================================
        
        console.log('🗑️  Drop tabelle esistenti...');
        
        db.exec('DROP TABLE IF EXISTS clienti_privati');
        db.exec('DROP TABLE IF EXISTS clienti_aziende');
        
        // ========================================
        // 3. RICREA CLIENTI_PRIVATI (tutti nullable)
        // ========================================
        
        console.log('🔨 Ricreazione clienti_privati...');
        
        db.exec(`
            CREATE TABLE clienti_privati (
                id TEXT PRIMARY KEY,
                
                -- Dati anagrafici (opzionali)
                nome TEXT,
                cognome TEXT,
                codice_fiscale TEXT,
                data_nascita TEXT,
                
                -- Contatti (opzionali)
                email_principale TEXT,
                email_secondaria TEXT,
                telefono_fisso TEXT,
                telefono_mobile TEXT,
                pec TEXT,
                
                -- Indirizzo residenza (opzionale)
                via_residenza TEXT,
                civico_residenza TEXT,
                cap_residenza TEXT,
                citta_residenza TEXT,
                provincia_residenza TEXT,
                
                -- Indirizzo fornitura (opzionale)
                via_fornitura TEXT,
                civico_fornitura TEXT,
                cap_fornitura TEXT,
                citta_fornitura TEXT,
                provincia_fornitura TEXT,
                
                -- Documento identità (opzionale)
                tipo_documento TEXT,
                numero_documento TEXT,
                ente_rilascio TEXT,
                data_scadenza_documento TEXT,
                
                -- Dati bancari (opzionale)
                iban TEXT,
                
                -- Preferenze comunicazione
                preferenza_email INTEGER DEFAULT 1,
                preferenza_sms INTEGER DEFAULT 1,
                preferenza_telefono INTEGER DEFAULT 1,
                
                -- Note
                note TEXT,
                
                -- Consensi
                consenso_privacy INTEGER DEFAULT 0,
                consenso_marketing INTEGER DEFAULT 0,
                data_consenso TEXT,
                
                -- Email Marketing
                newsletter_attiva INTEGER DEFAULT 1,
                unsubscribe_token TEXT,
                
                -- Audit
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT
            );
        `);
        
        console.log('✅ Tabella clienti_privati ricreata');
        
        // ========================================
        // 4. RICREA CLIENTI_AZIENDE (tutti nullable)
        // ========================================
        
        console.log('🔨 Ricreazione clienti_aziende...');
        
        db.exec(`
            CREATE TABLE clienti_aziende (
                id TEXT PRIMARY KEY,
                
                -- Dati aziendali (opzionali)
                ragione_sociale TEXT,
                partita_iva TEXT,
                codice_fiscale TEXT,
                codice_ateco TEXT,
                descrizione_ateco TEXT,
                pec_aziendale TEXT,
                
                -- Sede legale (opzionale)
                via_sede_legale TEXT,
                civico_sede_legale TEXT,
                cap_sede_legale TEXT,
                citta_sede_legale TEXT,
                provincia_sede_legale TEXT,
                
                -- Sede operativa (opzionale)
                via_sede_operativa TEXT,
                civico_sede_operativa TEXT,
                cap_sede_operativa TEXT,
                citta_sede_operativa TEXT,
                provincia_sede_operativa TEXT,
                
                -- Referente (opzionale)
                nome_referente TEXT,
                cognome_referente TEXT,
                ruolo_referente TEXT,
                email_referente TEXT,
                telefono_referente TEXT,
                
                -- Info azienda (opzionale)
                dimensione_azienda TEXT,
                settore_merceologico TEXT,
                fatturato_annuo REAL,
                
                -- Dati bancari (opzionale)
                iban_aziendale TEXT,
                codice_sdi TEXT,
                
                -- Note
                note TEXT,
                
                -- Consensi
                consenso_privacy INTEGER DEFAULT 0,
                consenso_marketing INTEGER DEFAULT 0,
                data_consenso TEXT,
                
                -- Email Marketing
                newsletter_attiva INTEGER DEFAULT 1,
                unsubscribe_token TEXT,
                
                -- Audit
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT
            );
        `);
        
        console.log('✅ Tabella clienti_aziende ricreata');
        
        // ========================================
        // 5. RIPRISTINA DATI (se esistenti)
        // ========================================
        
        if (clientiPrivatiData.length > 0) {
            console.log('📥 Ripristino clienti privati...');
            
            const insertPrivati = db.prepare(`
                INSERT INTO clienti_privati (
                    id, nome, cognome, codice_fiscale, data_nascita, email_principale,
                    email_secondaria, telefono_fisso, telefono_mobile, pec,
                    via_residenza, civico_residenza, cap_residenza, citta_residenza, provincia_residenza,
                    via_fornitura, civico_fornitura, cap_fornitura, citta_fornitura, provincia_fornitura,
                    tipo_documento, numero_documento, ente_rilascio, data_scadenza_documento,
                    iban, preferenza_email, preferenza_sms, preferenza_telefono, note,
                    consenso_privacy, consenso_marketing, data_consenso,
                    newsletter_attiva, unsubscribe_token,
                    created_at, updated_at, created_by
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `);
            
            for (const row of clientiPrivatiData) {
                const r = row as any;
                insertPrivati.run(
                    r.id, r.nome, r.cognome, r.codice_fiscale, r.data_nascita, r.email_principale,
                    r.email_secondaria, r.telefono_fisso, r.telefono_mobile, r.pec,
                    r.via_residenza, r.civico_residenza, r.cap_residenza, r.citta_residenza, r.provincia_residenza,
                    r.via_fornitura, r.civico_fornitura, r.cap_fornitura, r.citta_fornitura, r.provincia_fornitura,
                    r.tipo_documento, r.numero_documento, r.ente_rilascio, r.data_scadenza_documento,
                    r.iban, r.preferenza_email, r.preferenza_sms, r.preferenza_telefono, r.note,
                    r.consenso_privacy, r.consenso_marketing, r.data_consenso,
                    r.newsletter_attiva, r.unsubscribe_token,
                    r.created_at, r.updated_at, r.created_by
                );
            }
            
            console.log(`✅ ${clientiPrivatiData.length} clienti privati ripristinati`);
        }
        
        if (clientiAziendeData.length > 0) {
            console.log('📥 Ripristino clienti aziende...');
            
            const insertAziende = db.prepare(`
                INSERT INTO clienti_aziende (
                    id, ragione_sociale, partita_iva, codice_fiscale, codice_ateco, descrizione_ateco, pec_aziendale,
                    via_sede_legale, civico_sede_legale, cap_sede_legale, citta_sede_legale, provincia_sede_legale,
                    via_sede_operativa, civico_sede_operativa, cap_sede_operativa, citta_sede_operativa, provincia_sede_operativa,
                    nome_referente, cognome_referente, ruolo_referente, email_referente, telefono_referente,
                    dimensione_azienda, settore_merceologico, fatturato_annuo, iban_aziendale, codice_sdi,
                    note, consenso_privacy, consenso_marketing, data_consenso,
                    newsletter_attiva, unsubscribe_token,
                    created_at, updated_at, created_by
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `);
            
            for (const row of clientiAziendeData) {
                const r = row as any;
                insertAziende.run(
                    r.id, r.ragione_sociale, r.partita_iva, r.codice_fiscale, r.codice_ateco, r.descrizione_ateco, r.pec_aziendale,
                    r.via_sede_legale, r.civico_sede_legale, r.cap_sede_legale, r.citta_sede_legale, r.provincia_sede_legale,
                    r.via_sede_operativa, r.civico_sede_operativa, r.cap_sede_operativa, r.citta_sede_operativa, r.provincia_sede_operativa,
                    r.nome_referente, r.cognome_referente, r.ruolo_referente, r.email_referente, r.telefono_referente,
                    r.dimensione_azienda, r.settore_merceologico, r.fatturato_annuo, r.iban_aziendale, r.codice_sdi,
                    r.note, r.consenso_privacy, r.consenso_marketing, r.data_consenso,
                    r.newsletter_attiva, r.unsubscribe_token,
                    r.created_at, r.updated_at, r.created_by
                );
            }
            
            console.log(`✅ ${clientiAziendeData.length} clienti aziende ripristinati`);
        }
        
        // ========================================
        // 6. RICREA INDICI
        // ========================================
        
        console.log('🔍 Creazione indici...');
        
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_privati_codice_fiscale ON clienti_privati(codice_fiscale);
            CREATE INDEX IF NOT EXISTS idx_privati_email ON clienti_privati(email_principale);
            CREATE INDEX IF NOT EXISTS idx_aziende_partita_iva ON clienti_aziende(partita_iva);
            CREATE INDEX IF NOT EXISTS idx_aziende_email ON clienti_aziende(email_referente);
        `);
        
        console.log('✅ Indici creati');
        
        db.pragma('foreign_keys = ON');
        
        console.log('');
        console.log('✅ MIGRAZIONE COMPLETATA!');
        console.log('   Tutti i campi clienti sono ora OPZIONALI');
        
        db.close();
        
    } catch (error) {
        console.error('❌ Errore migrazione:', error);
        db.close();
        process.exit(1);
    }
}

runMigration();

