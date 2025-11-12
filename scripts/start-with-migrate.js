const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Determina il percorso del database
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'gestionale_energia.db');

console.log('📁 DATABASE_PATH:', dbPath);

// Ripristina dati di seed se i volumi sono vuoti (DB e uploads)
function restoreSeedDataIfNeeded() {
  try {
    const seedDir = path.join(process.cwd(), 'seed_data');
    const seedDbPath = path.join(seedDir, 'gestionale_energia_seed.db');
    const seedUploadsPath = path.join(seedDir, 'uploads_seed');

    // Assicura cartella /data esista
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbExists = fs.existsSync(dbPath);
    const dbSize = dbExists ? fs.statSync(dbPath).size : 0;
    const forceSeed = String(process.env.FORCE_SEED_RESTORE || '').toLowerCase() === 'true';

    // Se DB non esiste o è vuoto e abbiamo un seed, copia
    if ((forceSeed || !dbExists || dbSize === 0) && fs.existsSync(seedDbPath)) {
      try {
        if (forceSeed && dbExists) {
          console.log('⚠️  FORCE_SEED_RESTORE abilitato: sovrascrivo DB esistente con seed');
        }
        fs.copyFileSync(seedDbPath, dbPath);
        console.log('🌱 Seed DB ripristinato in', dbPath);
      } catch (e) {
        console.log('⚠️  Impossibile ripristinare seed DB:', e.message || e);
      }
    }

    // Ripristina uploads se cartella è vuota e seed esiste
    const uploadsTarget = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsTarget)) {
      fs.mkdirSync(uploadsTarget, { recursive: true });
    }
    const uploadsEmpty = (() => {
      try {
        const files = fs.readdirSync(uploadsTarget);
        return !files || files.length === 0;
      } catch {
        return true;
      }
    })();

    if ((forceSeed || uploadsEmpty) && fs.existsSync(seedUploadsPath)) {
      try {
        if (forceSeed && !uploadsEmpty) {
          console.log('⚠️  FORCE_SEED_RESTORE abilitato: sovrascrivo uploads con seed');
        }
        // fs.cpSync disponibile su Node >=16
        if (fs.cpSync) {
          fs.cpSync(seedUploadsPath, uploadsTarget, { recursive: true });
        } else {
          // fallback: copia file per file
          const copyRec = (src, dest) => {
            const stats = fs.statSync(src);
            if (stats.isDirectory()) {
              if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
              for (const entry of fs.readdirSync(src)) {
                copyRec(path.join(src, entry), path.join(dest, entry));
              }
            } else {
              fs.copyFileSync(src, dest);
            }
          };
          copyRec(seedUploadsPath, uploadsTarget);
        }
        console.log('🌱 Seed uploads ripristinato in', uploadsTarget);
      } catch (e) {
        console.log('⚠️  Impossibile ripristinare seed uploads:', e.message || e);
      }
    }
  } catch (err) {
    console.log('❌ Errore ripristino seed data:', err);
    // Non bloccare l'avvio
  }
}

// Se il file DB non esiste, esegue la migrazione usando il build JS
function ensureDatabaseMigrated() {
  try {
    const exists = fs.existsSync(dbPath);
    const size = exists ? fs.statSync(dbPath).size : 0;

    // Esegui sempre la migrazione: è idempotente e crea tabelle mancanti
    const migrateScript = path.join(process.cwd(), 'dist', 'backend', 'database', 'migrate-sqlite.js');

    if (!fs.existsSync(migrateScript)) {
      console.error('❌ Script di migrazione non trovato:', migrateScript);
      process.exit(1);
    }

    if (!exists || size === 0) {
      console.log('🔧 Database mancante o vuoto. Avvio migrazione SQLite...');
    } else {
      console.log('🔧 Avvio migrazione idempotente per creare tabelle mancanti...');
    }

    const res = spawnSync(process.argv[0], [migrateScript], { stdio: 'inherit' });
    if (res.status !== 0) {
      console.error('❌ Migrazione fallita con codice:', res.status);
      process.exit(res.status || 1);
    }

    console.log('✅ Migrazione completata. Database pronto.');
  } catch (err) {
    console.error('❌ Errore controllo/migrazione database:', err);
    process.exit(1);
  }
}

