/**
 * Script di migrazione database
 * Crea tutte le tabelle e inserisce dati iniziali
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gestionale_energia',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Inizio migrazione database...');
        
        // Leggi e esegui schema SQL
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        
        console.log('📝 Creazione schema database...');
        await client.query(schemaSql);
        console.log('✅ Schema creato con successo');
        
        // Inserisci utente Super Admin default
        console.log('👤 Creazione utente Super Admin...');
        const passwordHash = await bcrypt.hash('Admin123!', 10);
        
        await client.query(`
            INSERT INTO users (email, password_hash, nome, cognome, ruolo, attivo)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (email) DO NOTHING
        `, ['admin@gestionale.it', passwordHash, 'Super', 'Admin', 'super_admin', true]);
        
        console.log('✅ Utente Super Admin creato');
        console.log('   Email: admin@gestionale.it');
        console.log('   Password: Admin123!');
        
        // Inserisci template email di base
        console.log('📧 Creazione template email...');
        await insertEmailTemplates(client);
        console.log('✅ Template email creati');
        
        console.log('\n✨ Migrazione completata con successo!');
        console.log('\n🎯 Prossimi passi:');
        console.log('1. Copia .env.example in .env e configura le variabili');
        console.log('2. Avvia il server: npm run dev');
        console.log('3. Accedi con: admin@gestionale.it / Admin123!\n');
        
    } catch (error) {
        console.error('❌ Errore durante la migrazione:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

async function insertEmailTemplates(client: any) {
    const templates = [
        {
            nome_template: 'scadenza_60_giorni',
            tipologia: 'scadenza',
            target_clienti: 'entrambi',
            oggetto: 'Promemoria: Il tuo contratto {tipo_energia} scade tra 60 giorni',
            corpo_html: `
                <h2>Gentile {cliente_nome},</h2>
                <p>Ti ricordiamo che il tuo contratto {tipo_energia} con <strong>{fornitore}</strong> scadrà il <strong>{data_scadenza}</strong>.</p>
                <p>Hai ancora 60 giorni per valutare le migliori offerte sul mercato e non rischiare interruzioni del servizio.</p>
                <p>Il nostro team è a tua disposizione per trovare la soluzione più conveniente per te.</p>
                <p>Contattaci per una consulenza gratuita!</p>
                <hr>
                <p><small>Gestionale Energia - Il tuo partner per il risparmio energetico</small></p>
            `,
            corpo_text: 'Gentile {cliente_nome}, ti ricordiamo che il tuo contratto {tipo_energia} scadrà il {data_scadenza}.',
            variabili_disponibili: JSON.stringify(['cliente_nome', 'tipo_energia', 'fornitore', 'data_scadenza', 'numero_contratto'])
        },
        {
            nome_template: 'scadenza_30_giorni_con_offerta',
            tipologia: 'scadenza',
            target_clienti: 'entrambi',
            oggetto: '⚠️ Contratto in scadenza tra 30 giorni - Offerta esclusiva per te!',
            corpo_html: `
                <h2>Gentile {cliente_nome},</h2>
                <p><strong>Il tuo contratto {tipo_energia} scade tra soli 30 giorni!</strong></p>
                <p>Abbiamo selezionato per te un'offerta esclusiva che ti permette di risparmiare fino a <strong>{risparmio_stimato}€/anno</strong>.</p>
                <h3>La tua offerta personalizzata:</h3>
                <ul>
                    <li>Fornitore: <strong>{nuova_offerta_fornitore}</strong></li>
                    <li>Prezzo: <strong>{nuova_offerta_prezzo}€</strong></li>
                    <li>Risparmio stimato: <strong>{risparmio_stimato}€/anno</strong></li>
                </ul>
                <p><a href="{link_dettagli}" style="background:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Scopri i dettagli</a></p>
                <p>Contattaci subito per non perdere questa opportunità!</p>
            `,
            corpo_text: 'Il tuo contratto scade tra 30 giorni. Abbiamo un\'offerta che ti fa risparmiare {risparmio_stimato}€/anno.',
            variabili_disponibili: JSON.stringify(['cliente_nome', 'tipo_energia', 'data_scadenza', 'risparmio_stimato', 'nuova_offerta_fornitore', 'nuova_offerta_prezzo', 'link_dettagli'])
        },
        {
            nome_template: 'scadenza_15_giorni_urgente',
            tipologia: 'scadenza',
            target_clienti: 'entrambi',
            oggetto: '🚨 URGENTE: Contratto in scadenza tra 15 giorni!',
            corpo_html: `
                <h2 style="color:#dc3545;">ATTENZIONE {cliente_nome}!</h2>
                <p><strong>Il tuo contratto {tipo_energia} scade tra soli 15 giorni!</strong></p>
                <p>È fondamentale agire subito per evitare:</p>
                <ul>
                    <li>❌ Passaggio automatico a tariffe sfavorevoli</li>
                    <li>❌ Possibili interruzioni del servizio</li>
                    <li>❌ Perdita di condizioni vantaggiose</li>
                </ul>
                <p style="background:#fff3cd;padding:15px;border-left:4px solid #ffc107;">
                    <strong>Ti richiameremo nei prossimi giorni</strong> per assisterti nella scelta della migliore offerta.
                </p>
                <p>Oppure contattaci subito al: <strong>{telefono_agenzia}</strong></p>
            `,
            corpo_text: 'URGENTE: Il tuo contratto scade tra 15 giorni! Contattaci subito al {telefono_agenzia}',
            variabili_disponibili: JSON.stringify(['cliente_nome', 'tipo_energia', 'data_scadenza', 'telefono_agenzia'])
        },
        {
            nome_template: 'promozionale_privati',
            tipologia: 'promozionale',
            target_clienti: 'privati',
            oggetto: '💡 Nuova offerta {tipo_energia}: Risparmia fino al {percentuale_risparmio}%!',
            corpo_html: `
                <h2>Ciao {cliente_nome}!</h2>
                <p>Abbiamo una grande novità per te! 🎉</p>
                <p>È disponibile una nuova offerta {tipo_energia} perfetta per le tue esigenze:</p>
                <div style="background:#f8f9fa;padding:20px;margin:20px 0;border-radius:10px;">
                    <h3 style="color:#007bff;">{nome_offerta}</h3>
                    <p><strong>Fornitore:</strong> {fornitore}</p>
                    <p><strong>Prezzo:</strong> {prezzo}€/{unita_misura}</p>
                    <p><strong>Risparmio stimato:</strong> {risparmio_stimato}€/anno ({percentuale_risparmio}%)</p>
                    <p><strong>Valida fino al:</strong> {data_validita}</p>
                </div>
                <p>Non lasciarti sfuggire questa opportunità!</p>
                <p><a href="{link_offerta}" style="background:#28a745;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;">Richiedi Preventivo Gratuito</a></p>
            `,
            corpo_text: 'Ciao {cliente_nome}, nuova offerta {tipo_energia} con risparmio del {percentuale_risparmio}%!',
            variabili_disponibili: JSON.stringify(['cliente_nome', 'tipo_energia', 'nome_offerta', 'fornitore', 'prezzo', 'unita_misura', 'risparmio_stimato', 'percentuale_risparmio', 'data_validita', 'link_offerta'])
        },
        {
            nome_template: 'promozionale_aziende',
            tipologia: 'promozionale',
            target_clienti: 'aziende',
            oggetto: 'Ottimizza i costi energetici della tua azienda - Offerta dedicata',
            corpo_html: `
                <h2>Gentile {cliente_nome},</h2>
                <p>In qualità di <strong>{ruolo_referente}</strong> di <strong>{ragione_sociale}</strong>, sappiamo quanto sia importante ottimizzare i costi energetici aziendali.</p>
                <p>Abbiamo analizzato il vostro profilo (settore {settore_merceologico}, ATECO {codice_ateco}) e abbiamo un'offerta su misura:</p>
                <div style="background:#e7f3ff;padding:25px;margin:25px 0;border-left:5px solid #007bff;">
                    <h3>{nome_offerta}</h3>
                    <p><strong>Vantaggi per la vostra azienda:</strong></p>
                    <ul>
                        <li>✓ Risparmio annuo stimato: <strong>{risparmio_stimato}€</strong></li>
                        <li>✓ ROI previsto: {roi_mesi} mesi</li>
                        <li>✓ Prezzo bloccato per {durata_vincolo} mesi</li>
                        <li>✓ Fatturazione elettronica automatica</li>
                    </ul>
                </div>
                <p>Il nostro consulente aziendale è a disposizione per un'analisi personalizzata gratuita.</p>
                <p><a href="{link_contatto}" style="background:#007bff;color:white;padding:15px 35px;text-decoration:none;border-radius:5px;font-weight:bold;">Richiedi Consulenza Gratuita</a></p>
            `,
            corpo_text: 'Offerta dedicata per {ragione_sociale}: risparmio stimato {risparmio_stimato}€/anno.',
            variabili_disponibili: JSON.stringify(['cliente_nome', 'ruolo_referente', 'ragione_sociale', 'settore_merceologico', 'codice_ateco', 'nome_offerta', 'risparmio_stimato', 'roi_mesi', 'durata_vincolo', 'link_contatto'])
        },
        {
            nome_template: 'benvenuto_cliente',
            tipologia: 'benvenuto',
            target_clienti: 'entrambi',
            oggetto: 'Benvenuto in Gestionale Energia! 🎉',
            corpo_html: `
                <h2>Benvenuto {cliente_nome}!</h2>
                <p>Siamo felici di averti con noi! 🎉</p>
                <p>Da oggi potrai contare su un partner affidabile per la gestione delle tue forniture energetiche.</p>
                <h3>Cosa possiamo fare per te:</h3>
                <ul>
                    <li>📊 Monitoraggio scadenze contratti</li>
                    <li>💰 Ricerca delle offerte più convenienti</li>
                    <li>📧 Aggiornamenti su promozioni esclusive</li>
                    <li>☎️ Assistenza dedicata</li>
                </ul>
                <p>Il nostro team è sempre a tua disposizione per qualsiasi necessità.</p>
                <p>Contatti: <br>
                   📧 Email: {email_agenzia}<br>
                   ☎️ Telefono: {telefono_agenzia}
                </p>
                <p>A presto!</p>
            `,
            corpo_text: 'Benvenuto {cliente_nome}! Siamo qui per aiutarti con le tue forniture energetiche.',
            variabili_disponibili: JSON.stringify(['cliente_nome', 'email_agenzia', 'telefono_agenzia'])
        },
        {
            nome_template: 'followup_interessato',
            tipologia: 'followup',
            target_clienti: 'entrambi',
            oggetto: 'Hai ancora domande sulla nostra offerta?',
            corpo_html: `
                <h2>Ciao {cliente_nome},</h2>
                <p>Ci siamo sentiti qualche giorno fa riguardo all'offerta <strong>{nome_offerta}</strong>.</p>
                <p>Volevo verificare se hai avuto modo di valutarla e se hai bisogno di ulteriori chiarimenti.</p>
                <p>Riepilogo dell'offerta:</p>
                <ul>
                    <li>Risparmio stimato: <strong>{risparmio_stimato}€/anno</strong></li>
                    <li>Validità offerta: fino al <strong>{data_validita}</strong></li>
                </ul>
                <p>Sono a tua completa disposizione per:</p>
                <ul>
                    <li>✓ Rispondere a ogni tua domanda</li>
                    <li>✓ Fornirti un preventivo dettagliato</li>
                    <li>✓ Guidarti nella procedura di cambio</li>
                </ul>
                <p>Contattami quando vuoi!</p>
                <p>Cordiali saluti,<br>{nome_operatore}</p>
            `,
            corpo_text: 'Ciao {cliente_nome}, volevo verificare se hai domande sulla nostra offerta. Contattami quando vuoi!',
            variabili_disponibili: JSON.stringify(['cliente_nome', 'nome_offerta', 'risparmio_stimato', 'data_validita', 'nome_operatore'])
        }
    ];
    
    for (const template of templates) {
        await client.query(`
            INSERT INTO email_templates 
            (nome_template, tipologia, target_clienti, oggetto, corpo_html, corpo_text, variabili_disponibili, attivo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (nome_template) DO NOTHING
        `, [
            template.nome_template,
            template.tipologia,
            template.target_clienti,
            template.oggetto,
            template.corpo_html,
            template.corpo_text,
            template.variabili_disponibili,
            true
        ]);
    }
}

// Esegui migrazione
runMigration().catch(console.error);

