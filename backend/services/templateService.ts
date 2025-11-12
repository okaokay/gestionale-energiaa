/**
 * Template Service - Rendering email HTML con placeholder
 * Genera email personalizzate per scadenze, promozioni, benvenuto
 */

import { pool } from '../config/database';
import { emailConfig } from '../config/email';

// ═══════════════════════════════════════════════════
// INTERFACCE
// ═══════════════════════════════════════════════════
export interface TemplateData {
    // Cliente
    nome_cliente?: string;
    email_cliente?: string;
    tipo_cliente?: 'privato' | 'azienda';
    
    // Contratto
    tipo_energia?: string;
    fornitore?: string;
    numero_contratto?: string;
    data_scadenza?: string;
    giorni_scadenza?: number;
    codice_fornitura?: string;
    codice_fornitura_label?: string;
    
    // Offerta
    nome_offerta?: string;
    prezzo?: string;
    unita_misura?: string;
    durata_vincolo?: string;
    risparmio_annuo?: string;
    risparmio_percentuale?: string;
    data_fine_validita?: string;
    condizioni_particolari?: string;
    
    // Links
    link_offerte?: string;
    link_dettagli?: string;
    link_dashboard?: string;
    unsubscribe_link?: string;
    
    // Agenzia
    nome_agenzia?: string;
    email_contatto?: string;
    telefono_contatto?: string;
}

// ═══════════════════════════════════════════════════
// FUNZIONE PRINCIPALE: Render Template con Placeholder
// ═══════════════════════════════════════════════════
export function renderTemplate(htmlTemplate: string, data: TemplateData): string {
    let rendered = htmlTemplate;
    
    // Sostituisci tutti i placeholder {{nome_variabile}}
    for (const [key, value] of Object.entries(data)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(placeholder, String(value || ''));
    }
    
    // Sostituisci placeholder predefiniti dell'agenzia
    rendered = rendered.replace(/{{nome_agenzia}}/g, data.nome_agenzia || emailConfig.placeholders.nome_agenzia);
    rendered = rendered.replace(/{{email_contatto}}/g, data.email_contatto || emailConfig.placeholders.email_contatto);
    rendered = rendered.replace(/{{telefono_contatto}}/g, data.telefono_contatto || emailConfig.placeholders.telefono_contatto);
    rendered = rendered.replace(/{{link_dashboard}}/g, data.link_dashboard || emailConfig.placeholders.link_dashboard);
    rendered = rendered.replace(/{{link_offerte}}/g, data.link_offerte || emailConfig.placeholders.link_offerte);
    
    return rendered;
}

