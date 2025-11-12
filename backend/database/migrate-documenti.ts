/**
 * Migrazione: Tabella documenti_clienti per gestione file allegati
 * Esegui: npm run db:migrate-docs
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './gestionale_energia.db';
const db = new Database(DB_PATH);

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     MIGRAZIONE DOCUMENTI CLIENTI - Sistema File Upload    ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

try {
    console.log('📦 Creazione tabella documenti_clienti...');
    
    db.exec(`
        -- Tabella per documenti allegati ai clienti
        CREATE TABLE IF NOT EXISTS documenti_clienti (
            id TEXT PRIMARY KEY,
            cliente_privato_id TEXT,
            cliente_azienda_id TEXT,
            nome_file TEXT NOT NULL,
            nome_originale TEXT NOT NULL,
            tipo_file TEXT NOT NULL,
            dimensione_file INTEGER NOT NULL,
            percorso_file TEXT NOT NULL,
            categoria TEXT DEFAULT 'altro' CHECK(categoria IN ('documento_identita', 'contratto', 'bolletta', 'fattura', 'altro')),
            note TEXT,
            uploaded_by TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (cliente_privato_id) REFERENCES clienti_privati(id) ON DELETE CASCADE,
            FOREIGN KEY (cliente_azienda_id) REFERENCES clienti_aziende(id) ON DELETE CASCADE,
            FOREIGN KEY (uploaded_by) REFERENCES utenti(id)
        );
        
        -- Indici per performance
        CREATE INDEX IF NOT EXISTS idx_documenti_cliente_privato ON documenti_clienti(cliente_privato_id);
        CREATE INDEX IF NOT EXISTS idx_documenti_cliente_azienda ON documenti_clienti(cliente_azienda_id);
        CREATE INDEX IF NOT EXISTS idx_documenti_categoria ON documenti_clienti(categoria);
        CREATE INDEX IF NOT EXISTS idx_documenti_created_at ON documenti_clienti(created_at DESC);
    `);
    
    console.log('✅ Tabella documenti_clienti creata con successo!\n');
    
    // Crea directory uploads se non esiste
    const uploadsDir = path.join(process.cwd(), 'uploads', 'clienti');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(`✅ Directory uploads creata: ${uploadsDir}\n`);
    }
    
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║          MIGRAZIONE COMPLETATA CON SUCCESSO! 🎉           ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Funzionalità implementate:                               ║');
    console.log('║  ✅ Upload file per clienti privati e aziende            ║');
    console.log('║  ✅ Categorizzazione documenti                           ║');
    console.log('║  ✅ Tracciamento dimensione e tipo file                  ║');
    console.log('║  ✅ Gestione sicurezza con foreign key                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
} catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    process.exit(1);
} finally {
    db.close();
}

