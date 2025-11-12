/**
 * ════════════════════════════════════════════════════════════════════════════════
 * UTILITY DATA QUALITY - Validazione e Score Qualità Dati
 * ════════════════════════════════════════════════════════════════════════════════
 */

export interface DataQualityResult {
    score: number; // 0-100
    incomplete_data: boolean;
    missing_fields: string[];
    essential_complete: boolean;
    warnings: string[];
}

// Campi essenziali per CLIENTE PRIVATO
const ESSENTIAL_FIELDS_PRIVATO = [
    'nome',
    'cognome',
    'codice_fiscale',
    'email_principale',
    'telefono_principale',
    'indirizzo_residenza',
    'citta',
    'provincia',
    'cap'
];

// Campi opzionali ma consigliati per PRIVATO
const OPTIONAL_FIELDS_PRIVATO = [
    'data_nascita',
    'luogo_nascita',
    'documento_tipo',
    'documento_numero',
    'email_secondaria',
    'telefono_secondario',
    'pec',
    'iban'
];

// Campi essenziali per CLIENTE AZIENDA
const ESSENTIAL_FIELDS_AZIENDA = [
    'ragione_sociale',
    'partita_iva',
    'codice_fiscale',
    'email_principale',
    'pec_aziendale',
    'telefono_principale',
    'sede_legale_indirizzo',
    'sede_legale_citta',
    'sede_legale_provincia',
    'sede_legale_cap',
    'referente_nome',
    'referente_cognome'
];

// Campi opzionali ma consigliati per AZIENDA
const OPTIONAL_FIELDS_AZIENDA = [
    'codice_ateco',
    'sede_operativa',
    'referente_telefono',
    'referente_email',
    'iban_aziendale',
    'sdi_codice',
    'email_secondaria'
];

/**
 * Valuta la qualità dei dati di un cliente PRIVATO
 */
export function evaluateDataQualityPrivato(cliente: any): DataQualityResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];
    
    // Verifica campi essenziali
    ESSENTIAL_FIELDS_PRIVATO.forEach(field => {
        if (!cliente[field] || cliente[field].toString().trim() === '') {
            missingFields.push(translateFieldName(field));
        }
    });
    
    // Verifica campi opzionali per warnings
    OPTIONAL_FIELDS_PRIVATO.forEach(field => {
        if (!cliente[field] || cliente[field].toString().trim() === '') {
            warnings.push(`Campo consigliato mancante: ${translateFieldName(field)}`);
        }
    });
    
    // Validazioni specifiche
    if (cliente.email_principale && !isValidEmail(cliente.email_principale)) {
        missingFields.push('Email principale (formato non valido)');
    }
    
    if (cliente.codice_fiscale && !isValidCodiceFiscale(cliente.codice_fiscale)) {
        warnings.push('Codice fiscale potrebbe non essere valido');
    }
    
    if (cliente.telefono_principale && cliente.telefono_principale.length < 9) {
        warnings.push('Telefono principale sembra incompleto');
    }
    
    // Calcola score
    const totalFields = ESSENTIAL_FIELDS_PRIVATO.length + OPTIONAL_FIELDS_PRIVATO.length;
    const essentialComplete = ESSENTIAL_FIELDS_PRIVATO.length - missingFields.length;
    const optionalComplete = OPTIONAL_FIELDS_PRIVATO.length - warnings.length;
    
    const score = Math.round(((essentialComplete * 2 + optionalComplete) / (totalFields + ESSENTIAL_FIELDS_PRIVATO.length)) * 100);
    
    return {
        score,
        incomplete_data: missingFields.length > 0,
        missing_fields: missingFields,
        essential_complete: missingFields.length === 0,
        warnings
    };
}

/**
 * Valuta la qualità dei dati di un cliente AZIENDA
 */