// Patch schema: assicura colonne mancanti su email_campaigns per retrocompatibilità
function patchSchemaIfNeeded() {
  try {
    const db = new Database(dbPath);

    // Controlla struttura tabella email_campaigns
    const columns = db.prepare("PRAGMA table_info(email_campaigns)").all().map(c => c.name);
    const hasScheduledEndAt = columns.includes('scheduled_end_at');
    const hasSentAt = columns.includes('sent_at');
    const hasSubject = columns.includes('subject');
    const hasFiltriTargeting = columns.includes('filtri_targeting');

    if (!hasScheduledEndAt) {
      try {
        db.exec("ALTER TABLE email_campaigns ADD COLUMN scheduled_end_at TEXT;");
        console.log('   ✅ Patch: aggiunta colonna email_campaigns.scheduled_end_at');
      } catch (e) {
        const msg = typeof e.message === 'string' ? e.message : String(e);
        if (msg.includes('duplicate column name')) {
          console.log('   ⚠️  Patch: scheduled_end_at già presente, skip');
        } else if (msg.includes('no such table')) {
          console.log('   ⚠️  Patch: tabella email_campaigns assente, verrà creata dalla migrazione');
        } else {
          console.log('   ⚠️  Patch: impossibile aggiungere scheduled_end_at:', msg);
        }
      }
    }

    if (!hasSentAt) {
      try {
        db.exec("ALTER TABLE email_campaigns ADD COLUMN sent_at TEXT;");
        console.log('   ✅ Patch: aggiunta colonna email_campaigns.sent_at');
      } catch (e) {
        const msg = typeof e.message === 'string' ? e.message : String(e);
        if (msg.includes('duplicate column name')) {
          console.log('   ⚠️  Patch: sent_at già presente, skip');
        } else if (msg.includes('no such table')) {
          console.log('   ⚠️  Patch: tabella email_campaigns assente, verrà creata dalla migrazione');
        } else {
          console.log('   ⚠️  Patch: impossibile aggiungere sent_at:', msg);
        }
      }
    }

    // Assicura colonne usate dalle route runtime
    if (!hasSubject) {
      try {
        db.exec("ALTER TABLE email_campaigns ADD COLUMN subject TEXT;");
        console.log('   ✅ Patch: aggiunta colonna email_campaigns.subject');
      } catch (e) {
        const msg = typeof e.message === 'string' ? e.message : String(e);
        if (msg.includes('duplicate column name')) {
          console.log('   ⚠️  Patch: subject già presente, skip');
        } else if (msg.includes('no such table')) {
          console.log('   ⚠️  Patch: tabella email_campaigns assente, verrà creata dalla migrazione');
        } else {
          console.log('   ⚠️  Patch: impossibile aggiungere subject:', msg);
        }
      }
    }

    if (!hasFiltriTargeting) {
      try {
        db.exec("ALTER TABLE email_campaigns ADD COLUMN filtri_targeting TEXT;");
        console.log('   ✅ Patch: aggiunta colonna email_campaigns.filtri_targeting');
      } catch (e) {
        const msg = typeof e.message === 'string' ? e.message : String(e);
        if (msg.includes('duplicate column name')) {
          console.log('   ⚠️  Patch: filtri_targeting già presente, skip');
        } else if (msg.includes('no such table')) {
          console.log('   ⚠️  Patch: tabella email_campaigns assente, verrà creata dalla migrazione');
        } else {
          console.log('   ⚠️  Patch: impossibile aggiungere filtri_targeting:', msg);
        }
      }
    }

    db.close();
  } catch (err) {
    console.log('❌ Errore durante patch schema:', err);
    // Non bloccare l'avvio del server in caso di errore di patch
  }
}

