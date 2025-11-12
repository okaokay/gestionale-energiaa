/**
 * Script migrazione SQLite
 * Crea database e dati iniziali
 */

import Database from 'better-sqlite3';
import * as bcrypt from 'bcryptjs';
import path from 'path';
import { randomUUID } from 'crypto';

// Usa variabile d'ambiente DATABASE_PATH se disponibile,
// altrimenti crea il DB nella working directory del processo (/app in Docker)
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'gestionale_energia.db');
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
        
        // Tabelle clienti (campi opzionali per supportare import parziali)
        db.exec(`
            CREATE TABLE IF NOT EXISTS clienti_privati (
                id TEXT PRIMARY KEY,
                nome TEXT,
                cognome TEXT,
                codice_fiscale TEXT UNIQUE,
                data_nascita TEXT,
                email_principale TEXT,
                telefono_mobile TEXT,
                via_residenza TEXT,
                citta_residenza TEXT,
                consenso_privacy INTEGER DEFAULT 0,
                consenso_marketing INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS clienti_aziende (
                id TEXT PRIMARY KEY,
                ragione_sociale TEXT,
                partita_iva TEXT UNIQUE,
                codice_ateco TEXT,
                email_referente TEXT,
                telefono_referente TEXT,
                citta_sede_legale TEXT,
                consenso_privacy INTEGER DEFAULT 0,
                consenso_marketing INTEGER DEFAULT 0,
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
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cliente_privato_id) REFERENCES clienti_privati(id) ON DELETE CASCADE,
                FOREIGN KEY (cliente_azienda_id) REFERENCES clienti_aziende(id) ON DELETE CASCADE
            );
        `);
        
        console.log('✅ Tabelle contratti create');

        // ===============================================
        // TABELLE: gestione azioni/promemoria/SMS/AI cliente
        // ===============================================
        console.log('👤 Creazione tabelle attività cliente...');
        db.exec(`
            -- Storico azioni cliente
            CREATE TABLE IF NOT EXISTS cliente_azioni (
                id TEXT PRIMARY KEY,
                cliente_id TEXT NOT NULL,
                tipo_cliente TEXT NOT NULL CHECK (tipo_cliente IN ('privato','azienda')),
                tipo_azione TEXT NOT NULL,
                titolo TEXT NOT NULL,
                descrizione TEXT,
                esito TEXT,
                utente_id TEXT,
                metadata TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_cliente_azioni_cliente ON cliente_azioni(cliente_id);
            CREATE INDEX IF NOT EXISTS idx_cliente_azioni_tipo ON cliente_azioni(tipo_cliente);
            CREATE INDEX IF NOT EXISTS idx_cliente_azioni_created ON cliente_azioni(created_at);

            -- Promemoria / follow-up cliente
            CREATE TABLE IF NOT EXISTS cliente_promemoria (
                id TEXT PRIMARY KEY,
                cliente_id TEXT NOT NULL,
                tipo_cliente TEXT NOT NULL CHECK (tipo_cliente IN ('privato','azienda')),
                titolo TEXT NOT NULL,
                descrizione TEXT,
                tipo_promemoria TEXT NOT NULL,
                data_scadenza TEXT,
                priorita TEXT DEFAULT 'media',
                stato TEXT DEFAULT 'attivo',
                assegnato_a TEXT,
                created_by TEXT,
                completato_da TEXT,
                completato_il TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_cliente_promemoria_cliente ON cliente_promemoria(cliente_id);
            CREATE INDEX IF NOT EXISTS idx_cliente_promemoria_scadenza ON cliente_promemoria(data_scadenza);
            CREATE INDEX IF NOT EXISTS idx_cliente_promemoria_stato ON cliente_promemoria(stato);

            -- SMS cliente
            CREATE TABLE IF NOT EXISTS cliente_sms (
                id TEXT PRIMARY KEY,
                cliente_id TEXT NOT NULL,
                tipo_cliente TEXT NOT NULL CHECK (tipo_cliente IN ('privato','azienda')),
                numero_destinatario TEXT NOT NULL,
                testo TEXT NOT NULL,
                stato TEXT DEFAULT 'in_coda',
                inviato_da TEXT,
                inviato_il TEXT DEFAULT CURRENT_TIMESTAMP,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_cliente_sms_cliente ON cliente_sms(cliente_id);
            CREATE INDEX IF NOT EXISTS idx_cliente_sms_inviato_il ON cliente_sms(inviato_il);

            -- Suggerimenti AI per cliente
            CREATE TABLE IF NOT EXISTS cliente_ai_suggerimenti (
                id TEXT PRIMARY KEY,
                cliente_id TEXT NOT NULL,
                tipo_cliente TEXT NOT NULL CHECK (tipo_cliente IN ('privato','azienda')),
                tipo_suggerimento TEXT NOT NULL,
                titolo TEXT NOT NULL,
                descrizione TEXT,
                azione_suggerita TEXT,
                priorita INTEGER DEFAULT 5,
                motivo TEXT,
                stato TEXT DEFAULT 'attivo',
                applicato_da TEXT,
                applicato_il TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_cliente_ai_cliente ON cliente_ai_suggerimenti(cliente_id);
            CREATE INDEX IF NOT EXISTS idx_cliente_ai_stato ON cliente_ai_suggerimenti(stato);
            CREATE INDEX IF NOT EXISTS idx_cliente_ai_priorita ON cliente_ai_suggerimenti(priorita);
        `);
        console.log('✅ Tabelle attività cliente create');

        // Colonne per ultimo contatto sui clienti (usate dalle rotte clientActions)
        console.log('🔧 Verifica/Aggiunta colonne ultimo contatto su clienti...');
        try { db.exec("ALTER TABLE clienti_privati ADD COLUMN data_ultimo_contatto TEXT"); console.log('   ✅ clienti_privati.data_ultimo_contatto aggiunta'); } catch (e:any) { if ((e.message||'').includes('duplicate column name')) { console.log('   ⚠️  clienti_privati.data_ultimo_contatto già presente'); } else { console.log('   ⚠️  Impossibile aggiungere data_ultimo_contatto su clienti_privati:', e.message||e); } }
        try { db.exec("ALTER TABLE clienti_privati ADD COLUMN tipo_ultimo_contatto TEXT"); console.log('   ✅ clienti_privati.tipo_ultimo_contatto aggiunta'); } catch (e:any) { if ((e.message||'').includes('duplicate column name')) { console.log('   ⚠️  clienti_privati.tipo_ultimo_contatto già presente'); } else { console.log('   ⚠️  Impossibile aggiungere tipo_ultimo_contatto su clienti_privati:', e.message||e); } }
        try { db.exec("ALTER TABLE clienti_aziende ADD COLUMN data_ultimo_contatto TEXT"); console.log('   ✅ clienti_aziende.data_ultimo_contatto aggiunta'); } catch (e:any) { if ((e.message||'').includes('duplicate column name')) { console.log('   ⚠️  clienti_aziende.data_ultimo_contatto già presente'); } else { console.log('   ⚠️  Impossibile aggiungere data_ultimo_contatto su clienti_aziende:', e.message||e); } }
        try { db.exec("ALTER TABLE clienti_aziende ADD COLUMN tipo_ultimo_contatto TEXT"); console.log('   ✅ clienti_aziende.tipo_ultimo_contatto aggiunta'); } catch (e:any) { if ((e.message||'').includes('duplicate column name')) { console.log('   ⚠️  clienti_aziende.tipo_ultimo_contatto già presente'); } else { console.log('   ⚠️  Impossibile aggiungere tipo_ultimo_contatto su clienti_aziende:', e.message||e); } }

        // ===============================================
        // TABELLA: contabilita_movimenti
        // ===============================================
        console.log('💰 Creazione tabella contabilita_movimenti...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS contabilita_movimenti (
                id TEXT PRIMARY KEY,
                tipo TEXT NOT NULL,
                agent_id TEXT,
                cliente_id TEXT,
                cliente_tipo TEXT CHECK (cliente_tipo IN ('privato','azienda')),
                importo REAL NOT NULL,
                descrizione TEXT,
                stato TEXT DEFAULT 'maturato' CHECK (stato IN ('maturato','da_pagare','pagato','annullato')),
                data_movimento TEXT DEFAULT CURRENT_TIMESTAMP,
                data_pagamento TEXT,
                note TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_movimenti_agent ON contabilita_movimenti(agent_id);`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_movimenti_tipo ON contabilita_movimenti(tipo);`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_movimenti_stato ON contabilita_movimenti(stato);`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_movimenti_data_movimento ON contabilita_movimenti(data_movimento);`);
        console.log('✅ Tabella contabilita_movimenti creata con indici');

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

        // ===============================================
        // PATCH: colonne mancanti su users per compatibilità
        // ===============================================
        console.log('🧩 Verifica/Aggiunta colonne utenti mancanti...');
        const userColsToAdd = [
            { sql: "ALTER TABLE users ADD COLUMN role TEXT", name: 'role' },
            { sql: "ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1", name: 'is_active' },
            { sql: "ALTER TABLE users ADD COLUMN parent_id TEXT", name: 'parent_id' },
            { sql: "ALTER TABLE users ADD COLUMN agency_name TEXT", name: 'agency_name' },
            { sql: "ALTER TABLE users ADD COLUMN phone TEXT", name: 'phone' },
            { sql: "ALTER TABLE users ADD COLUMN commissioni_luce_default REAL DEFAULT 0", name: 'commissioni_luce_default' },
            { sql: "ALTER TABLE users ADD COLUMN commissioni_gas_default REAL DEFAULT 0", name: 'commissioni_gas_default' }
        ];
        for (const col of userColsToAdd) {
            try {
                db.exec(col.sql);
                console.log(`   ✅ Aggiunta colonna users.${col.name}`);
            } catch (e: any) {
                if (typeof e.message === 'string' && e.message.includes('duplicate column name')) {
                    console.log(`   ⚠️  users.${col.name} già presente, skip`);
                } else {
                    console.log(`   ⚠️  Impossibile aggiungere users.${col.name} (potrebbe già esistere):`, e.message || e);
                }
            }
        }

        // ===============================================
        // PATCH: colonne mancanti per compatibilità query
        // ===============================================
        console.log('🧩 Verifica/Aggiunta colonne mancanti...');
        try {
            db.exec(`
                ALTER TABLE clienti_privati ADD COLUMN codice_cliente TEXT;
            `);
            console.log('   ✅ Aggiunta colonna clienti_privati.codice_cliente');
        } catch (e: any) {
            if (typeof e.message === 'string' && e.message.includes('duplicate column name')) {
                console.log('   ⚠️  codice_cliente già presente su clienti_privati, skip');
            } else {
                console.log('   ⚠️  Impossibile aggiungere codice_cliente (potrebbe già esistere):', e.message || e);
            }
        }

        // scheduled_end_at verrà aggiunta dopo la creazione della tabella email_campaigns

        // Colonne aggiuntive richieste da /api/clienti (privati)
        const addPrivatiColumns = [
            { sql: "ALTER TABLE clienti_privati ADD COLUMN provincia_residenza TEXT", name: 'provincia_residenza' },
            { sql: "ALTER TABLE clienti_privati ADD COLUMN incomplete_data INTEGER DEFAULT 0", name: 'incomplete_data' },
            { sql: "ALTER TABLE clienti_privati ADD COLUMN missing_fields TEXT", name: 'missing_fields' },
            { sql: "ALTER TABLE clienti_privati ADD COLUMN data_quality_score INTEGER DEFAULT 0", name: 'data_quality_score' },
            { sql: "ALTER TABLE clienti_privati ADD COLUMN stato TEXT", name: 'stato' },
            { sql: "ALTER TABLE clienti_privati ADD COLUMN assigned_agent_id TEXT", name: 'assigned_agent_id' },
            { sql: "ALTER TABLE clienti_privati ADD COLUMN commissione_pattuita REAL", name: 'commissione_pattuita' },
            { sql: "ALTER TABLE clienti_privati ADD COLUMN commissione_pagata INTEGER DEFAULT 0", name: 'commissione_pagata' }
        ];
        for (const col of addPrivatiColumns) {
            try {
                db.exec(col.sql);
                console.log(`   ✅ Aggiunta colonna clienti_privati.${col.name}`);
            } catch (e: any) {
                if (typeof e.message === 'string' && e.message.includes('duplicate column name')) {
                    console.log(`   ⚠️  ${col.name} già presente su clienti_privati, skip`);
                } else {
                    console.log(`   ⚠️  Impossibile aggiungere ${col.name} su clienti_privati (potrebbe già esistere):`, e.message || e);
                }
            }
        }

        // Colonne aggiuntive richieste da /api/clienti (aziende)
        const addAziendeColumns = [
            { sql: "ALTER TABLE clienti_aziende ADD COLUMN provincia_sede_legale TEXT", name: 'provincia_sede_legale' },
            { sql: "ALTER TABLE clienti_aziende ADD COLUMN codice_cliente TEXT", name: 'codice_cliente' },
            { sql: "ALTER TABLE clienti_aziende ADD COLUMN stato TEXT", name: 'stato' },
            { sql: "ALTER TABLE clienti_aziende ADD COLUMN assigned_agent_id TEXT", name: 'assigned_agent_id' },
            { sql: "ALTER TABLE clienti_aziende ADD COLUMN commissione_pattuita REAL", name: 'commissione_pattuita' },
            { sql: "ALTER TABLE clienti_aziende ADD COLUMN commissione_pagata INTEGER DEFAULT 0", name: 'commissione_pagata' },
            { sql: "ALTER TABLE clienti_aziende ADD COLUMN email_principale TEXT", name: 'email_principale' },
            { sql: "ALTER TABLE clienti_aziende ADD COLUMN incomplete_data INTEGER DEFAULT 0", name: 'incomplete_data' },
            { sql: "ALTER TABLE clienti_aziende ADD COLUMN missing_fields TEXT", name: 'missing_fields' },
            { sql: "ALTER TABLE clienti_aziende ADD COLUMN data_quality_score INTEGER DEFAULT 0", name: 'data_quality_score' }
        ];
        for (const col of addAziendeColumns) {
            try {
                db.exec(col.sql);
                console.log(`   ✅ Aggiunta colonna clienti_aziende.${col.name}`);
            } catch (e: any) {
                if (typeof e.message === 'string' && e.message.includes('duplicate column name')) {
                    console.log(`   ⚠️  ${col.name} già presente su clienti_aziende, skip`);
                } else {
                    console.log(`   ⚠️  Impossibile aggiungere ${col.name} su clienti_aziende (potrebbe già esistere):`, e.message || e);
                }
            }
        }

        // Colonne necessarie per ordinamento stato contratti (data_inizio)
        const addContrattiColumns = [
            { table: 'contratti_luce', name: 'data_inizio', sql: 'ALTER TABLE contratti_luce ADD COLUMN data_inizio TEXT' },
            { table: 'contratti_gas', name: 'data_inizio', sql: 'ALTER TABLE contratti_gas ADD COLUMN data_inizio TEXT' },
            { table: 'contratti_luce', name: 'data_fine', sql: 'ALTER TABLE contratti_luce ADD COLUMN data_fine TEXT' },
            { table: 'contratti_gas', name: 'data_fine', sql: 'ALTER TABLE contratti_gas ADD COLUMN data_fine TEXT' }
        ];
        for (const col of addContrattiColumns) {
            try {
                db.exec(col.sql);
                console.log(`   ✅ Aggiunta colonna ${col.table}.${col.name}`);
            } catch (e: any) {
                if (typeof e.message === 'string' && e.message.includes('duplicate column name')) {
                    console.log(`   ⚠️  ${col.table}.${col.name} già presente, skip`);
                } else {
                    console.log(`   ⚠️  Impossibile aggiungere ${col.table}.${col.name} (potrebbe già esistere):`, e.message || e);
                }
            }
        }

        // Colonne aggiuntive richieste dalle API contratti (/api/contratti)
        const addContrattiExtraColumns = [
            // contratti_luce
            { table: 'contratti_luce', name: 'note', sql: 'ALTER TABLE contratti_luce ADD COLUMN note TEXT' },
            { table: 'contratti_luce', name: 'data_stipula', sql: 'ALTER TABLE contratti_luce ADD COLUMN data_stipula TEXT' },
            { table: 'contratti_luce', name: 'agente', sql: 'ALTER TABLE contratti_luce ADD COLUMN agente TEXT' },
            { table: 'contratti_luce', name: 'nome_offerta', sql: 'ALTER TABLE contratti_luce ADD COLUMN nome_offerta TEXT' },
            { table: 'contratti_luce', name: 'validita_offerta', sql: 'ALTER TABLE contratti_luce ADD COLUMN validita_offerta TEXT' },
            { table: 'contratti_luce', name: 'commodity', sql: 'ALTER TABLE contratti_luce ADD COLUMN commodity TEXT' },
            { table: 'contratti_luce', name: 'procedure', sql: 'ALTER TABLE contratti_luce ADD COLUMN procedure TEXT' },
            { table: 'contratti_luce', name: 'pdp', sql: 'ALTER TABLE contratti_luce ADD COLUMN pdp TEXT' },
            { table: 'contratti_luce', name: 'tipo_offerta', sql: 'ALTER TABLE contratti_luce ADD COLUMN tipo_offerta TEXT' },
            { table: 'contratti_luce', name: 'created_by', sql: 'ALTER TABLE contratti_luce ADD COLUMN created_by TEXT' },
            { table: 'contratti_luce', name: 'updated_at', sql: "ALTER TABLE contratti_luce ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP" },

            // contratti_gas
            { table: 'contratti_gas', name: 'note', sql: 'ALTER TABLE contratti_gas ADD COLUMN note TEXT' },
            { table: 'contratti_gas', name: 'data_stipula', sql: 'ALTER TABLE contratti_gas ADD COLUMN data_stipula TEXT' },
            { table: 'contratti_gas', name: 'agente', sql: 'ALTER TABLE contratti_gas ADD COLUMN agente TEXT' },
            { table: 'contratti_gas', name: 'nome_offerta', sql: 'ALTER TABLE contratti_gas ADD COLUMN nome_offerta TEXT' },
            { table: 'contratti_gas', name: 'validita_offerta', sql: 'ALTER TABLE contratti_gas ADD COLUMN validita_offerta TEXT' },
            { table: 'contratti_gas', name: 'commodity', sql: 'ALTER TABLE contratti_gas ADD COLUMN commodity TEXT' },
            { table: 'contratti_gas', name: 'procedure', sql: 'ALTER TABLE contratti_gas ADD COLUMN procedure TEXT' },
            { table: 'contratti_gas', name: 'pdp', sql: 'ALTER TABLE contratti_gas ADD COLUMN pdp TEXT' },
            { table: 'contratti_gas', name: 'tipo_offerta', sql: 'ALTER TABLE contratti_gas ADD COLUMN tipo_offerta TEXT' },
            { table: 'contratti_gas', name: 'created_by', sql: 'ALTER TABLE contratti_gas ADD COLUMN created_by TEXT' },
            { table: 'contratti_gas', name: 'updated_at', sql: "ALTER TABLE contratti_gas ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP" }
        ];
        for (const col of addContrattiExtraColumns) {
            try {
                db.exec(col.sql);
                console.log(`   ✅ Aggiunta colonna ${col.table}.${col.name}`);
            } catch (e: any) {
                if (typeof e.message === 'string' && e.message.includes('duplicate column name')) {
                    console.log(`   ⚠️  ${col.table}.${col.name} già presente, skip`);
                } else {
                    console.log(`   ⚠️  Impossibile aggiungere ${col.table}.${col.name} (potrebbe già esistere):`, e.message || e);
                }
            }
        }

        // ===============================================
        // TABELLA: compensi
        // ===============================================
        console.log('💼 Creazione tabella compensi...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS compensi (
                id TEXT PRIMARY KEY,
                agente_id TEXT NOT NULL,
                cliente_id TEXT,
                cliente_tipo TEXT CHECK (cliente_tipo IN ('privato','azienda')),
                contratto_id TEXT,
                contratto_tipo TEXT CHECK (contratto_tipo IN ('luce','gas')),
                importo REAL NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'compenso',
                descrizione TEXT,
                stato TEXT DEFAULT 'maturato' CHECK (stato IN ('maturato','da_pagare','pagato','annullato')),
                data_maturazione TEXT DEFAULT CURRENT_TIMESTAMP,
                data_pagamento TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (agente_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_compensi_agente ON compensi(agente_id);`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_compensi_stato ON compensi(stato);`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_compensi_tipo ON compensi(tipo);`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_compensi_data_maturazione ON compensi(data_maturazione);`);
        console.log('✅ Tabella compensi creata con indici');

        // ===============================================
        // TABELLE: newsletter e clienti_newsletter
        // ===============================================
        console.log('📰 Creazione tabelle newsletter...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS newsletter (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                descrizione TEXT,
                attiva INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS clienti_newsletter (
                id TEXT PRIMARY KEY,
                cliente_id TEXT NOT NULL,
                cliente_tipo TEXT NOT NULL CHECK (cliente_tipo IN ('privato','azienda')),
                newsletter_id TEXT NOT NULL,
                data_iscrizione TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(cliente_id, cliente_tipo, newsletter_id),
                FOREIGN KEY (newsletter_id) REFERENCES newsletter(id) ON DELETE CASCADE
            );
        `);

        // Seed di base per newsletter (idempotente)
        const insertNewsletter = db.prepare(`
            INSERT OR IGNORE INTO newsletter (id, nome, descrizione, attiva)
            VALUES (?, ?, ?, 1)
        `);
        insertNewsletter.run(randomUUID(), 'Energia News', 'Aggiornamenti e consigli su offerte luce/gas');
        insertNewsletter.run(randomUUID(), 'Gas Promo', 'Promozioni e sconti su contratti gas');
        insertNewsletter.run(randomUUID(), 'Aggiornamenti Offerte', 'Nuove offerte disponibili e scadenze');
        console.log('✅ Tabelle newsletter create e seed inserito');
        
        // Tabella AI matches
        db.exec(`
            CREATE TABLE IF NOT EXISTS ai_matches (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                offerta_id TEXT NOT NULL,
                cliente_privato_id TEXT,
                cliente_azienda_id TEXT,
                tipo_cliente TEXT NOT NULL,
                contratto_luce_id TEXT,
                contratto_gas_id TEXT,
                score_matching REAL NOT NULL,
                categoria_lead TEXT NOT NULL,
                risparmio_stimato_annuo REAL,
                percentuale_risparmio REAL,
                giorni_a_scadenza INTEGER,
                stato_contatto TEXT DEFAULT 'non_contattato',
                note_venditore TEXT,
                data_prossimo_followup TEXT,
                dettagli_matching TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (offerta_id) REFERENCES offerte(id) ON DELETE CASCADE,
                FOREIGN KEY (cliente_privato_id) REFERENCES clienti_privati(id) ON DELETE CASCADE,
                FOREIGN KEY (cliente_azienda_id) REFERENCES clienti_aziende(id) ON DELETE CASCADE
            );
        `);
        
        console.log('✅ Tabella ai_matches creata');
        
        // ===============================================
        // TABELLA: email_templates (completa)
        // ===============================================
        console.log('📧 Creazione tabella email_templates...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS email_templates (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                tipo TEXT NOT NULL,
                subject TEXT NOT NULL,
                html_content TEXT NOT NULL,
                placeholders TEXT,
                attivo INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabella email_templates creata');

        // ===============================================
        // TABELLA: email_campaigns (completa con scheduled_at)
        // ===============================================
        console.log('📧 Creazione tabella email_campaigns...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS email_campaigns (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                offerta_id TEXT,
                template_id TEXT,
                tipo TEXT NOT NULL,
                stato TEXT DEFAULT 'bozza',
                target_clienti TEXT NOT NULL,
                total_recipients INTEGER DEFAULT 0,
                sent_count INTEGER DEFAULT 0,
                delivered_count INTEGER DEFAULT 0,
                opened_count INTEGER DEFAULT 0,
                clicked_count INTEGER DEFAULT 0,
                failed_count INTEGER DEFAULT 0,
                scheduled_at TEXT,
                scheduled_end_at TEXT,
                sent_at TEXT,
                started_at TEXT,
                completed_at TEXT,
                creato_da TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (offerta_id) REFERENCES offerte(id) ON DELETE SET NULL,
                FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
                FOREIGN KEY (creato_da) REFERENCES users(id)
            );
        `);
        
        // Indici per performance
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_stato ON email_campaigns(stato);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_tipo ON email_campaigns(tipo);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_created ON email_campaigns(created_at);
        `);
        console.log('✅ Tabella email_campaigns creata con indici');

        // Assicurati che le colonne esistano anche su DB già creati in versioni precedenti
        try {
            db.exec(`
                ALTER TABLE email_campaigns ADD COLUMN scheduled_end_at TEXT;
            `);
            console.log('   ✅ Aggiunta colonna email_campaigns.scheduled_end_at');
        } catch (e: any) {
            if (typeof e.message === 'string' && e.message.includes('duplicate column name')) {
                console.log('   ⚠️  scheduled_end_at già presente su email_campaigns, skip');
            } else if (typeof e.message === 'string' && e.message.includes('no such table')) {
                console.log('   ⚠️  Tabella email_campaigns non trovata durante ALTER, già gestita nella creazione');
            } else {
                console.log('   ⚠️  Impossibile aggiungere scheduled_end_at (potrebbe già esistere):', e.message || e);
            }
        }

        try {
            db.exec(`
                ALTER TABLE email_campaigns ADD COLUMN sent_at TEXT;
            `);
            console.log('   ✅ Aggiunta colonna email_campaigns.sent_at');
        } catch (e: any) {
            if (typeof e.message === 'string' && e.message.includes('duplicate column name')) {
                console.log('   ⚠️  sent_at già presente su email_campaigns, skip');
            } else if (typeof e.message === 'string' && e.message.includes('no such table')) {
                console.log('   ⚠️  Tabella email_campaigns non trovata durante ALTER, già gestita nella creazione');
            } else {
                console.log('   ⚠️  Impossibile aggiungere sent_at (potrebbe già esistere):', e.message || e);
            }
        }

        // ===============================================
        // TABELLA: email_logs (completa)
        // ===============================================
        console.log('📧 Creazione tabella email_logs...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS email_logs (
                id TEXT PRIMARY KEY,
                campaign_id TEXT,
                cliente_privato_id TEXT,
                cliente_azienda_id TEXT,
                tipo_cliente TEXT,
                email_destinatario TEXT NOT NULL,
                subject TEXT NOT NULL,
                html_content TEXT,
                stato TEXT DEFAULT 'pending',
                brevo_message_id TEXT,
                sent_at TEXT,
                delivered_at TEXT,
                opened_at TEXT,
                clicked_at TEXT,
                bounced_at TEXT,
                error_message TEXT,
                tracking_data TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
                FOREIGN KEY (cliente_privato_id) REFERENCES clienti_privati(id) ON DELETE CASCADE,
                FOREIGN KEY (cliente_azienda_id) REFERENCES clienti_aziende(id) ON DELETE CASCADE
            );
        `);
        
        // Indici per performance
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_logs_campaign ON email_logs(campaign_id);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_logs_stato ON email_logs(stato);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_logs_email ON email_logs(email_destinatario);
        `);
        console.log('✅ Tabella email_logs creata con indici');
        
        console.log('\n✨ Migrazione SQLite completata con successo!');
        console.log('\n🎯 Database pronto all\'uso:');
        console.log(`   Percorso: ${dbPath}`);
        console.log('   Tipo: SQLite (nessun server richiesto)');
        console.log('\n✅ Avvia il server: npm run dev');
        console.log('   Frontend: http://localhost:5177');
        console.log('   Login: admin@gestionale.it / Admin123!\n');
        
    } catch (error) {
        console.error('❌ Errore durante la migrazione:', error);
        throw error;
    } finally {
        db.close();
    }
}

runMigration().catch(console.error);