export function evaluateDataQualityAzienda(cliente: any): DataQualityResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];
    
    // Verifica campi essenziali
    ESSENTIAL_FIELDS_AZIENDA.forEach(field => {
        if (!cliente[field] || cliente[field].toString().trim() === '') {
            missingFields.push(translateFieldName(field));
        }
    });
    
    // Verifica campi opzionali per warnings
    OPTIONAL_FIELDS_AZIENDA.forEach(field => {
        if (!cliente[field] || cliente[field].toString().trim() === '') {
            warnings.push(`Campo consigliato mancante: ${translateFieldName(field)}`);
        }
    });
    
    // Validazioni specifiche
    if (cliente.email_principale && !isValidEmail(cliente.email_principale)) {
        missingFields.push('Email principale (formato non valido)');
    }
    
    if (cliente.pec_aziendale && !isValidEmail(cliente.pec_aziendale)) {
        missingFields.push('PEC aziendale (formato non valido)');
    }
    
    if (cliente.partita_iva && !isValidPartitaIva(cliente.partita_iva)) {
        warnings.push('Partita IVA potrebbe non essere valida');
    }
    
    // Calcola score
    const totalFields = ESSENTIAL_FIELDS_AZIENDA.length + OPTIONAL_FIELDS_AZIENDA.length;
    const essentialComplete = ESSENTIAL_FIELDS_AZIENDA.length - missingFields.length;
    const optionalComplete = OPTIONAL_FIELDS_AZIENDA.length - warnings.length;
    
    const score = Math.round(((essentialComplete * 2 + optionalComplete) / (totalFields + ESSENTIAL_FIELDS_AZIENDA.length)) * 100);
    
    return {
        score,
        incomplete_data: missingFields.length > 0,
        missing_fields: missingFields,
        essential_complete: missingFields.length === 0,
        warnings
    };
}

/**
 * Validazione email
 */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validazione Codice Fiscale (semplificata)
 */
function isValidCodiceFiscale(cf: string): boolean {
    if (!cf || cf.length !== 16) return false;
    return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i.test(cf);
}

/**
 * Validazione Partita IVA
 */
function isValidPartitaIva(piva: string): boolean {
    if (!piva) return false;
    const cleaned = piva.replace(/\s/g, '');
    return /^[0-9]{11}$/.test(cleaned);
}

/**
 * Traduce nome campo tecnico in italiano
 */
function translateFieldName(field: string): string {
    const translations: { [key: string]: string } = {
        'nome': 'Nome',
        'cognome': 'Cognome',
        'codice_fiscale': 'Codice Fiscale',
        'email_principale': 'Email Principale',
        'telefono_principale': 'Telefono Principale',
        'indirizzo_residenza': 'Indirizzo Residenza',
        'citta': 'Città',
        'provincia': 'Provincia',
        'cap': 'CAP',
        'data_nascita': 'Data di Nascita',
        'luogo_nascita': 'Luogo di Nascita',
        'documento_tipo': 'Tipo Documento',
        'documento_numero': 'Numero Documento',
        'email_secondaria': 'Email Secondaria',
        'telefono_secondario': 'Telefono Secondario',
        'pec': 'PEC',
        'iban': 'IBAN',
        'ragione_sociale': 'Ragione Sociale',
        'partita_iva': 'Partita IVA',
        'pec_aziendale': 'PEC Aziendale',
        'sede_legale_indirizzo': 'Indirizzo Sede Legale',
        'sede_legale_citta': 'Città Sede Legale',
        'sede_legale_provincia': 'Provincia Sede Legale',
        'sede_legale_cap': 'CAP Sede Legale',
        'referente_nome': 'Nome Referente',
        'referente_cognome': 'Cognome Referente',
        'referente_telefono': 'Telefono Referente',
        'referente_email': 'Email Referente',
        'codice_ateco': 'Codice ATECO',
        'sede_operativa': 'Sede Operativa',
        'iban_aziendale': 'IBAN Aziendale',
        'sdi_codice': 'Codice SDI'
    };
    
    return translations[field] || field;
}

export default {
    evaluateDataQualityPrivato,
    evaluateDataQualityAzienda
};


