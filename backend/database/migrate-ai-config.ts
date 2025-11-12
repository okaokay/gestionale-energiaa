/**
 * Migrazione: Aggiunge configurazioni AI (Groq/Ollama) alla tabella configurazioni
 */

import { pool } from '../config/database';

async function migrate() {
    console.log('🔄 Inizio migrazione configurazioni AI...\n');
    
    try {
        const aiConfigs = [
            {
                chiave: 'ai_provider',
                valore: 'groq',
                descrizione: 'Provider AI da usare (groq o ollama)',
                categoria: 'ai'
            },
            {
                chiave: 'groq_api_key',
                valore: '',
                descrizione: 'API Key di Groq per analisi PDF',
                categoria: 'ai'
            },
            {
                chiave: 'groq_model',
                valore: 'llama-3.1-70b-versatile',
                descrizione: 'Modello Groq da utilizzare',
                categoria: 'ai'
            },
            {
                chiave: 'ollama_url',
                valore: 'http://185.31.67.249/api/generate',
                descrizione: 'URL completo endpoint Ollama',
                categoria: 'ai'
            },
            {
                chiave: 'ollama_model',
                valore: 'llama3:8b',
                descrizione: 'Modello Ollama da utilizzare',
                categoria: 'ai'
            }
        ];
        
        for (const config of aiConfigs) {
            // Verifica se esiste già
            const existing = await pool.query(
                'SELECT * FROM configurazioni WHERE chiave = ?',
                [config.chiave]
            );
            
            if (existing.rows.length === 0) {
                await pool.query(`
                    INSERT INTO configurazioni (chiave, valore, descrizione, categoria, updated_at, updated_by)
                    VALUES (?, ?, ?, ?, datetime('now'), ?)
                `, [
                    config.chiave,
                    config.valore,
                    config.descrizione,
                    config.categoria,
                    '00000000-0000-0000-0000-000000000001' // Sistema
                ]);
                console.log(`✅ Configurazione ${config.chiave} aggiunta`);
            } else {
                console.log(`⚠️  Configurazione ${config.chiave} già esistente, salto`);
            }
        }
        
        console.log('\n✅ Migrazione configurazioni AI completata!');
        console.log('\n📝 Note:');
        console.log('   - Provider predefinito: Groq');
        console.log('   - Inserisci API Key Groq dalla pagina Offerte & AI');
        console.log('   - Groq è gratuito: https://console.groq.com/keys');
        
    } catch (error) {
        console.error('❌ Errore durante migrazione:', error);
        throw error;
    }
}

migrate().catch(err => {
    console.error('Errore critico:', err);
    process.exit(1);
});

