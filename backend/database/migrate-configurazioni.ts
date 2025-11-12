/**
 * Migrazione: Tabella configurazioni per impostazioni dinamiche
 * Permette di salvare configurazioni Brevo e altre impostazioni dal frontend
 */

import Database from 'better-sqlite3';
import path from 'path';

// Usa DATABASE_PATH se fornito, altrimenti fallback al DB locale di backend
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, '../../gestionale_energia.db');
const db = new Database(dbPath);

async function runMigration() {
    try {
        console.log('🚀 Inizio migrazione: Tabella Configurazioni...');
        console.log(`   DB Path: ${dbPath}`);
        
        db.pragma('foreign_keys = ON');
        
        // ========================================
        // 1. CREA TABELLA CONFIGURAZIONI
        // ========================================
        
        console.log('🔨 Creazione tabella configurazioni...');
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS configurazioni (
                chiave TEXT PRIMARY KEY,
                valore TEXT,
                categoria TEXT NOT NULL,
                descrizione TEXT,
                encrypted INTEGER DEFAULT 0,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_by TEXT
            );
        `);
        
        console.log('✅ Tabella configurazioni creata');
        
        // ========================================
        // 2. INSERISCI CONFIGURAZIONI DEFAULT
        // ========================================
        
        console.log('📝 Inserimento configurazioni default...');
        
        const configs = [
            // Brevo SMTP
            { chiave: 'brevo_smtp_host', valore: '', categoria: 'brevo', descrizione: 'Host SMTP Brevo', encrypted: 0 },
            { chiave: 'brevo_smtp_port', valore: '587', categoria: 'brevo', descrizione: 'Porta SMTP Brevo', encrypted: 0 },
            { chiave: 'brevo_smtp_user', valore: '', categoria: 'brevo', descrizione: 'Username SMTP Brevo', encrypted: 0 },
            { chiave: 'brevo_smtp_pass', valore: '', categoria: 'brevo', descrizione: 'Password SMTP Brevo', encrypted: 1 },
            { chiave: 'brevo_api_key', valore: '', categoria: 'brevo', descrizione: 'API Key Brevo', encrypted: 1 },
            
            // Sender Info
            { chiave: 'email_sender_name', valore: 'Gestionale Energia', categoria: 'email', descrizione: 'Nome mittente email', encrypted: 0 },
            { chiave: 'email_sender_address', valore: 'noreply@gestionale-energia.it', categoria: 'email', descrizione: 'Email mittente', encrypted: 0 },
            
            // Agency Info
            { chiave: 'agenzia_nome', valore: 'Agenzia Energia', categoria: 'agenzia', descrizione: 'Nome agenzia', encrypted: 0 },
            { chiave: 'agenzia_telefono', valore: '+39 123 456789', categoria: 'agenzia', descrizione: 'Telefono agenzia', encrypted: 0 },
            { chiave: 'agenzia_email', valore: 'info@agenzia.it', categoria: 'agenzia', descrizione: 'Email agenzia', encrypted: 0 },
            { chiave: 'agenzia_indirizzo', valore: 'Via Roma 1, 00100 Roma', categoria: 'agenzia', descrizione: 'Indirizzo agenzia', encrypted: 0 },
            
            // Webhook
            { chiave: 'brevo_webhook_url', valore: '', categoria: 'brevo', descrizione: 'URL Webhook Brevo', encrypted: 0 },
            
            // Email Limits
            { chiave: 'email_daily_limit', valore: '300', categoria: 'email', descrizione: 'Limite giornaliero email', encrypted: 0 },
            
            // Frontend URL
            { chiave: 'frontend_url', valore: 'http://localhost:5173', categoria: 'sistema', descrizione: 'URL Frontend', encrypted: 0 },
        ];
        
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO configurazioni (chiave, valore, categoria, descrizione, encrypted)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const config of configs) {
            stmt.run(config.chiave, config.valore, config.categoria, config.descrizione, config.encrypted);
        }
        
        console.log(`✅ ${configs.length} configurazioni default inserite`);
        
        // ========================================
        // 3. CREA INDICI
        // ========================================
        
        console.log('🔍 Creazione indici...');
        
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_configurazioni_categoria ON configurazioni(categoria);
        `);
        
        console.log('✅ Indici creati');
        
        console.log('');
        console.log('✅ MIGRAZIONE COMPLETATA!');
        console.log('   Le configurazioni possono ora essere gestite dal frontend');
        
        db.close();
        
    } catch (error) {
        console.error('❌ Errore migrazione:', error);
        db.close();
        process.exit(1);
    }
}

runMigration();