// Configurazioni: assicura la tabella e alcuni valori di default
function ensureConfigurazioniTableAndDefaults() {
  try {
    const db = new Database(dbPath);

    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='configurazioni'")
      .get();

    if (!tableExists) {
      console.log('🔧 Creazione tabella configurazioni...');
      db.exec(`
        CREATE TABLE configurazioni (
          chiave TEXT PRIMARY KEY,
          valore TEXT,
          categoria TEXT NOT NULL DEFAULT 'email',
          descrizione TEXT,
          encrypted INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT,
          updated_by TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_config_categoria ON configurazioni(categoria);
      `);
      console.log('   ✅ Tabella configurazioni creata');
    } else {
      console.log('   ✅ Tabella configurazioni già presente');
    }

    // Defaults Brevo/Email: INSERT OR IGNORE per idempotenza
    const insert = db.prepare(
      `INSERT OR IGNORE INTO configurazioni (chiave, valore, categoria, descrizione, encrypted, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    );
    const defaults = [
      ['brevo_smtp_host', '', 'email', 'Host SMTP Brevo', 0],
      ['brevo_smtp_port', '587', 'email', 'Porta SMTP Brevo', 0],
      ['brevo_smtp_user', '', 'email', 'User SMTP Brevo', 0],
      ['brevo_smtp_pass', '', 'email', 'Password/API SMTP Brevo', 1],
      ['brevo_api_key', '', 'email', 'API Key Brevo', 1],
      ['email_sender_name', 'Gestionale Energia', 'email', 'Nome mittente', 0],
      ['email_sender_address', '', 'email', 'Indirizzo mittente', 0],
      ['unsubscribe_base_url', '', 'email', 'Base URL link disiscrizione', 0]
    ];
    for (const d of defaults) insert.run(d);

    db.close();
    console.log('✅ Tabella configurazioni pronta con defaults');
  } catch (err) {
    console.error('❌ Errore migrazione configurazioni:', err);
  }
}

// Patch schema clienti: assicura colonne estese per clienti_privati e clienti_aziende
function patchClientColumnsIfNeeded() {
  try {
    const db = new Database(dbPath);

    // Colonne estese per clienti_privati (idempotenti)
    const privatiColumns = [
      'ALTER TABLE clienti_privati ADD COLUMN email_secondaria TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN telefono_fisso TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN pec TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN civico_residenza TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN cap_residenza TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN provincia_residenza TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN via_fornitura TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN civico_fornitura TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN cap_fornitura TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN citta_fornitura TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN provincia_fornitura TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN tipo_documento TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN numero_documento TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN ente_rilascio TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN data_scadenza_documento TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN iban TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN preferenza_email INTEGER DEFAULT 1',
      'ALTER TABLE clienti_privati ADD COLUMN preferenza_sms INTEGER DEFAULT 1',
      'ALTER TABLE clienti_privati ADD COLUMN preferenza_telefono INTEGER DEFAULT 1',
      'ALTER TABLE clienti_privati ADD COLUMN note TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN data_consenso TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN utente_acquisizione TEXT',
      'ALTER TABLE clienti_privati ADD COLUMN news_letter INTEGER DEFAULT 0',
      'ALTER TABLE clienti_privati ADD COLUMN created_by TEXT',
      // Commissioni per agente su cliente
      'ALTER TABLE clienti_privati ADD COLUMN commissione_luce REAL',
      'ALTER TABLE clienti_privati ADD COLUMN commissione_gas REAL'
    ];

    for (const sql of privatiColumns) {
      try {
        db.exec(sql);
        const colName = sql.split('ADD COLUMN ')[1]?.split(' ')[0] || 'colonna';
        console.log(`   ✅ Patch clienti_privati: aggiunta ${colName}`);
      } catch (e) {
        const msg = typeof e.message === 'string' ? e.message : String(e);
        if (msg.includes('duplicate column name')) {
          const colName = sql.split('ADD COLUMN ')[1]?.split(' ')[0] || 'colonna';
          console.log(`   ⚠️  Patch clienti_privati: ${colName} già presente, skip`);
        } else if (msg.includes('no such table')) {
          console.log('   ⚠️  Patch clienti_privati: tabella assente, verrà creata dalla migrazione');
        } else {
          console.log('   ⚠️  Patch clienti_privati: errore alter:', msg);
        }
      }
    }

    // Colonne estese per clienti_aziende (idempotenti)
    const aziendeColumns = [
      'ALTER TABLE clienti_aziende ADD COLUMN codice_fiscale TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN descrizione_ateco TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN pec_aziendale TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN via_sede_legale TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN civico_sede_legale TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN cap_sede_legale TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN provincia_sede_legale TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN via_sede_operativa TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN civico_sede_operativa TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN cap_sede_operativa TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN citta_sede_operativa TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN provincia_sede_operativa TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN nome_referente TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN cognome_referente TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN ruolo_referente TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN dimensione_azienda TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN settore_merceologico TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN fatturato_annuo REAL',
      'ALTER TABLE clienti_aziende ADD COLUMN iban_aziendale TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN codice_sdi TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN note TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN data_consenso TEXT',
      'ALTER TABLE clienti_aziende ADD COLUMN created_by TEXT',
      // Commissioni per agente su cliente
      'ALTER TABLE clienti_aziende ADD COLUMN commissione_luce REAL',
      'ALTER TABLE clienti_aziende ADD COLUMN commissione_gas REAL'
    ];

    for (const sql of aziendeColumns) {
      try {
        db.exec(sql);
        const colName = sql.split('ADD COLUMN ')[1]?.split(' ')[0] || 'colonna';
        console.log(`   ✅ Patch clienti_aziende: aggiunta ${colName}`);
      } catch (e) {
        const msg = typeof e.message === 'string' ? e.message : String(e);
        if (msg.includes('duplicate column name')) {
          const colName = sql.split('ADD COLUMN ')[1]?.split(' ')[0] || 'colonna';
          console.log(`   ⚠️  Patch clienti_aziende: ${colName} già presente, skip`);
        } else if (msg.includes('no such table')) {
          console.log('   ⚠️  Patch clienti_aziende: tabella assente, verrà creata dalla migrazione');
        } else {
          console.log('   ⚠️  Patch clienti_aziende: errore alter:', msg);
        }
      }
    }

    db.close();
  } catch (err) {
    console.log('❌ Errore durante patch colonne clienti:', err);
    // Non bloccare l'avvio
  }
}

// Ricostruisce le tabelle clienti_* rimuovendo vincoli NOT NULL per supportare import incompleti
function relaxClientNullConstraintsIfNeeded() {
  try {
    const db = new Database(dbPath);

    // Utilità: controlla se una tabella ha vincoli NOT NULL su campi che vogliamo opzionali
    const needRelax = (table, optionalFields) => {
      try {
        const cols = db.prepare(`PRAGMA table_info(${table})`).all();
        if (!cols || cols.length === 0) return false; // tabella non esiste
        const byName = Object.fromEntries(cols.map(c => [c.name, c]));
        return optionalFields.some(f => byName[f] && Number(byName[f].notnull) === 1);
      } catch (e) {
        return false;
      }
    };

    // Ricostruzione generica: crea nuova tabella con schema target, copia dati comuni, rimpiazza
    const rebuildTable = (table, createSql, targetColumns) => {
      // Determina colonne esistenti
      const existing = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      const common = targetColumns.filter(c => existing.includes(c));
      db.exec(`BEGIN TRANSACTION;`);
      try {
        db.exec(`CREATE TABLE ${table}_new (${createSql});`);
        if (common.length > 0) {
          const colList = common.join(', ');
          db.exec(`INSERT INTO ${table}_new (${colList}) SELECT ${colList} FROM ${table};`);
        }
        db.exec(`DROP TABLE ${table};`);
        db.exec(`ALTER TABLE ${table}_new RENAME TO ${table};`);
        db.exec(`COMMIT;`);
        console.log(`✅ Tabella ${table} ricostruita con campi nullable`);
      } catch (e) {
        db.exec(`ROLLBACK;`);
        console.log(`❌ Errore ricostruzione ${table}:`, e.message || e);
      }
    };

    // clienti_privati: schema target completamente nullable (allineato a migrate-clienti-nullable.ts)
    const privatiOptional = [
      'nome','cognome','codice_fiscale','data_nascita','email_principale','telefono_mobile',
      'via_residenza','citta_residenza'
    ];
    if (needRelax('clienti_privati', privatiOptional)) {
      console.log('🔨 Ricostruzione clienti_privati per rimuovere vincoli NOT NULL...');
      const privatiCreateColumns = [
        'id TEXT PRIMARY KEY',
        'nome TEXT',
        'cognome TEXT',
        'codice_fiscale TEXT',
        'data_nascita TEXT',
        'email_principale TEXT',
        'email_secondaria TEXT',
        'telefono_fisso TEXT',
        'telefono_mobile TEXT',
        'pec TEXT',
        'via_residenza TEXT',
        'civico_residenza TEXT',
        'cap_residenza TEXT',
        'citta_residenza TEXT',
        'provincia_residenza TEXT',
        'via_fornitura TEXT',
        'civico_fornitura TEXT',
        'cap_fornitura TEXT',
        'citta_fornitura TEXT',
        'provincia_fornitura TEXT',
        'tipo_documento TEXT',
        'numero_documento TEXT',
        'ente_rilascio TEXT',
        'data_scadenza_documento TEXT',
        'iban TEXT',
        'preferenza_email INTEGER DEFAULT 1',
        'preferenza_sms INTEGER DEFAULT 1',
        'preferenza_telefono INTEGER DEFAULT 1',
        'note TEXT',
        'consenso_privacy INTEGER DEFAULT 0',
        'consenso_marketing INTEGER DEFAULT 0',
        'data_consenso TEXT',
        'newsletter_attiva INTEGER DEFAULT 1',
        'unsubscribe_token TEXT',
        'created_at TEXT DEFAULT CURRENT_TIMESTAMP',
        'updated_at TEXT DEFAULT CURRENT_TIMESTAMP',
        'created_by TEXT'
      ];
      rebuildTable('clienti_privati', privatiCreateColumns.join(', '), privatiCreateColumns.map(c => c.split(' ')[0]));
      // Indici utili
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_privati_codice_fiscale ON clienti_privati(codice_fiscale);`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_privati_email ON clienti_privati(email_principale);`);
      } catch {}
    } else {
      console.log('✅ Schema clienti_privati già privo di NOT NULL vincolanti');
    }

    // clienti_aziende: schema target completamente nullable
    const aziendeOptional = [
      'ragione_sociale','partita_iva','codice_ateco','email_referente','telefono_referente','citta_sede_legale'
    ];
    if (needRelax('clienti_aziende', aziendeOptional)) {
      console.log('🔨 Ricostruzione clienti_aziende per rimuovere vincoli NOT NULL...');
      const aziendeCreateColumns = [
        'id TEXT PRIMARY KEY',
        'ragione_sociale TEXT',
        'partita_iva TEXT',
        'codice_fiscale TEXT',
        'codice_ateco TEXT',
        'descrizione_ateco TEXT',
        'pec_aziendale TEXT',
        'via_sede_legale TEXT',
        'civico_sede_legale TEXT',
        'cap_sede_legale TEXT',
        'citta_sede_legale TEXT',
        'provincia_sede_legale TEXT',
        'via_sede_operativa TEXT',
        'civico_sede_operativa TEXT',
        'cap_sede_operativa TEXT',
        'citta_sede_operativa TEXT',
        'provincia_sede_operativa TEXT',
        'nome_referente TEXT',
        'cognome_referente TEXT',
        'ruolo_referente TEXT',
        'email_referente TEXT',
        'telefono_referente TEXT',
        'dimensione_azienda TEXT',
        'settore_merceologico TEXT',
        'fatturato_annuo REAL',
        'iban_aziendale TEXT',
        'codice_sdi TEXT',
        'note TEXT',
        'consenso_privacy INTEGER DEFAULT 0',
        'consenso_marketing INTEGER DEFAULT 0',
        'data_consenso TEXT',
        'newsletter_attiva INTEGER DEFAULT 1',
        'unsubscribe_token TEXT',
        'created_at TEXT DEFAULT CURRENT_TIMESTAMP',
        'updated_at TEXT DEFAULT CURRENT_TIMESTAMP',
        'created_by TEXT'
      ];
      rebuildTable('clienti_aziende', aziendeCreateColumns.join(', '), aziendeCreateColumns.map(c => c.split(' ')[0]));
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_aziende_partita_iva ON clienti_aziende(partita_iva);`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_aziende_email ON clienti_aziende(email_referente);`);
      } catch {}
    } else {
      console.log('✅ Schema clienti_aziende già privo di NOT NULL vincolanti');
    }

    db.close();
  } catch (err) {
    console.log('❌ Errore relax vincoli clienti:', err);
    // Non bloccare l'avvio del server
  }
}

function startServer() {
  const serverScript = path.join(process.cwd(), 'dist', 'backend', 'server.js');
  if (!fs.existsSync(serverScript)) {
    console.error('❌ Script server non trovato:', serverScript);
    process.exit(1);
  }
  console.log('🚀 Avvio server backend...');
  const res = spawnSync(process.argv[0], [serverScript], { stdio: 'inherit' });
  process.exit(res.status || 0);
}

// Prima di migrare, prova a ripristinare seed se i volumi sono vuoti
// Nota: la migrazione è idempotente e si applica anche sul seed
restoreSeedDataIfNeeded();
ensureDatabaseMigrated();
// Ricrea tabelle clienti con campi nullable se sono presenti vincoli NOT NULL
relaxClientNullConstraintsIfNeeded();
// Applica patch schema per garantire colonne richieste dalle query runtime
patchSchemaIfNeeded();
// Garantisce la tabella configurazioni e valori minimi per SMTP
ensureConfigurazioniTableAndDefaults();
// Applica patch clienti per garantire colonne estese
patchClientColumnsIfNeeded();
startServer();