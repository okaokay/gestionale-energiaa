import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { pool } from '../config/database';
import path from 'path';
import XLSX from 'xlsx';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

type ImportOptions = {
    dryRun?: boolean;
    batchSize?: number;
    skipValidation?: boolean;
    skipAssociation?: boolean;
    autoDetectType?: boolean;
};

type ImportProgress = {
    stage: 'queued' | 'parsing' | 'processing' | 'completed' | 'failed';
    progress: number;
    message: string;
    startedAt: string;
    completedAt?: string;
};

type ImportResult = {
    success: boolean;
    fileName: string;
    totalRows: number;
    processed: number;
    errors: Array<{ row: number; error: string }>;
    inserted: {
        clienti_privati: number;
        contratti_luce: number;
        contratti_gas: number;
    };
    warnings: string[];
};

const activeImports: Record<string, {
    options: ImportOptions;
    progress: ImportProgress;
    result: ImportResult;
}> = {};

// Rileva le colonne presenti in una tabella (SQLite)
async function getTableColumns(tableName: string): Promise<string[]> {
    try {
        // Usa SELECT su pragma_table_info per massima compatibilità
        const res = await pool.query<{ name: string }>(`SELECT name FROM pragma_table_info('${tableName}')`);
        return (res.rows || []).map(r => String((r as any).name)).filter(Boolean);
    } catch {
        return [];
    }
}

// Mappa nome->tipo delle colonne
async function getTableColumnTypes(tableName: string): Promise<Record<string, string>> {
    try {
        const res = await pool.query<{ name: string; type: string }>(`SELECT name, type FROM pragma_table_info('${tableName}')`);
        const out: Record<string, string> = {};
        for (const r of res.rows || []) {
            const name = String((r as any).name || '').trim();
            const type = String((r as any).type || '').trim().toUpperCase();
            if (name) out[name] = type;
        }
        return out;
    } catch {
        return {};
    }
}

function parseCsvSimple(content: string) {
    // Normalizza newline e rimuove righe vuote
    let lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], records: [] };

    // Gestisci BOM (\uFEFF) ed eventuale riga iniziale Excel "sep=,"
    const firstLineClean = lines[0].replace(/^\uFEFF/, '').trim();
    if (/^sep\s*=\s*[,;\t]$/i.test(firstLineClean)) {
        lines = lines.slice(1);
    }

    if (lines.length < 2) return { headers: [], records: [] };

    const headerLine = lines[0].replace(/^\uFEFF/, '');
    // Rilevamento automatico del delimitatore: preferisci quello con più occorrenze
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const tabCount = (headerLine.match(/\t/g) || []).length;
    let delimiter = ',';
    if (semicolonCount > commaCount && semicolonCount >= tabCount) {
        delimiter = ';';
    } else if (tabCount > commaCount && tabCount > semicolonCount) {
        delimiter = '\t';
    }

    // Normalizza le intestazioni: lowercase e sostituzione spazi con underscore
    const normalizeHeader = (h: string) => h
        .trim()
        .replace(/(^"|"$)/g, '')
        .toLowerCase()
        .replace(/\s+/g, '_');
    const headers = headerLine.split(delimiter).map(normalizeHeader);

    const records: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
        let raw = lines[i];
        if (!raw.trim()) continue;
        raw = raw.replace(/^\uFEFF/, '');
        // Nota: parsing semplice; per campi con delimitatore in quote, usa csv-parse
        const values = raw.split(delimiter).map(v => v.trim().replace(/(^"|"$)/g, ''));
        const record: Record<string, string> = {};
        headers.forEach((h, idx) => {
            record[h] = values[idx] || '';
        });
        records.push(record);
    }
    return { headers, records };
}

// Ritorna il primo valore non vuoto tra le chiavi indicate
function pickFirstNonEmpty(record: Record<string, any>, keys: string[]): string | null {
    for (const k of keys) {
        const v = record[k];
        if (v !== undefined && v !== null) {
            const s = String(v).trim();
            if (s.length > 0) return s;
        }
    }
    return null;
}