// ═══════════════════════════════════════════════════
// TEMPLATE: Email Scadenza Contratto
// ═══════════════════════════════════════════════════
export async function renderExpiryEmail(
    clienteId: string,
    tipoCliente: 'privato' | 'azienda',
    contrattoId: string,
    tipoEnergia: 'luce' | 'gas'
): Promise<{ subject: string; html: string }> {
    
    // Recupera dati cliente
    let cliente: any;
    if (tipoCliente === 'privato') {
        const result = await pool.query(`SELECT * FROM clienti_privati WHERE id = ?`, [clienteId]);
        cliente = result.rows[0];
    } else {
        const result = await pool.query(`SELECT * FROM clienti_aziende WHERE id = ?`, [clienteId]);
        cliente = result.rows[0];
    }
    
    if (!cliente) {
        throw new Error('Cliente non trovato');
    }
    
    // Recupera dati contratto
    const table = tipoEnergia === 'luce' ? 'contratti_luce' : 'contratti_gas';
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [contrattoId]);
    const contratto = result.rows[0] as any;
    
    if (!contratto) {
        throw new Error('Contratto non trovato');
    }
    
    // Calcola giorni a scadenza
    const dataScadenza = new Date(contratto.data_scadenza);
    const oggi = new Date();
    const giorniAScadenza = Math.ceil((dataScadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
    
    // Recupera template
    const templateResult = await pool.query(`
        SELECT * FROM email_templates 
        WHERE tipo = 'scadenza' AND attivo = 1 
        LIMIT 1
    `);
    
    if (templateResult.rows.length === 0) {
        throw new Error('Template scadenza non trovato');
    }
    
    const template = templateResult.rows[0] as any;
    
    // Prepara dati
    const nomeCliente = tipoCliente === 'privato' 
        ? `${cliente.nome} ${cliente.cognome}`
        : cliente.ragione_sociale;
    
    const emailCliente = tipoCliente === 'privato'
        ? cliente.email_principale
        : cliente.email_referente;
    
    const unsubscribeToken = cliente.unsubscribe_token;
    const unsubscribeLink = `${emailConfig.urls.unsubscribe}?token=${unsubscribeToken}`;
    
    const data: TemplateData = {
        nome_cliente: nomeCliente,
        email_cliente: emailCliente,
        tipo_energia: tipoEnergia === 'luce' ? 'Luce' : 'Gas',
        fornitore: contratto.fornitore,
        numero_contratto: contratto.numero_contratto,
        data_scadenza: new Date(contratto.data_scadenza).toLocaleDateString('it-IT'),
        giorni_scadenza: giorniAScadenza,
        codice_fornitura: tipoEnergia === 'luce' ? contratto.pod : contratto.pdr,
        codice_fornitura_label: tipoEnergia === 'luce' ? 'POD' : 'PDR',
        link_offerte: emailConfig.placeholders.link_offerte,
        unsubscribe_link: unsubscribeLink
    };
    
    // Render template
    const subject = renderTemplate(template.subject, data);
    const html = renderTemplate(template.html_content, data);
    
    return { subject, html };
}

// ═══════════════════════════════════════════════════
// TEMPLATE: Email Promozionale con Offerta
// ═══════════════════════════════════════════════════
export async function renderPromotionalEmail(
    clienteId: string,
    tipoCliente: 'privato' | 'azienda',
    offertaId: string,
    risparmioStimato?: number
): Promise<{ subject: string; html: string }> {
    
    // Recupera cliente
    let cliente: any;
    if (tipoCliente === 'privato') {
        const result = await pool.query(`SELECT * FROM clienti_privati WHERE id = ?`, [clienteId]);
        cliente = result.rows[0];
    } else {
        const result = await pool.query(`SELECT * FROM clienti_aziende WHERE id = ?`, [clienteId]);
        cliente = result.rows[0];
    }
    
    // Recupera offerta
    const offertaResult = await pool.query(`SELECT * FROM offerte WHERE id = ?`, [offertaId]);
    const offerta = offertaResult.rows[0] as any;
    
    if (!offerta) {
        throw new Error('Offerta non trovata');
    }
    
    // Recupera template
    const templateResult = await pool.query(`
        SELECT * FROM email_templates 
        WHERE tipo = 'promozionale' AND attivo = 1 
        LIMIT 1
    `);
    
    if (templateResult.rows.length === 0) {
        throw new Error('Template promozionale non trovato');
    }
    
    const template = templateResult.rows[0] as any;
    
    // Prepara dati
    const nomeCliente = tipoCliente === 'privato'
        ? `${cliente.nome} ${cliente.cognome}`
        : cliente.ragione_sociale;
    
    const unsubscribeToken = cliente.unsubscribe_token;
    const unsubscribeLink = `${emailConfig.urls.unsubscribe}?token=${unsubscribeToken}`;
    
    // Calcola risparmio percentuale (se non fornito, stima al 15%)
    const risparmioAnnuo = risparmioStimato || 200;
    const risparmioPercentuale = 15;
    
    const data: TemplateData = {
        nome_cliente: nomeCliente,
        nome_offerta: offerta.nome_offerta,
        fornitore: offerta.fornitore,
        tipo_energia: offerta.tipo_energia === 'luce' ? 'Luce' : offerta.tipo_energia === 'gas' ? 'Gas' : 'Luce e Gas',
        prezzo: offerta.prezzo_luce || offerta.prezzo_gas || '0.15',
        unita_misura: offerta.tipo_energia === 'gas' ? 'Smc' : 'kWh',
        durata_vincolo: offerta.durata_vincolo_mesi?.toString() || '12',
        risparmio_annuo: risparmioAnnuo.toFixed(0),
        risparmio_percentuale: risparmioPercentuale.toFixed(0),
        data_fine_validita: new Date(offerta.data_fine_validita).toLocaleDateString('it-IT'),
        condizioni_particolari: offerta.condizioni_particolari || 'Offerta valida per nuovi clienti',
        link_dettagli: `${emailConfig.urls.frontend}/offerte/${offertaId}`,
        unsubscribe_link: unsubscribeLink
    };
    
    const subject = renderTemplate(template.subject, data);
    const html = renderTemplate(template.html_content, data);
    
    return { subject, html };
}

// ═══════════════════════════════════════════════════
// TEMPLATE: Email di Benvenuto
// ═══════════════════════════════════════════════════
export async function renderWelcomeEmail(
    clienteId: string,
    tipoCliente: 'privato' | 'azienda'
): Promise<{ subject: string; html: string }> {
    
    // Recupera cliente
    let cliente: any;
    if (tipoCliente === 'privato') {
        const result = await pool.query(`SELECT * FROM clienti_privati WHERE id = ?`, [clienteId]);
        cliente = result.rows[0];
    } else {
        const result = await pool.query(`SELECT * FROM clienti_aziende WHERE id = ?`, [clienteId]);
        cliente = result.rows[0];
    }
    
    // Recupera template
    const templateResult = await pool.query(`
        SELECT * FROM email_templates 
        WHERE tipo = 'benvenuto' AND attivo = 1 
        LIMIT 1
    `);
    
    if (templateResult.rows.length === 0) {
        throw new Error('Template benvenuto non trovato');
    }
    
    const template = templateResult.rows[0] as any;
    
    // Prepara dati
    const nomeCliente = tipoCliente === 'privato'
        ? cliente.nome
        : cliente.ragione_sociale;
    
    const unsubscribeToken = cliente.unsubscribe_token;
    const unsubscribeLink = `${emailConfig.urls.unsubscribe}?token=${unsubscribeToken}`;
    
    const data: TemplateData = {
        nome_cliente: nomeCliente,
        link_dashboard: emailConfig.placeholders.link_dashboard,
        link_offerte: emailConfig.placeholders.link_offerte,
        unsubscribe_link: unsubscribeLink
    };
    
    const subject = renderTemplate(template.subject, data);
    const html = renderTemplate(template.html_content, data);
    
    return { subject, html };
}

// ═══════════════════════════════════════════════════
// UTILITY: Lista template disponibili
// ═══════════════════════════════════════════════════
export async function getAvailableTemplates(): Promise<any[]> {
    const result = await pool.query(`
        SELECT id, nome, tipo, subject, placeholders, attivo
        FROM email_templates
        WHERE attivo = 1
        ORDER BY tipo, nome
    `);
    
    return result.rows;
}

// ═══════════════════════════════════════════════════
// UTILITY: Ottieni template per tipo
// ═══════════════════════════════════════════════════
export async function getTemplateByType(tipo: string): Promise<any> {
    const result = await pool.query(`
        SELECT * FROM email_templates
        WHERE tipo = ? AND attivo = 1
        LIMIT 1
    `, [tipo]);
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return result.rows[0];
}