// Converte formati comuni di data in YYYY-MM-DD (se possibile)
function normalizeDate(value: string | null): string | null {
    if (!value) return null;
    const s = value.trim();
    // Se è già in formato ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Formato italiano/Excel DD/MM/YYYY o D/M/YY
    const m = s.match(/^([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{2}|\d{4})$/);
    if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        let yyyy = m[3];
        if (yyyy.length === 2) {
            // Heuristica: anni 00-69 -> 2000-2069, 70-99 -> 1970-1999
            const yy = parseInt(yyyy, 10);
            yyyy = String(yy >= 70 ? 1900 + yy : 2000 + yy);
        }
        return `${yyyy}-${mm}-${dd}`;
    }
    // Timestamp Excel seriale (numero di giorni dal 1899-12-30)
    if (/^\d+$/.test(s)) {
        const serial = parseInt(s, 10);
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(epoch.getTime() + serial * 86400000);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    return s; // fallback: ritorna stringa originale
}

// Normalizza numeri provenienti da CSV (es. "0,25", "1.234,56", "€0,25/kWh") in number
function normalizeNumber(value: string | number | null): number | null {
    if (value === null || value === undefined) return null;
    let s = String(value).trim().toLowerCase();
    if (!s) return null;
    // Rimuovi simboli di valuta e testo comune
    s = s.replace(/eur|euro|€/g, '');
    // Mantieni solo cifre, segno, virgole e punti
    s = s.replace(/[^0-9,\.\-]/g, '');
    // Se presenti sia virgola che punto, assume punto come migliaia e virgola decimale
    if (s.includes(',') && s.includes('.')) {
        s = s.replace(/\./g, '');
    }
    // Sostituisci virgola con punto come separatore decimale
    s = s.replace(/,/g, '.');
    // Se rimangono più punti, conserva solo l'ultimo come separatore decimale
    const dotParts = s.split('.');
    if (dotParts.length > 2) {
        const last = dotParts.pop() as string;
        s = dotParts.join('') + '.' + last;
    }
    const n = parseFloat(s);
    if (Number.isNaN(n)) return null;
    return n;
}

// Rileva dinamicamente il nome della colonna di scadenza
// Alcuni DB hanno `data_scadenza`, altri `data_fine`.
async function getScadenzaColumn(tableName: 'contratti_luce' | 'contratti_gas'): Promise<'data_scadenza' | 'data_fine'> {
    try {
        const res = await pool.query<{ name: string }>(`PRAGMA table_info(${tableName})`);
        const cols = res.rows?.map((r: any) => r.name?.toLowerCase()) || [];
        if (cols.includes('data_scadenza')) return 'data_scadenza';
        if (cols.includes('data_fine')) return 'data_fine';
        // Default di sicurezza
        return 'data_fine';
    } catch {
        return 'data_fine';
    }
}

async function findUserIdByEmail(email?: string): Promise<string | null> {
    if (!email) return null;
    try {
        const res = await pool.query<{ id: number | string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
        const row = res.rows?.[0];
        return row ? String(row.id) : null;
    } catch {
        return null;
    }
}

// Trova ID utente tramite nome completo ("Nome Cognome") o singolo token
async function findUserIdByName(fullName?: string): Promise<string | null> {
    if (!fullName) return null;
    // Normalizza: rimuove spazi multipli, punteggiatura comune e abbassa il case
    const normalize = (s: string) => {
        return s
            .replace(/\s+/g, ' ')
            .replace(/[\'\.\-,]/g, '')
            .trim()
            .toLowerCase();
    };

    const raw = String(fullName).trim();
    if (!raw) return null;
    const nameNorm = normalize(raw);

    try {
        // Match esatto su nome+cognome normalizzati (entrambe le combinazioni)
        const res = await pool.query<{ id: number | string }>(
            `SELECT id FROM users 
             WHERE LOWER(REPLACE(REPLACE(REPLACE(TRIM(nome || ' ' || cognome), '''', ''), '.', ''), ',', '')) = $1
                OR LOWER(REPLACE(REPLACE(REPLACE(TRIM(cognome || ' ' || nome), '''', ''), '.', ''), ',', '')) = $1
             LIMIT 1`,
            [nameNorm, nameNorm]
        );
        if (res.rows?.[0]?.id) return String(res.rows[0].id);

        // Tokenizza e prova match separato nome/cognome
        const parts = nameNorm.split(' ').filter(Boolean);
        if (parts.length >= 2) {
            const first = parts[0];
            const last = parts.slice(1).join(' ');
            // Match esatto su nome e cognome
            const r2 = await pool.query<{ id: number | string }>(
                `SELECT id FROM users 
                 WHERE LOWER(REPLACE(TRIM(nome), '''', '')) = $1 
                   AND LOWER(REPLACE(TRIM(cognome), '''', '')) = $2 
                 LIMIT 1`,
                [first, last]
            );
            if (r2.rows?.[0]?.id) return String(r2.rows[0].id);
            // Fallback fuzzy: LIKE su nome e cognome
            const r2like = await pool.query<{ id: number | string }>(
                `SELECT id FROM users 
                 WHERE LOWER(REPLACE(TRIM(nome), '''', '')) LIKE '%' || $1 || '%' 
                   AND LOWER(REPLACE(TRIM(cognome), '''', '')) LIKE '%' || $2 || '%' 
                 LIMIT 1`,
                [first, last]
            );
            if (r2like.rows?.[0]?.id) return String(r2like.rows[0].id);
        } else {
            const token = parts[0] || nameNorm;
            // Fallback: match su singolo token in nome o cognome
            const r3 = await pool.query<{ id: number | string }>(
                `SELECT id FROM users 
                 WHERE LOWER(REPLACE(TRIM(nome), '''', '')) = $1 
                    OR LOWER(REPLACE(TRIM(cognome), '''', '')) = $1 
                 LIMIT 1`,
                [token, token]
            );
            if (r3.rows?.[0]?.id) return String(r3.rows[0].id);
            // Fallback fuzzy: LIKE su singolo token
            const r3like = await pool.query<{ id: number | string }>(
                `SELECT id FROM users 
                 WHERE LOWER(REPLACE(TRIM(nome), '''', '')) LIKE '%' || $1 || '%' 
                    OR LOWER(REPLACE(TRIM(cognome), '''', '')) LIKE '%' || $1 || '%' 
                 LIMIT 1`,
                [token, token]
            );
            if (r3like.rows?.[0]?.id) return String(r3like.rows[0].id);
        }
    } catch {}
    return null;
}

async function findClientePrivatoId(record: Record<string, string>): Promise<string | null> {
    const cfRaw = record.codice_fiscale || record.cliente_codice_fiscale;
    const emailRaw = record.email_principale || record.cliente_email;
    const cf = cfRaw ? cfRaw.trim().toUpperCase() : null;
    const email = emailRaw ? emailRaw.trim().toLowerCase() : null;
    if (cf) {
        const res = await pool.query<{ id: number | string }>('SELECT id FROM clienti_privati WHERE UPPER(TRIM(codice_fiscale)) = $1 LIMIT 1', [cf]);
        if (res.rows[0]?.id) return String(res.rows[0].id);
    }
    if (email) {
        const res = await pool.query<{ id: number | string }>('SELECT id FROM clienti_privati WHERE LOWER(TRIM(email_principale)) = $1 LIMIT 1', [email]);
        if (res.rows[0]?.id) return String(res.rows[0].id);
    }
    return null;
}

// Trova cliente azienda esistente per Partita IVA o Ragione Sociale
async function findClienteAziendaId(record: Record<string, string>): Promise<string | null> {
    const pivaRaw = record.partita_iva || (record as any).piva || null;
    const rsRaw = record.ragione_sociale || (record as any).ragione || null;
    const piva = pivaRaw ? String(pivaRaw).trim() : null;
    const rs = rsRaw ? String(rsRaw).trim() : null;
    if (piva) {
        try {
            const res = await pool.query<{ id: number | string }>('SELECT id FROM clienti_aziende WHERE TRIM(partita_iva) = $1 LIMIT 1', [piva]);
            if (res.rows[0]?.id) return String(res.rows[0].id);
        } catch {}
    }
    if (rs) {
        try {
            const res = await pool.query<{ id: number | string }>('SELECT id FROM clienti_aziende WHERE TRIM(ragione_sociale) = $1 LIMIT 1', [rs]);
            if (res.rows[0]?.id) return String(res.rows[0].id);
        } catch {}
    }
    return null;
}

async function insertClientePrivato(record: Record<string, string>, createdBy: string | null, assignedAgentId: string | null, dryRun: boolean): Promise<string> {
    // Genera un UUID, lo useremo solo se la colonna id è TEXT
    const uuidCandidate = randomUUID();
    if (dryRun) return uuidCandidate;

    const nome = (record.nome || record.cliente_nome || '').trim() || null;
    const cognome = (record.cognome || record.cliente_cognome || '').trim() || null;
    const cfVal = record.codice_fiscale || record.cliente_codice_fiscale || null;
    const cf = cfVal ? String(cfVal).trim().toUpperCase() : null;
    const data_nascita = normalizeDate(record.data_nascita || record.cliente_data_nascita || null);
    const emailVal = record.email_principale || record.cliente_email || null;
    const email = emailVal ? String(emailVal).trim().toLowerCase() : null;
    const tel = (record.telefono_mobile || record.cliente_telefono || '').trim() || null;
    const via = (record.via_residenza || record.cliente_indirizzo || '').trim() || null;
    const civico = record.civico_residenza || null;
    const cap = (record.cap_residenza || record.cliente_cap || '').trim() || null;
    const citta = (record.citta_residenza || record.cliente_citta || '').trim() || null;
    const provincia = (record.provincia_residenza || record.cliente_provincia || '').trim() || null;
    const tipo_doc = record.tipo_documento || record.cliente_documento_tipo || null;
    const num_doc = record.numero_documento || record.cliente_documento_numero || null;
    const ente = record.ente_rilascio || record.cliente_documento_rilasciato_da || null;
    const scadenza_doc = normalizeDate(record.data_scadenza_documento || record.cliente_documento_data_scadenza || null);
    const iban = (record.iban || '').trim() || null;

    const colsAvailable = await getTableColumns('clienti_privati');
    const colTypes = await getTableColumnTypes('clienti_privati');
    const idType = (colTypes['id'] || '').toUpperCase();
    const canExplicitId = !idType || /^(TEXT|CHAR|VARCHAR)/.test(idType);
    const allFieldMap: Record<string, any> = {
        id: canExplicitId ? uuidCandidate : undefined,
        nome,
        cognome,
        codice_fiscale: cf,
        data_nascita,
        email_principale: email,
        telefono_mobile: tel,
        via_residenza: via,
        civico_residenza: civico,
        cap_residenza: cap,
        citta_residenza: citta,
        provincia_residenza: provincia,
        tipo_documento: tipo_doc,
        numero_documento: num_doc,
        ente_rilascio: ente,
        data_scadenza_documento: scadenza_doc,
        iban,
        consenso_privacy: 1,
        consenso_marketing: 1,
        data_consenso: new Date().toISOString(),
        created_by: createdBy || null,
        created_at: new Date().toISOString()
    };

    if (assignedAgentId) {
        allFieldMap['assigned_agent_id'] = assignedAgentId;
    }

    const columns: string[] = [];
    const values: any[] = [];
    for (const [col, valRaw] of Object.entries(allFieldMap)) {
        // Gestione id: includi solo se la colonna è TEXT, altrimenti lascia autoincrement e NON inserire id
        if (col === 'id' && !canExplicitId) continue;
        if (col === 'id' || colsAvailable.includes(col)) {
            const t = (colTypes[col] || '').toUpperCase();
            let v = valRaw;
            // Special-case: non forzare a numero l'ID agente assegnato
            // In alcuni DB la colonna può risultare INTEGER, ma l'ID utente è testuale/UUID.
            // Manteniamo sempre il valore come stringa per evitare null in inserimento.
            if (col === 'assigned_agent_id') {
                v = (v === null || v === undefined) ? null : String(v);
            } else {
            if (v !== null && v !== undefined) {
                if (/^(INTEGER|INT|BIGINT|SMALLINT)$/.test(t)) {
                    const num = normalizeNumber(v);
                    v = num === null ? null : num;
                } else if (/^(REAL|FLOAT|DOUBLE)$/.test(t)) {
                    const num = normalizeNumber(v);
                    v = num === null ? null : num;
                } else if (/^(NUMERIC|DECIMAL)/.test(t)) {
                    const num = normalizeNumber(v);
                    v = num === null ? null : num;
                } else if (/^(BOOLEAN)$/.test(t)) {
                    const s = String(v).trim().toLowerCase();
                    v = (s === '1' || s === 'true' || s === 'si' || s === 'sì' || s === 'yes') ? 1 : (s === '0' || s === 'false' || s === 'no') ? 0 : null;
                } else if (/^(DATE|DATETIME|TIMESTAMP)$/.test(t)) {
                    const d = normalizeDate(String(v));
                    v = d || null;
                } else {
                    v = (v === null ? null : String(v));
                }
            }
            }
            columns.push(col);
            values.push(v);
        }
    }

    if (columns.length === 0) {
        throw new Error('Schema clienti_privati non compatibile: nessuna colonna disponibile per l\'inserimento');
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    // Prova ad ottenere l'id tramite RETURNING; fallback a last_insert_rowid()
    try {
        const res = await pool.query<{ id: number | string }>(
            `INSERT INTO clienti_privati (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
            values
        );
        const newId = res.rows?.[0]?.id ? String(res.rows[0].id) : null;
        if (newId) return newId;
    } catch {
        // Ignora e usa fallback
    }
    await pool.query(`INSERT INTO clienti_privati (${columns.join(', ')}) VALUES (${placeholders})`, values);
    try {
        const rid = await pool.query<{ id: number | string }>(`SELECT last_insert_rowid() AS id`);
        const newId = rid.rows?.[0]?.id ? String(rid.rows[0].id) : null;
        if (newId) return newId;
    } catch {
        // Se non disponibile, come ultima risorsa ritorna uuidCandidate (solo se esplicito)
    }
    return canExplicitId ? uuidCandidate : uuidCandidate; // default: garantisci un ritorno coerente
}

// Effettua UPSERT esplicito: se esiste aggiorna, altrimenti inserisce con UUID
async function upsertClientePrivato(record: Record<string, string>, createdBy: string | null, assignedAgentId: string | null, dryRun: boolean): Promise<{ id: string; action: 'inserted' | 'updated' | 'would_insert' | 'would_update' }> {
    const existingId = await findClientePrivatoId(record);
    if (dryRun) {
        return { id: existingId || randomUUID(), action: existingId ? 'would_update' : 'would_insert' };
    }

    const colsAvailable = await getTableColumns('clienti_privati');
    if (existingId) {
        // Normalizza CF/Email dal record
        const cfVal = record.codice_fiscale || record.cliente_codice_fiscale || null;
        const emailVal = record.email_principale || record.cliente_email || null;
        const normalizedCf = cfVal ? String(cfVal).trim().toUpperCase() : null;
        const normalizedEmail = emailVal ? String(emailVal).trim().toLowerCase() : null;

        const updates: Record<string, any> = {
            nome: (record.nome || record.cliente_nome || '').trim() || null,
            cognome: (record.cognome || record.cliente_cognome || '').trim() || null,
            data_nascita: normalizeDate(record.data_nascita || record.cliente_data_nascita || null),
            telefono_mobile: (record.telefono_mobile || record.cliente_telefono || '').trim() || null,
            via_residenza: (record.via_residenza || record.cliente_indirizzo || '').trim() || null,
            civico_residenza: record.civico_residenza || null,
            cap_residenza: (record.cap_residenza || record.cliente_cap || '').trim() || null,
            citta_residenza: (record.citta_residenza || record.cliente_citta || '').trim() || null,
            provincia_residenza: (record.provincia_residenza || record.cliente_provincia || '').trim() || null,
            tipo_documento: record.tipo_documento || record.cliente_documento_tipo || null,
            numero_documento: record.numero_documento || record.cliente_documento_numero || null,
            ente_rilascio: record.ente_rilascio || record.cliente_documento_rilasciato_da || null,
            data_scadenza_documento: normalizeDate(record.data_scadenza_documento || record.cliente_documento_data_scadenza || null),
            iban: (record.iban || '').trim() || null
        };
        if (normalizedCf) updates['codice_fiscale'] = normalizedCf;
        // Evita violazioni UNIQUE: aggiorna email solo se non appartiene ad altro record
        if (normalizedEmail) {
            try {
                const chk = await pool.query<{ id: number | string }>(
                    'SELECT id FROM clienti_privati WHERE LOWER(TRIM(email_principale)) = $1 LIMIT 1',
                    [normalizedEmail]
                );
                const foundId = chk.rows?.[0]?.id ? String(chk.rows[0].id) : null;
                if (!foundId || foundId === existingId) {
                    updates['email_principale'] = normalizedEmail;
                }
                // Se l'email è già usata da altro cliente, la saltiamo per evitare UNIQUE constraint failed
            } catch {
                // In caso di errore nel check, non aggiornare l'email
            }
        }
        if (assignedAgentId) updates['assigned_agent_id'] = assignedAgentId;
        if (createdBy) updates['created_by'] = createdBy;

        const setParts: string[] = [];
        const params: any[] = [];
        Object.entries(updates).forEach(([k, v]) => {
            if ((k === 'created_by' || k === 'assigned_agent_id' || colsAvailable.includes(k)) && v !== null) {
                setParts.push(`${k} = $${params.length + 1}`);
                params.push(v);
            }
        });
        if (setParts.length > 0) {
            params.push(existingId);
            await pool.query(`UPDATE clienti_privati SET ${setParts.join(', ')} WHERE id = $${params.length}`, params);
        }
        return { id: existingId, action: 'updated' };
    }

    const newId = await insertClientePrivato(record, createdBy, assignedAgentId, false);
    return { id: newId, action: 'inserted' };
}

// Inserisce azienda con mappatura dinamica sulle colonne disponibili
async function insertClienteAzienda(record: Record<string, string>, createdBy: string | null, assignedAgentId: string | null, dryRun: boolean): Promise<string> {
    const uuidCandidate = randomUUID();
    if (dryRun) return uuidCandidate;
    const cols = await getTableColumns('clienti_aziende');
    const colTypes = await getTableColumnTypes('clienti_aziende');
    const idType = (colTypes['id'] || '').toUpperCase();
    const canExplicitId = !idType || /^(TEXT|CHAR|VARCHAR)/.test(idType);
    const fieldMap: Record<string, any> = {
        id: canExplicitId ? uuidCandidate : undefined,
        ragione_sociale: (record.ragione_sociale || (record as any).ragione || '').trim() || null,
        partita_iva: (record.partita_iva || (record as any).piva || '').trim() || null,
        codice_fiscale: (record.codice_fiscale || '').trim() || null,
        codice_cliente: (record.codice_cliente || '').trim() || null,
        codice_ateco: (record.codice_ateco || '').trim() || null,
        pec_aziendale: (record.pec || record.pec_aziendale || '').trim() || null,
        codice_sdi: (record.codice_sdi || '').trim() || null,
        via_sede_legale: (record.via || record.via_sede_legale || '').trim() || null,
        civico_sede_legale: record.numero_civico || record.civico_sede_legale || null,
        citta_sede_legale: (record.citta || record.citta_sede_legale || '').trim() || null,
        cap_sede_legale: (record.cap || record.cap_sede_legale || '').trim() || null,
        provincia_sede_legale: (record.provincia || record.provincia_sede_legale || '').trim() || null,
        nome_referente: (record.nome_referente || '').trim() || null,
        cognome_referente: (record.cognome_referente || '').trim() || null,
        email_referente: (record.email_referente || record.email_principale || '').trim().toLowerCase() || null,
        telefono_referente: (record.telefono_referente || '').trim() || null,
        email_principale: (record.email_principale || '').trim().toLowerCase() || null,
        consenso_marketing: (String(record.consenso_marketing || '').trim() === '1') ? 1 : 0,
        news_letter: (String(record.news_letter || '').trim() === '1') ? 1 : 0,
        utente_acquisizione: (record.utente_acquisizione || '').trim() || null,
        note: (record.note || '').trim() || null,
        assigned_agent_id: assignedAgentId || null,
        created_by: createdBy || null,
    };
    const columns: string[] = [];
    const values: any[] = [];
    Object.entries(fieldMap).forEach(([k, v]) => {
        if (k === 'id' && !canExplicitId) return;
        if (k === 'id' || cols.includes(k)) {
            columns.push(k);
            values.push(v);
        }
    });
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    try {
        const res = await pool.query<{ id: number | string }>(
            `INSERT INTO clienti_aziende (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
            values
        );
        const newId = res.rows?.[0]?.id ? String(res.rows[0].id) : null;
        if (newId) return newId;
    } catch {
        // Fallback
    }
    await pool.query(`INSERT INTO clienti_aziende (${columns.join(', ')}) VALUES (${placeholders})`, values);
    try {
        const rid = await pool.query<{ id: number | string }>(`SELECT last_insert_rowid() AS id`);
        const newId = rid.rows?.[0]?.id ? String(rid.rows[0].id) : null;
        if (newId) return newId;
    } catch {}
    return canExplicitId ? uuidCandidate : uuidCandidate;
}

// Upsert azienda: aggiorna se trovata, altrimenti inserisce
async function upsertClienteAzienda(record: Record<string, string>, createdBy: string | null, assignedAgentId: string | null, dryRun: boolean): Promise<{ id: string; action: 'inserted' | 'updated' | 'would_insert' | 'would_update' }> {
    const existingId = await findClienteAziendaId(record);
    if (existingId) {
        if (dryRun) return { id: existingId, action: 'would_update' };
        const cols = await getTableColumns('clienti_aziende');
        const updates: Record<string, any> = {
            ragione_sociale: (record.ragione_sociale || (record as any).ragione || '').trim() || null,
            partita_iva: (record.partita_iva || (record as any).piva || '').trim() || null,
            codice_fiscale: (record.codice_fiscale || '').trim() || null,
            codice_cliente: (record.codice_cliente || '').trim() || null,
            codice_ateco: (record.codice_ateco || '').trim() || null,
            pec_aziendale: (record.pec || record.pec_aziendale || '').trim() || null,
            codice_sdi: (record.codice_sdi || '').trim() || null,
            via_sede_legale: (record.via || record.via_sede_legale || '').trim() || null,
            civico_sede_legale: record.numero_civico || record.civico_sede_legale || null,
            citta_sede_legale: (record.citta || record.citta_sede_legale || '').trim() || null,
            cap_sede_legale: (record.cap || record.cap_sede_legale || '').trim() || null,
            provincia_sede_legale: (record.provincia || record.provincia_sede_legale || '').trim() || null,
            nome_referente: (record.nome_referente || '').trim() || null,
            cognome_referente: (record.cognome_referente || '').trim() || null,
            email_referente: (record.email_referente || record.email_principale || '').trim().toLowerCase() || null,
            telefono_referente: (record.telefono_referente || '').trim() || null,
            email_principale: (record.email_principale || '').trim().toLowerCase() || null,
            consenso_marketing: (String(record.consenso_marketing || '').trim() === '1') ? 1 : 0,
            news_letter: (String(record.news_letter || '').trim() === '1') ? 1 : 0,
            utente_acquisizione: (record.utente_acquisizione || '').trim() || null,
            note: (record.note || '').trim() || null,
        };
        const sets: string[] = [];
        const params: any[] = [];
        Object.entries(updates).forEach(([k, v]) => {
            if (cols.includes(k) && v !== null) {
                sets.push(`${k} = $${params.length + 1}`);
                params.push(v);
            }
        });
        if (assignedAgentId) {
            // Aggiorna sempre l'agente assegnato se determinato, anche se la colonna non era nel CSV
            sets.push(`assigned_agent_id = $${params.length + 1}`);
            params.push(assignedAgentId);
        }
        if (createdBy && cols.includes('created_by')) {
            sets.push(`created_by = $${params.length + 1}`);
            params.push(createdBy);
        }
        if (sets.length > 0) {
            params.push(existingId);
            await pool.query(`UPDATE clienti_aziende SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
        }
        return { id: existingId, action: 'updated' };
    }
    const newId = await insertClienteAzienda(record, createdBy, assignedAgentId, dryRun);
    return { id: newId, action: dryRun ? 'would_insert' : 'inserted' };
}

async function insertContrattoLuce(record: Record<string, string>, clienteId: string, clienteType: 'privato' | 'azienda', createdBy: string | null, dryRun: boolean): Promise<string> {
    const id = randomUUID();
    if (dryRun) return id;

    let numero_contratto = record.numero_contratto || record.contratto_luce_numero || record.numero_contratto_luce || null;
    let pod = record.pod || record.contratto_luce_pod || (record as any).pod_pdr || null;
    let fornitore = record.fornitore || record.contratto_luce_fornitore_precedente || (record as any).fornitore_luce || null;
    const data_attivazione_raw = record.data_attivazione || record.contratto_luce_data_inizio || (record as any).data_attivazione_luce || null;
    const data_scadenza_raw = record.data_scadenza || record.contratto_luce_data_fine || record.contratto_luce_data_scadenza || (record as any).data_scadenza_luce || null;
    const prezzo_energia_raw = record.prezzo_energia || record.contratto_luce_prezzo_energia || (record as any).prezzo_energia_luce || null;
    const data_attivazione = normalizeDate(data_attivazione_raw);
    let data_scadenza = normalizeDate(data_scadenza_raw);
    let prezzo_energia = normalizeNumber(prezzo_energia_raw);
    const stato_csv = (record.stato || record.stato_contratto || (record as any)['stato contratto luce'] || record.stato_contratto_luce || null);

    // Determina il nome della colonna di scadenza presente nel DB
    const scadenzaCol = await getScadenzaColumn('contratti_luce');

    // Rileva colonne disponibili per gestire DB senza created_by/stato
    const colsAvailable = await getTableColumns('contratti_luce');
    const clientCol = (clienteType === 'azienda')
        ? (colsAvailable.includes('cliente_azienda_id') ? 'cliente_azienda_id' : (colsAvailable.includes('cliente_id') ? 'cliente_id' : 'cliente_privato_id'))
        : (colsAvailable.includes('cliente_privato_id') ? 'cliente_privato_id' : (colsAvailable.includes('cliente_id') ? 'cliente_id' : 'cliente_azienda_id'));

    // Verifica esistenza FK cliente per evitare errori opachi
    try {
        if (clientCol === 'cliente_privato_id' || (clienteType === 'privato' && clientCol === 'cliente_id')) {
            const chk = await pool.query('SELECT 1 FROM clienti_privati WHERE id = $1 LIMIT 1', [clienteId]);
            if (!chk.rows || chk.rows.length === 0) throw new Error('cliente_privato_id inesistente');
        } else {
            const chk = await pool.query('SELECT 1 FROM clienti_aziende WHERE id = $1 LIMIT 1', [clienteId]);
            if (!chk.rows || chk.rows.length === 0) throw new Error('cliente_azienda_id inesistente');
        }
    } catch (e) {
        // Propaga errore specifico per essere mostrato nel risultato import
        throw new Error(`FK cliente mancante: ${(e as Error).message}`);
    }

    // Valida created_by: se l'utente non esiste su questo DB, evita violazioni FK
    let createdBySafe: string | null = null;
    if (createdBy && colsAvailable.includes('created_by')) {
        try {
            const r = await pool.query<{ id: number | string }>('SELECT id FROM users WHERE id = $1 LIMIT 1', [createdBy]);
            createdBySafe = r.rows?.[0]?.id ? String(r.rows[0].id) : null;
        } catch {
            createdBySafe = null;
        }
    }

    const columns: string[] = ['id', clientCol, 'tipo_cliente', 'numero_contratto', 'pod', 'fornitore', 'data_attivazione', scadenzaCol];
    const values: any[] = [id, clienteId, clienteType, numero_contratto, pod, fornitore, data_attivazione, data_scadenza];

    if (colsAvailable.includes('prezzo_energia')) {
        columns.push('prezzo_energia');
        values.push(prezzo_energia);
    }
    if (colsAvailable.includes('stato')) {
        columns.push('stato');
        values.push(stato_csv || 'compilazione');
    }
    if (colsAvailable.includes('created_by')) {
        columns.push('created_by');
        values.push(createdBySafe);
    }
    // Nota: evitiamo 'created_at' per compatibilità, se presente sarà gestito da default/trigger esterni

    // Heuristica: se pod è assente ma numero_contratto sembra un POD, usa quello
    if (!pod && numero_contratto && /^IT[0-9A-Z]{10,}$/.test(String(numero_contratto))) {
        pod = numero_contratto;
        const idx = columns.indexOf('pod');
        if (idx >= 0) values[idx] = pod;
    }

    // Fallback per colonne obbligatorie nei DB più rigidi
    if (!numero_contratto) {
        numero_contratto = pod || `AUTO-${id.slice(0, 8)}`;
        const idx = columns.indexOf('numero_contratto');
        if (idx >= 0) values[idx] = numero_contratto;
    }
    if (!pod) {
        pod = `AUTO-${id.slice(0, 8)}`;
        const idx = columns.indexOf('pod');
        if (idx >= 0) values[idx] = pod;
    }
    if (!fornitore) {
        fornitore = 'non_specificato';
        const idx = columns.indexOf('fornitore');
        if (idx >= 0) values[idx] = fornitore;
    }
    if (!data_scadenza) {
        data_scadenza = data_attivazione || new Date().toISOString().slice(0, 10);
        const idx = columns.indexOf(scadenzaCol);
        if (idx >= 0) values[idx] = data_scadenza;
    }
    if (colsAvailable.includes('prezzo_energia') && (prezzo_energia === null || prezzo_energia === undefined)) {
        prezzo_energia = 0;
        const idx = columns.indexOf('prezzo_energia');
        if (idx >= 0) values[idx] = prezzo_energia;
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    await pool.query(`
        INSERT INTO contratti_luce (${columns.join(', ')})
        VALUES (${placeholders})
    `, values);

    return id;
}

// Trova un contratto luce esistente tramite numero_contratto o POD (eventualmente legato al cliente)
async function findContrattoLuceId(record: Record<string, string>, clienteId?: string): Promise<string | null> {
    const numero_contratto = record.numero_contratto || record.contratto_luce_numero || record.numero_contratto_luce || null;
    const pod = record.pod || record.contratto_luce_pod || (record as any).pod_pdr || null;
    // Prima prova con numero_contratto
    if (numero_contratto) {
        try {
            const res = await pool.query<{ id: number | string }>('SELECT id FROM contratti_luce WHERE numero_contratto = $1 LIMIT 1', [numero_contratto]);
            if (res.rows?.[0]?.id) return String(res.rows[0].id);
        } catch {}
    }
    // Poi prova con POD
    if (pod) {
        try {
            // Se disponibile, usa anche il cliente come contesto
            const cols = await getTableColumns('contratti_luce');
            let query = 'SELECT id FROM contratti_luce WHERE pod = $1';
            const params: any[] = [pod];
            if (clienteId) {
                const hasPriv = cols.includes('cliente_privato_id');
                const hasAz = cols.includes('cliente_azienda_id');
                const hasGen = cols.includes('cliente_id');
                if (hasPriv && hasAz) {
                    query += ' AND (cliente_privato_id = $2 OR cliente_azienda_id = $3)';
                    params.push(clienteId, clienteId);
                } else if (hasAz) {
                    query += ' AND cliente_azienda_id = $2';
                    params.push(clienteId);
                } else if (hasPriv) {
                    query += ' AND cliente_privato_id = $2';
                    params.push(clienteId);
                } else if (hasGen) {
                    query += ' AND cliente_id = $2';
                    params.push(clienteId);
                }
            }
            query += ' LIMIT 1';
            const res = await pool.query<{ id: number | string }>(query, params);
            if (res.rows?.[0]?.id) return String(res.rows[0].id);
        } catch {}
    }
    return null;
}

// Effettua UPSERT per contratto luce: se esiste aggiorna, altrimenti inserisce
async function upsertContrattoLuce(record: Record<string, string>, clienteId: string, clienteType: 'privato' | 'azienda', createdBy: string | null, dryRun: boolean): Promise<{ id: string; action: 'inserted' | 'updated' | 'would_insert' | 'would_update' }> {
    // Comportamento di default: se esiste un contratto con stesso POD/numero, aggiorna
    // "modalita_import" può ancora forzare l'inserimento solo se non esiste alcun match
    const existingId = await findContrattoLuceId(record, clienteId);
    if (existingId) {
        if (dryRun) return { id: existingId, action: 'would_update' };

        const numero_contratto = record.numero_contratto || record.contratto_luce_numero || record.numero_contratto_luce || null;
        let pod = record.pod || record.contratto_luce_pod || (record as any).pod_pdr || null;
        const fornitore = record.fornitore || record.contratto_luce_fornitore_precedente || (record as any).fornitore_luce || null;
        const data_attivazione_raw = record.data_attivazione || record.contratto_luce_data_inizio || (record as any).data_attivazione_luce || null;
        const data_scadenza_raw = record.data_scadenza || record.contratto_luce_data_fine || record.contratto_luce_data_scadenza || (record as any).data_scadenza_luce || null;
        const prezzo_energia_raw = record.prezzo_energia || record.contratto_luce_prezzo_energia || (record as any).prezzo_energia_luce || null;
        const data_attivazione = normalizeDate(data_attivazione_raw);
        const data_scadenza = normalizeDate(data_scadenza_raw);
        const prezzo_energia = normalizeNumber(prezzo_energia_raw);
        const stato_csv = (record.stato || record.stato_contratto || (record as any)['stato contratto luce'] || record.stato_contratto_luce || null);

        const scadenzaCol = await getScadenzaColumn('contratti_luce');
        const colsAvailable = await getTableColumns('contratti_luce');

        // Heuristica: se pod è assente ma numero_contratto sembra un POD, usa quello
        if (!pod && numero_contratto && /^IT[0-9A-Z]{10,}$/.test(String(numero_contratto))) {
            pod = numero_contratto;
        }

        const sets: string[] = [];
        const params: any[] = [];
        if (numero_contratto !== null) { sets.push('numero_contratto = $' + (params.push(numero_contratto))); }
        if (pod !== null) { sets.push('pod = $' + (params.push(pod))); }
        if (fornitore !== null) { sets.push('fornitore = $' + (params.push(fornitore))); }
        if (data_attivazione !== null) { sets.push('data_attivazione = $' + (params.push(data_attivazione))); }
        if (data_scadenza !== null) { sets.push(`${scadenzaCol} = $` + (params.push(data_scadenza))); }
        if (colsAvailable.includes('prezzo_energia')) { sets.push('prezzo_energia = $' + (params.push(prezzo_energia))); }
        if (colsAvailable.includes('stato')) { sets.push('stato = $' + (params.push(stato_csv || 'compilazione'))); }

        if (sets.length > 0) {
            params.push(existingId);
            const setClause = sets.join(', ');
            await pool.query(`UPDATE contratti_luce SET ${setClause} WHERE id = $${params.length}`, params);
        }
        return { id: existingId, action: 'updated' };
    }

    // Fallback: inserisci
    const newId = await insertContrattoLuce(record, clienteId, clienteType, createdBy, dryRun);
    return { id: newId, action: dryRun ? 'would_insert' : 'inserted' };
}

async function insertContrattoGas(record: Record<string, string>, clienteId: string, clienteType: 'privato' | 'azienda', createdBy: string | null, dryRun: boolean): Promise<string> {
    const id = randomUUID();
    if (dryRun) return id;

    let numero_contratto = record.numero_contratto || record.contratto_gas_numero || record.numero_contratto_gas || null;
    let pdr = record.pdr || record.contratto_gas_pdr || (record as any).pod_pdr || null;
    let fornitore = record.fornitore || record.contratto_gas_fornitore_precedente || (record as any).fornitore_gas || null;
    const data_attivazione_raw = record.data_attivazione || record.contratto_gas_data_inizio || (record as any).data_attivazione_gas || null;
    const data_scadenza_raw = record.data_scadenza || record.contratto_gas_data_fine || record.contratto_gas_data_scadenza || (record as any).data_scadenza_gas || null;
    const prezzo_gas_raw = record.prezzo_gas || record.contratto_gas_prezzo_gas || (record as any).prezzo_gas_gas || null;
    const data_attivazione = normalizeDate(data_attivazione_raw);
    let data_scadenza = normalizeDate(data_scadenza_raw);
    let prezzo_gas = normalizeNumber(prezzo_gas_raw);
    const stato_csv = (record.stato || record.stato_contratto || (record as any)['stato contratto gas'] || record.stato_contratto_gas || null);

    const scadenzaCol = await getScadenzaColumn('contratti_gas');

    const colsAvailable = await getTableColumns('contratti_gas');
    const clientCol = (clienteType === 'azienda')
        ? (colsAvailable.includes('cliente_azienda_id') ? 'cliente_azienda_id' : (colsAvailable.includes('cliente_id') ? 'cliente_id' : 'cliente_privato_id'))
        : (colsAvailable.includes('cliente_privato_id') ? 'cliente_privato_id' : (colsAvailable.includes('cliente_id') ? 'cliente_id' : 'cliente_azienda_id'));

    // Verifica esistenza FK cliente per evitare errori opachi
    try {
        if (clientCol === 'cliente_privato_id' || (clienteType === 'privato' && clientCol === 'cliente_id')) {
            const chk = await pool.query('SELECT 1 FROM clienti_privati WHERE id = $1 LIMIT 1', [clienteId]);
            if (!chk.rows || chk.rows.length === 0) throw new Error('cliente_privato_id inesistente');
        } else {
            const chk = await pool.query('SELECT 1 FROM clienti_aziende WHERE id = $1 LIMIT 1', [clienteId]);
            if (!chk.rows || chk.rows.length === 0) throw new Error('cliente_azienda_id inesistente');
        }
    } catch (e) {
        throw new Error(`FK cliente mancante: ${(e as Error).message}`);
    }

    // Valida created_by: se l'utente non esiste su questo DB, evita violazioni FK
    let createdBySafe: string | null = null;
    if (createdBy && colsAvailable.includes('created_by')) {
        try {
            const r = await pool.query<{ id: number | string }>('SELECT id FROM users WHERE id = $1 LIMIT 1', [createdBy]);
            createdBySafe = r.rows?.[0]?.id ? String(r.rows[0].id) : null;
        } catch {
            createdBySafe = null;
        }
    }

    const columns: string[] = ['id', clientCol, 'tipo_cliente', 'numero_contratto', 'pdr', 'fornitore', 'data_attivazione', scadenzaCol];
    const values: any[] = [id, clienteId, clienteType, numero_contratto, pdr, fornitore, data_attivazione, data_scadenza];

    // Heuristica: se pdr è assente ma numero_contratto sembra un PDR numerico, usa quello
    if (!pdr && numero_contratto && /^[0-9]{11,16}$/.test(String(numero_contratto))) {
        pdr = numero_contratto;
        const idx = columns.indexOf('pdr');
        if (idx >= 0) values[idx] = pdr;
    }

    // Fallback per colonne obbligatorie nei DB più rigidi
    if (!numero_contratto) {
        numero_contratto = pdr || `AUTO-${id.slice(0, 8)}`;
        const idx = columns.indexOf('numero_contratto');
        if (idx >= 0) values[idx] = numero_contratto;
    }
    if (!pdr) {
        pdr = `AUTO-${id.slice(0, 8)}`;
        const idx = columns.indexOf('pdr');
        if (idx >= 0) values[idx] = pdr;
    }
    if (!fornitore) {
        fornitore = 'non_specificato';
        const idx = columns.indexOf('fornitore');
        if (idx >= 0) values[idx] = fornitore;
    }
    if (!data_scadenza) {
        data_scadenza = data_attivazione || new Date().toISOString().slice(0, 10);
        const idx = columns.indexOf(scadenzaCol);
        if (idx >= 0) values[idx] = data_scadenza;
    }
    if (colsAvailable.includes('prezzo_gas') && (prezzo_gas === null || prezzo_gas === undefined)) {
        prezzo_gas = 0;
        const idx = columns.indexOf('prezzo_gas');
        if (idx >= 0) values[idx] = prezzo_gas;
    }

    if (colsAvailable.includes('prezzo_gas')) {
        columns.push('prezzo_gas');
        values.push(prezzo_gas);
    }
    if (colsAvailable.includes('stato')) {
        columns.push('stato');
        values.push(stato_csv || 'compilazione');
    }
    if (colsAvailable.includes('created_by')) {
        columns.push('created_by');
        values.push(createdBySafe);
    }
    // Evitiamo 'created_at' per compatibilità

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    await pool.query(`
        INSERT INTO contratti_gas (${columns.join(', ')})
        VALUES (${placeholders})
    `, values);

    return id;
}

// Trova un contratto gas esistente tramite numero_contratto o PDR (eventualmente legato al cliente)
async function findContrattoGasId(record: Record<string, string>, clienteId?: string): Promise<string | null> {
    const numero_contratto = record.numero_contratto || record.contratto_gas_numero || record.numero_contratto_gas || null;
    const pdr = record.pdr || record.contratto_gas_pdr || (record as any).pod_pdr || null;
    if (numero_contratto) {
        try {
            const res = await pool.query<{ id: number | string }>('SELECT id FROM contratti_gas WHERE numero_contratto = $1 LIMIT 1', [numero_contratto]);
            if (res.rows?.[0]?.id) return String(res.rows[0].id);
        } catch {}
    }
    if (pdr) {
        try {
            const cols = await getTableColumns('contratti_gas');
            let query = 'SELECT id FROM contratti_gas WHERE pdr = $1';
            const params: any[] = [pdr];
            if (clienteId) {
                const hasPriv = cols.includes('cliente_privato_id');
                const hasAz = cols.includes('cliente_azienda_id');
                const hasGen = cols.includes('cliente_id');
                if (hasPriv && hasAz) {
                    query += ' AND (cliente_privato_id = $2 OR cliente_azienda_id = $3)';
                    params.push(clienteId, clienteId);
                } else if (hasAz) {
                    query += ' AND cliente_azienda_id = $2';
                    params.push(clienteId);
                } else if (hasPriv) {
                    query += ' AND cliente_privato_id = $2';
                    params.push(clienteId);
                } else if (hasGen) {
                    query += ' AND cliente_id = $2';
                    params.push(clienteId);
                }
            }
            query += ' LIMIT 1';
            const res = await pool.query<{ id: number | string }>(query, params);
            if (res.rows?.[0]?.id) return String(res.rows[0].id);
        } catch {}
    }
    return null;
}

// Effettua UPSERT per contratto gas: se esiste aggiorna, altrimenti inserisce
async function upsertContrattoGas(record: Record<string, string>, clienteId: string, clienteType: 'privato' | 'azienda', createdBy: string | null, dryRun: boolean): Promise<{ id: string; action: 'inserted' | 'updated' | 'would_insert' | 'would_update' }> {
    // Comportamento di default: se esiste un contratto con stesso PDR/numero, aggiorna
    // "modalita_import" può ancora forzare l'inserimento solo se non esiste alcun match
    const existingId = await findContrattoGasId(record, clienteId);
    if (existingId) {
        if (dryRun) return { id: existingId, action: 'would_update' };

        const numero_contratto = record.numero_contratto || record.contratto_gas_numero || record.numero_contratto_gas || null;
        let pdr = record.pdr || record.contratto_gas_pdr || (record as any).pod_pdr || null;
        const fornitore = record.fornitore || record.contratto_gas_fornitore_precedente || (record as any).fornitore_gas || null;
        const data_attivazione_raw = record.data_attivazione || record.contratto_gas_data_inizio || (record as any).data_attivazione_gas || null;
        const data_scadenza_raw = record.data_scadenza || record.contratto_gas_data_fine || record.contratto_gas_data_scadenza || (record as any).data_scadenza_gas || null;
        const prezzo_gas_raw = record.prezzo_gas || record.contratto_gas_prezzo_gas || (record as any).prezzo_gas_gas || null;
        const data_attivazione = normalizeDate(data_attivazione_raw);
        const data_scadenza = normalizeDate(data_scadenza_raw);
        const prezzo_gas = normalizeNumber(prezzo_gas_raw);
        const stato_csv = (record.stato || record.stato_contratto || (record as any)['stato contratto gas'] || record.stato_contratto_gas || null);

        const scadenzaCol = await getScadenzaColumn('contratti_gas');
        const colsAvailable = await getTableColumns('contratti_gas');

        // Heuristica: se pdr è assente ma numero_contratto sembra un PDR numerico, usa quello
        if (!pdr && numero_contratto && /^[0-9]{11,16}$/.test(String(numero_contratto))) {
            pdr = numero_contratto;
        }

        const sets: string[] = [];
        const params: any[] = [];
        if (numero_contratto !== null) { sets.push('numero_contratto = $' + (params.push(numero_contratto))); }
        if (pdr !== null) { sets.push('pdr = $' + (params.push(pdr))); }
        if (fornitore !== null) { sets.push('fornitore = $' + (params.push(fornitore))); }
        if (data_attivazione !== null) { sets.push('data_attivazione = $' + (params.push(data_attivazione))); }
        if (data_scadenza !== null) { sets.push(`${scadenzaCol} = $` + (params.push(data_scadenza))); }
        if (colsAvailable.includes('prezzo_gas')) { sets.push('prezzo_gas = $' + (params.push(prezzo_gas))); }
        if (colsAvailable.includes('stato')) { sets.push('stato = $' + (params.push(stato_csv || 'compilazione'))); }

        if (sets.length > 0) {
            params.push(existingId);
            const setClause = sets.join(', ');
            await pool.query(`UPDATE contratti_gas SET ${setClause} WHERE id = $${params.length}`, params);
        }
        return { id: existingId, action: 'updated' };
    }

    const newId = await insertContrattoGas(record, clienteId, clienteType, createdBy, dryRun);
    return { id: newId, action: dryRun ? 'would_insert' : 'inserted' };
}

function detectRecordType(rec: Record<string, string>): string {
    const t = (rec.tipo_record || rec.cliente_tipo || rec.tipo || '').toLowerCase();
    if (t.includes('privat')) return 'cliente_privato';
    if (t.includes('aziend')) return 'cliente_azienda';
    if (t.includes('luce')) return 'contratto_luce';
    if (t.includes('gas')) return 'contratto_gas';
    // fallback su colonne presenti
    if (rec.pod || rec.contratto_luce_pod) return 'contratto_luce';
    if (rec.pdr || rec.contratto_gas_pdr) return 'contratto_gas';
    if (rec.codice_fiscale || rec.email_principale || rec.cliente_email) return 'cliente_privato';
    return 'unknown';
}

router.get('/supported-types', async (req, res) => {
    res.json({
        success: true,
        data: {
            types: ['cliente_privato', 'cliente_azienda', 'contratto_luce', 'contratto_gas']
        }
    });
});

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const importId = randomUUID();
        const optionsRaw = req.body?.options || {};
        const options: ImportOptions = typeof optionsRaw === 'string' ? JSON.parse(optionsRaw) : (optionsRaw || {});
        const fileName = req.file?.originalname || 'file.csv';
        const fileBuffer = req.file?.buffer;
        const contentStr = req.file ? req.file.buffer.toString('utf8') : (typeof req.body.file === 'string' ? req.body.file : '');
        if (!fileBuffer && !contentStr) {
            return res.status(400).json({ success: false, message: 'File mancante.' });
        }

        activeImports[importId] = {
            options,
            progress: {
                stage: 'queued',
                progress: 0,
                message: 'In coda',
                startedAt: new Date().toISOString()
            },
            result: {
                success: false,
                fileName,
                totalRows: 0,
                processed: 0,
                errors: [],
                inserted: { clienti_privati: 0, contratti_luce: 0, contratti_gas: 0 },
                warnings: []
            }
        };

        // Parsing file (CSV o Excel)
        activeImports[importId].progress = { stage: 'parsing', progress: 5, message: 'Parsing file', startedAt: activeImports[importId].progress.startedAt };
        let headers: string[] = [];
        let records: Array<Record<string, any>> = [];
        const lowerName = fileName.toLowerCase();
        if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
            const { headers: h, records: r } = parseCsvSimple(contentStr || '');
            headers = h;
            records = r;
        } else if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
            try {
                const wb = XLSX.read(fileBuffer as Buffer, { type: 'buffer' });
                // Usa la prima sheet e includi valori vuoti
                const sheetName = wb.SheetNames[0];
                const ws = wb.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
                records = json as Array<Record<string, any>>;
                // Deriva intestazioni dalla prima riga se disponibile
                headers = records.length > 0 ? Object.keys(records[0]) : [];
            } catch (e: any) {
                return res.status(400).json({ success: false, message: 'Errore parsing Excel: ' + (e?.message || 'Formato non valido') });
            }
        } else {
            // Fallback: prova CSV
            const { headers: h, records: r } = parseCsvSimple(contentStr || '');
            headers = h;
            records = r;
        }
        activeImports[importId].result.totalRows = records.length;

        // Debug: colonne disponibili in clienti_privati/aziende
        try {
            const colsPriv = await getTableColumns('clienti_privati');
            const colsAz = await getTableColumns('clienti_aziende');
            activeImports[importId].result.warnings.push(`clienti_privati colonne: ${colsPriv.join(', ')}`);
            activeImports[importId].result.warnings.push(`clienti_aziende colonne: ${colsAz.join(', ')}`);
        } catch {}

        // Created_by: prendi un admin esistente se possibile
        let createdBy: string | null = null;
        try {
            const adminRes = await pool.query<{ id: number | string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', ['admin@gestionale.it']);
            createdBy = adminRes.rows[0]?.id ? String(adminRes.rows[0].id) : null;
        } catch {
            createdBy = null;
        }

        // Elaborazione
        activeImports[importId].progress = { stage: 'processing', progress: 10, message: 'Elaborazione records', startedAt: activeImports[importId].progress.startedAt };

        const batchSize = Math.max(1, Math.min(options.batchSize || 100, 1000));
        let processed = 0;

        // BEGIN TRANSACTION
        await pool.query('BEGIN');

        for (let i = 0; i < records.length; i++) {
            const rec = records[i];
            const rowNum = i + 1;
            try {
                const tipo = options.autoDetectType === false && rec.tipo_record ? rec.tipo_record : detectRecordType(rec);

                if (tipo === 'unknown') {
                    activeImports[importId].result.warnings.push(`Riga ${rowNum}: tipo_record non rilevato`);
                    continue;
                }

                // associazione agente se richiesto
                let assignedUserId: string | null = null;
                if (!options.skipAssociation) {
                    // PRIORITÀ ASSOLUTA: se è presente 'agente_nome', usa SOLO quello
                    const agenteNomeRaw = (rec as any).agente_nome;
                    if (agenteNomeRaw) {
                        assignedUserId = await findUserIdByName(agenteNomeRaw);
                        if (!assignedUserId) {
                            const tried = String(agenteNomeRaw || '').trim();
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: agente_nome non trovato per '${tried}'`);
                        }
                    } else {
                        // 1) Prova con ID diretto: se non è un ID valido, trattalo come nome
                        const directIdRaw = (rec.assigned_agent_id || (rec as any).agente_id || (rec as any).agent_id);
                        if (directIdRaw) {
                            const directId = String(directIdRaw).trim();
                            // Verifica esistenza come ID
                            try {
                                const chk = await pool.query<{ id: number | string }>('SELECT id FROM users WHERE id = $1 LIMIT 1', [directId]);
                                if (chk.rows?.[0]?.id) {
                                    assignedUserId = String(chk.rows[0].id);
                                }
                            } catch {}
                            // Se non è un ID valido, prova come email o come nome completo
                            if (!assignedUserId) {
                                assignedUserId = await findUserIdByEmail(directId) || await findUserIdByName(directId);
                            }
                        }
                        // 2) Se non trovato, prova via email esplicita
                        if (!assignedUserId) {
                            const emailCandidate = (rec as any).assigned_agent_email || (rec as any).agente_email || (rec as any).agent_email || (rec as any).assegnato_a_email;
                            assignedUserId = await findUserIdByEmail(emailCandidate);
                        }
                        // 3) Se non trovato, prova via nome esplicito (assigned_agent_name/agent_name)
                        if (!assignedUserId) {
                            const nameCandidate = (rec as any).assigned_agent_name || (rec as any).agent_name;
                            assignedUserId = await findUserIdByName(nameCandidate);
                            if (!assignedUserId && (nameCandidate || directIdRaw)) {
                                const tried = (nameCandidate || directIdRaw) ? String(nameCandidate || directIdRaw) : '';
                                activeImports[importId].result.warnings.push(`Riga ${rowNum}: agente non trovato per '${tried}'`);
                            }
                        }
                    }
                }

                // Debug: registra agente rilevato per cliente_privato
                if (tipo === 'cliente_privato') {
                    activeImports[importId].result.warnings.push(`Riga ${rowNum}: agente rilevato = ${assignedUserId || 'null'}`);
                }

                // Inserimento per tipo
                if (tipo === 'cliente_privato') {
                    const modeRaw = (rec as any).modalita_import || '';
                    const mode = String(modeRaw).toLowerCase();
                    const useUpsert = mode === 'update' || mode === 'upsert' || true; // default: usa upsert sempre per evitare duplicati

                    let clienteId: string;
                    if (useUpsert) {
                        const up = await upsertClientePrivato(rec, createdBy || assignedUserId, assignedUserId, !!options.dryRun);
                        clienteId = up.id;
                        if (up.action === 'inserted' || up.action === 'would_insert') {
                            activeImports[importId].result.inserted.clienti_privati++;
                        } else {
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: cliente_privato ${up.id} aggiornato (${up.action})`);
                        }
                    } else {
                        const existingId = await findClientePrivatoId(rec);
                        clienteId = existingId || await insertClientePrivato(rec, createdBy || assignedUserId, assignedUserId, !!options.dryRun);
                        if (!existingId) activeImports[importId].result.inserted.clienti_privati++;
                    }
                    // Se il cliente esiste già, aggiorna l'assegnazione agente se disponibile
                    if (assignedUserId && !options.dryRun) {
                        try {
                            const cols = await getTableColumns('clienti_privati');
                            if (cols.includes('assigned_agent_id')) {
                                const upd = await pool.query(`UPDATE clienti_privati SET assigned_agent_id = $1 WHERE id = $2`, [assignedUserId, clienteId]);
                                activeImports[importId].result.warnings.push(`Riga ${rowNum}: update assigned_agent_id cliente_id=${clienteId}, changes=${upd.rowCount}`);
                            } else {
                                activeImports[importId].result.warnings.push(`Riga ${rowNum}: colonna assigned_agent_id non presente, skip update`);
                            }
                        } catch (e) {
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: impossibile aggiornare assegnazione agente (${(e as any)?.message || 'errore'})`);
                        }
                    }
                    // Se nel record ci sono campi contratto luce/gas, inseriscili
                    if (rec.pod || rec.contratto_luce_pod || rec.numero_contratto_luce) {
                        // Fallback data_attivazione (contratto luce)
                        const actLuce = normalizeDate(pickFirstNonEmpty(rec, [
                            'data_attivazione', 'contratto_luce_data_inizio', 'data_inizio', 'data_stipula'
                        ]));
                        if (!actLuce) {
                            rec.data_attivazione = new Date().toISOString().slice(0, 10);
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: data_attivazione luce assente → impostata a oggi`);
                        } else {
                            rec.data_attivazione = actLuce;
                        }
                        const up = await upsertContrattoLuce(rec, clienteId, 'privato', createdBy || assignedUserId, !!options.dryRun);
                        if (up.action === 'inserted' || up.action === 'would_insert') {
                            activeImports[importId].result.inserted.contratti_luce++;
                        } else {
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: contratto_luce ${up.id} aggiornato (${up.action})`);
                        }
                    }
                    if (rec.pdr || rec.contratto_gas_pdr || rec.numero_contratto_gas) {
                        // Fallback data_attivazione (contratto gas)
                        const actGas = normalizeDate(pickFirstNonEmpty(rec, [
                            'data_attivazione', 'contratto_gas_data_inizio', 'data_inizio', 'data_stipula'
                        ]));
                        if (!actGas) {
                            rec.data_attivazione = new Date().toISOString().slice(0, 10);
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: data_attivazione gas assente → impostata a oggi`);
                        } else {
                            rec.data_attivazione = actGas;
                        }
                        const up = await upsertContrattoGas(rec, clienteId, 'privato', createdBy || assignedUserId, !!options.dryRun);
                        if (up.action === 'inserted' || up.action === 'would_insert') {
                            activeImports[importId].result.inserted.contratti_gas++;
                        } else {
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: contratto_gas ${up.id} aggiornato (${up.action})`);
                        }
                    }
                } else if (tipo === 'contratto_luce') {
                    let clienteId = await findClientePrivatoId(rec);
                    if (!clienteId) {
                        // prova con azienda
                        clienteId = await findClienteAziendaId(rec);
                    }
                    if (!clienteId) {
                        // se ci sono dati azienda in riga, upsert azienda invece di creare privato
                        const hasAziendaData = !!pickFirstNonEmpty(rec, [
                            'ragione_sociale', 'partita_iva', 'cliente_azienda_id', 'cliente_azienda_id_luce'
                        ]);
                        if (hasAziendaData) {
                            const upAz = await upsertClienteAzienda(rec, createdBy || assignedUserId, assignedUserId, !!options.dryRun);
                            clienteId = upAz.id;
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: cliente_azienda ${upAz.action} (${clienteId}) da contratto_luce`);
                        } else {
                            // usa upsert per evitare violazioni UNIQUE su email/codice_fiscale
                            const upPriv = await upsertClientePrivato(rec, createdBy || assignedUserId, assignedUserId, !!options.dryRun);
                            clienteId = upPriv.id;
                            if (upPriv.action === 'inserted' || upPriv.action === 'would_insert') {
                                activeImports[importId].result.inserted.clienti_privati++;
                            } else {
                                activeImports[importId].result.warnings.push(`Riga ${rowNum}: cliente_privato ${upPriv.id} aggiornato (${upPriv.action}) da contratto_luce`);
                            }
                        }
                    }
                    // Evita inserimenti con id cliente non valido che portano a FOREIGN KEY failed
                    if (!clienteId || clienteId === '0' || clienteId === 'null' || clienteId === 'undefined') {
                        throw new Error('Associazione cliente fallita: id cliente non valido per contratto_luce');
                    }
                    // Aggiorna assegnazione agente sul cliente trovato, se disponibile
                    // Aggiorna indipendentemente dalla presenza della colonna nel CSV
                    // (se la tabella ha il campo, l'UPDATE riuscirà; in caso contrario logga warning)
                    if (assignedUserId && !options.dryRun) {
                        try {
                            // verifica se è azienda o privato per aggiornare la tabella corretta
                            let isAziendaCheck = false;
                            try {
                                const r = await pool.query('SELECT 1 FROM clienti_aziende WHERE id = $1', [clienteId]);
                                isAziendaCheck = r.rowCount > 0;
                            } catch {}
                            const table = isAziendaCheck ? 'clienti_aziende' : 'clienti_privati';
                            const upd = await pool.query(`UPDATE ${table} SET assigned_agent_id = $1 WHERE id = $2`, [assignedUserId, clienteId]);
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: update assigned_agent_id su ${table} da contratto_luce cliente_id=${clienteId}, changes=${upd.rowCount}`);
                        } catch (e) {
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: impossibile aggiornare assegnazione agente da contratto_luce (${(e as any)?.message || 'errore'})`);
                        }
                    }
                    {
                        // Fallback data_attivazione luce
                        const actLuce = normalizeDate(pickFirstNonEmpty(rec, [
                            'data_attivazione', 'contratto_luce_data_inizio', 'data_inizio', 'data_stipula'
                        ]));
                        if (!actLuce) {
                            rec.data_attivazione = new Date().toISOString().slice(0, 10);
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: data_attivazione luce assente → impostata a oggi`);
                        } else {
                            rec.data_attivazione = actLuce;
                        }
                        // Se il clienteId appartiene ad azienda, tipo_cliente='azienda', altrimenti 'privato'
                        let isAzienda = false;
                        try {
                            const r = await pool.query('SELECT 1 FROM clienti_aziende WHERE id = $1', [clienteId]);
                            isAzienda = r.rowCount > 0;
                        } catch {}
                        const up = await upsertContrattoLuce(rec, clienteId, isAzienda ? 'azienda' : 'privato', createdBy || assignedUserId, !!options.dryRun);
                        if (up.action === 'inserted' || up.action === 'would_insert') {
                            activeImports[importId].result.inserted.contratti_luce++;
                        } else {
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: contratto_luce ${up.id} aggiornato (${up.action})`);
                        }
                    }
                } else if (tipo === 'contratto_gas') {
                    let clienteId = await findClientePrivatoId(rec);
                    if (!clienteId) {
                        // prova con azienda
                        clienteId = await findClienteAziendaId(rec);
                    }
                    if (!clienteId) {
                        const hasAziendaData = !!pickFirstNonEmpty(rec, [
                            'ragione_sociale', 'partita_iva', 'cliente_azienda_id', 'cliente_azienda_id_gas'
                        ]);
                        if (hasAziendaData) {
                            const upAz = await upsertClienteAzienda(rec, createdBy || assignedUserId, assignedUserId, !!options.dryRun);
                            clienteId = upAz.id;
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: cliente_azienda ${upAz.action} (${clienteId}) da contratto_gas`);
                        } else {
                            // usa upsert per evitare violazioni UNIQUE su email/codice_fiscale
                            const upPriv = await upsertClientePrivato(rec, createdBy || assignedUserId, assignedUserId, !!options.dryRun);
                            clienteId = upPriv.id;
                            if (upPriv.action === 'inserted' || upPriv.action === 'would_insert') {
                                activeImports[importId].result.inserted.clienti_privati++;
                            } else {
                                activeImports[importId].result.warnings.push(`Riga ${rowNum}: cliente_privato ${upPriv.id} aggiornato (${upPriv.action}) da contratto_gas`);
                            }
                        }
                    }
                    // Evita inserimenti con id cliente non valido che portano a FOREIGN KEY failed
                    if (!clienteId || clienteId === '0' || clienteId === 'null' || clienteId === 'undefined') {
                        throw new Error('Associazione cliente fallita: id cliente non valido per contratto_gas');
                    }
                    // Aggiorna assegnazione agente sul cliente trovato, se disponibile
                    if (assignedUserId && !options.dryRun) {
                        try {
                            let isAziendaCheck = false;
                            try {
                                const r = await pool.query('SELECT 1 FROM clienti_aziende WHERE id = $1', [clienteId]);
                                isAziendaCheck = r.rowCount > 0;
                            } catch {}
                            const table = isAziendaCheck ? 'clienti_aziende' : 'clienti_privati';
                            const upd = await pool.query(`UPDATE ${table} SET assigned_agent_id = $1 WHERE id = $2`, [assignedUserId, clienteId]);
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: update assigned_agent_id su ${table} da contratto_gas cliente_id=${clienteId}, changes=${upd.rowCount}`);
                        } catch (e) {
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: impossibile aggiornare assegnazione agente da contratto_gas (${(e as any)?.message || 'errore'})`);
                        }
                    }
                    {
                        // Fallback data_attivazione gas
                        const actGas = normalizeDate(pickFirstNonEmpty(rec, [
                            'data_attivazione', 'contratto_gas_data_inizio', 'data_inizio', 'data_stipula'
                        ]));
                        if (!actGas) {
                            rec.data_attivazione = new Date().toISOString().slice(0, 10);
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: data_attivazione gas assente → impostata a oggi`);
                        } else {
                            rec.data_attivazione = actGas;
                        }
                        let isAzienda = false;
                        try {
                            const r = await pool.query('SELECT 1 FROM clienti_aziende WHERE id = $1', [clienteId]);
                            isAzienda = r.rowCount > 0;
                        } catch {}
                        const up = await upsertContrattoGas(rec, clienteId, isAzienda ? 'azienda' : 'privato', createdBy || assignedUserId, !!options.dryRun);
                        if (up.action === 'inserted' || up.action === 'would_insert') {
                            activeImports[importId].result.inserted.contratti_gas++;
                        } else {
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: contratto_gas ${up.id} aggiornato (${up.action})`);
                        }
                    }
                } else if (tipo === 'cliente_azienda') {
                    // Upsert cliente azienda
                    const upAz = await upsertClienteAzienda(rec, createdBy || assignedUserId, assignedUserId, !!options.dryRun);
                    const aziendaId = upAz.id;
                    if (upAz.action === 'inserted' || upAz.action === 'would_insert') {
                        activeImports[importId].result.warnings.push(`Riga ${rowNum}: cliente_azienda inserito (${aziendaId})`);
                    } else {
                        activeImports[importId].result.warnings.push(`Riga ${rowNum}: cliente_azienda aggiornato (${aziendaId})`);
                    }
                    // Se nel record sono presenti dati contratto, gestisci contratti luce/gas associati all'azienda
                    // Rilevazione più rigorosa: luce SOLO se c'è un identificativo luce reale (POD o numero_contratto_luce
                    // o tipo_contratto esplicitamente 'luce'). Gas SOLO se c'è PDR o numero_contratto_gas
                    const tipoContratto = (rec.tipo_contratto || '').toLowerCase();
                    const hasLuce = !!(pickFirstNonEmpty(rec, ['pod', 'contratto_luce_pod', 'numero_contratto_luce']) || tipoContratto === 'luce');
                    const hasGas = !!(pickFirstNonEmpty(rec, ['pdr', 'contratto_gas_pdr', 'numero_contratto_gas']) || tipoContratto === 'gas');

                    if (hasLuce) {
                        const actLuce = normalizeDate(pickFirstNonEmpty(rec, [
                            'data_attivazione', 'contratto_luce_data_inizio', 'data_inizio', 'data_stipula'
                        ])) || new Date().toISOString().slice(0, 10);
                        rec.data_attivazione = actLuce;
                        const up = await upsertContrattoLuce(rec, aziendaId, 'azienda', createdBy || assignedUserId, !!options.dryRun);
                        if (up.action === 'inserted' || up.action === 'would_insert') {
                            activeImports[importId].result.inserted.contratti_luce++;
                        } else {
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: contratto_luce azienda ${up.id} aggiornato (${up.action})`);
                        }
                    }

                    if (hasGas) {
                        const actGas = normalizeDate(pickFirstNonEmpty(rec, [
                            'data_attivazione', 'contratto_gas_data_inizio', 'data_inizio', 'data_stipula'
                        ])) || new Date().toISOString().slice(0, 10);
                        rec.data_attivazione = actGas;
                        const up = await upsertContrattoGas(rec, aziendaId, 'azienda', createdBy || assignedUserId, !!options.dryRun);
                        if (up.action === 'inserted' || up.action === 'would_insert') {
                            activeImports[importId].result.inserted.contratti_gas++;
                        } else {
                            activeImports[importId].result.warnings.push(`Riga ${rowNum}: contratto_gas azienda ${up.id} aggiornato (${up.action})`);
                        }
                    }
                }

            } catch (err: any) {
                activeImports[importId].result.errors.push({ row: rowNum, error: err?.message || 'Errore generico' });
            }

            // Incrementa i processati anche se la riga ha generato errore,
            // in modo che le statistiche riflettano tutte le righe tentate
            processed++;
            if (processed % batchSize === 0) {
                activeImports[importId].progress.progress = Math.min(95, Math.floor(10 + (processed / records.length) * 85));
            }
        }

        // COMMIT or ROLLBACK
        if (!options.dryRun) {
            await pool.query('COMMIT');
        } else {
            await pool.query('ROLLBACK');
        }

        activeImports[importId].result.processed = processed;
        activeImports[importId].result.success = activeImports[importId].result.errors.length === 0;
        activeImports[importId].progress = {
            stage: 'completed',
            progress: 100,
            message: `Import completato (${processed}/${records.length})`,
            startedAt: activeImports[importId].progress.startedAt,
            completedAt: new Date().toISOString()
        };

        return res.json({
            success: true,
            data: {
                importId,
                message: 'Import avviato',
                totalRows: records.length
            }
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error?.message || 'Errore interno upload' });
    }
});

router.get('/progress/:importId', async (req, res) => {
    const { importId } = req.params;
    const state = activeImports[importId];
    if (!state) return res.status(404).json({ success: false, message: 'Import non trovato' });
    res.json({ success: true, data: state.progress });
});

router.get('/result/:importId', async (req, res) => {
    const { importId } = req.params;
    const state = activeImports[importId];
    if (!state) return res.status(404).json({ success: false, message: 'Import non trovato' });
    res.json({ success: true, data: state.result });
});

export default router;