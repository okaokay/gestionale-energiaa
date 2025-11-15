import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configurazione multer per upload PDF
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = 'uploads/procedure-allegati';
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error as Error, uploadDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${randomUUID()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|jpg|jpeg|png)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Solo PDF e immagini sono permessi'));
        }
    }
});

/**
 * GET /api/storico-procedure/:tipoContratto/:contrattoId
 * Ottiene lo storico delle procedure per un contratto
 */
router.get('/:tipoContratto/:contrattoId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipoContratto, contrattoId } = req.params;

        if (tipoContratto !== 'luce' && tipoContratto !== 'gas') {
            return res.status(400).json({
                success: false,
                message: 'Tipo contratto non valido. Usa "luce" o "gas"'
            });
        }

        const columnId = tipoContratto === 'luce' ? 'contratto_luce_id' : 'contratto_gas_id';

        const result = await pool.query(`
            SELECT 
                sp.*,
                u.nome as modificato_da_nome,
                u.cognome as modificato_da_cognome,
                u.email as modificato_da_email
            FROM storico_procedure sp
            LEFT JOIN users u ON sp.created_by = u.id
            WHERE sp.${columnId} = ?
            ORDER BY sp.created_at DESC
        `, [contrattoId]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/storico-procedure/:tipoContratto/:contrattoId
 * Aggiunge una modifica allo storico procedure
 * Con possibilità di allegare un PDF
 */
router.post('/:tipoContratto/:contrattoId', authenticate, upload.single('allegato'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipoContratto, contrattoId } = req.params;
        const { procedura_nuova, stato_precedente, stato_nuovo, note, agente_id, commissione_pattuita, cliente_id, cliente_tipo } = req.body;
        const user = (req as any).user;

        if (tipoContratto !== 'luce' && tipoContratto !== 'gas') {
            return res.status(400).json({ success: false, message: 'Tipo contratto non valido. Usa "luce" o "gas"' });
        }

        const allowedProcedure = ['Switch', 'Voltura', 'Subentro', 'Allaccio', 'Attivazione su presa morosa', 'Disattivazione', 'Voltura mortis causa'];
        const nuovaProceduraTrim = typeof procedura_nuova === 'string' ? procedura_nuova.trim() : '';

        const tabellaContratto = tipoContratto === 'luce' ? 'contratti_luce' : 'contratti_gas';
        const contrattoResult = await pool.query(`SELECT procedure FROM ${tabellaContratto} WHERE id = ?`, [contrattoId]);
        const contractFound = !!(contrattoResult.rows && contrattoResult.rows.length > 0);
        const proceduraPrecedente = contractFound ? (contrattoResult.rows[0] as any).procedure : null;

        const proceduraValida = nuovaProceduraTrim && allowedProcedure.includes(nuovaProceduraTrim);
        const procedureChanged = !!(proceduraValida && nuovaProceduraTrim !== (proceduraPrecedente || ''));
        const statoChanged = !!(stato_nuovo && stato_nuovo !== stato_precedente);

        const storicoId = randomUUID();
        const allegatoData = req.file ? { filename: req.file.filename, path: req.file.path, mimetype: req.file.mimetype, size: req.file.size } : { filename: null, path: null, mimetype: null, size: null };

        let storicoInserito = false;
        let createdById = user?.id || user?.userId;
        if (createdById) {
            const chk = await pool.query('SELECT id FROM users WHERE id = ?', [createdById]);
            if (!chk.rows || chk.rows.length === 0) {
                const fallback = await pool.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
                if (fallback.rows && fallback.rows.length > 0) {
                    createdById = (fallback.rows[0] as any).id;
                }
            }
        }

        // Compatibilità con seed DB: FK di storico_procedure può puntare a contratti_*_old
        // Se necessario, replica il contratto corrente nella tabella *_old per evitare violazioni FK
        let contrattoIdForInsert: any = contrattoId;
        let fkRequiresOld = false;
        try {
            const fkList = await pool.query("PRAGMA foreign_key_list('storico_procedure')");
            const fk = (fkList.rows || []).map(r => r as any);
            const fkTarget = tipoContratto === 'luce'
                ? fk.find(x => x.from === 'contratto_luce_id')
                : fk.find(x => x.from === 'contratto_gas_id');
            if (fkTarget && typeof fkTarget.table === 'string' && fkTarget.table.endsWith('_old')) {
                fkRequiresOld = true;
                const oldTable = fkTarget.table; // contratti_luce_old o contratti_gas_old
                const existsOldBefore = await pool.query(`SELECT id FROM ${oldTable} WHERE id = ?`, [contrattoId]);
                if (!existsOldBefore.rows || existsOldBefore.rows.length === 0) {
                    if (contractFound) {
                        const src = await pool.query(`SELECT * FROM ${tabellaContratto} WHERE id = ?`, [contrattoId]);
                        if (src.rows && src.rows.length > 0) {
                            const s = src.rows[0] as any;
                            if (tipoContratto === 'luce') {
                                await pool.query(
                                    `INSERT INTO contratti_luce_old (
                                        id, cliente_privato_id, cliente_azienda_id, tipo_cliente,
                                        numero_contratto, pod, fornitore,
                                        data_attivazione, data_scadenza, prezzo_energia,
                                        stato, created_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'attivo'), datetime('now'))`,
                                    [
                                        s.id,
                                        s.cliente_privato_id || null,
                                        s.cliente_azienda_id || null,
                                        s.tipo_cliente || (s.cliente_privato_id ? 'privato' : 'azienda'),
                                        s.numero_contratto || null,
                                        s.pod || null,
                                        s.fornitore || null,
                                        s.data_attivazione || s.data_inizio || null,
                                        s.data_scadenza || s.data_fine || null,
                                        s.prezzo_energia || null,
                                        s.stato || null
                                    ]
                                );
                            } else {
                                await pool.query(
                                    `INSERT INTO contratti_gas_old (
                                        id, cliente_privato_id, cliente_azienda_id, tipo_cliente,
                                        numero_contratto, pdr, fornitore,
                                        data_attivazione, data_scadenza, prezzo_gas,
                                        stato, created_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'attivo'), datetime('now'))`,
                                    [
                                        s.id,
                                        s.cliente_privato_id || null,
                                        s.cliente_azienda_id || null,
                                        s.tipo_cliente || (s.cliente_privato_id ? 'privato' : 'azienda'),
                                        s.numero_contratto || null,
                                        s.pdr || null,
                                        s.fornitore || null,
                                        s.data_attivazione || s.data_inizio || null,
                                        s.data_scadenza || s.data_fine || null,
                                        s.prezzo_gas || s.prezzo_energia || null,
                                        s.stato || null
                                    ]
                                );
                            }
                        } else {
                            contrattoIdForInsert = null;
                        }
                    } else {
                        contrattoIdForInsert = null;
                    }
                    const existsOldAfter = await pool.query(`SELECT id FROM ${oldTable} WHERE id = ?`, [contrattoId]);
                    if (!existsOldAfter.rows || existsOldAfter.rows.length === 0) {
                        contrattoIdForInsert = null;
                    }
                }
            }
        } catch {
            if (fkRequiresOld) {
                contrattoIdForInsert = null;
            }
        }
        if (procedureChanged && contractFound) {
            await pool.query(`
                INSERT INTO storico_procedure (
                    id,
                    ${tipoContratto === 'luce' ? 'contratto_luce_id' : 'contratto_gas_id'},
                    tipo_contratto,
                    procedura_precedente,
                    procedura_nuova,
                    note,
                    allegato_filename,
                    allegato_path,
                    allegato_mimetype,
                    allegato_size,
                    created_by,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [storicoId, contrattoIdForInsert, tipoContratto, proceduraPrecedente, nuovaProceduraTrim, note || null, allegatoData.filename, allegatoData.path, allegatoData.mimetype, allegatoData.size, createdById]);
            storicoInserito = true;
        }

        if (procedureChanged && contractFound) {
            await pool.query(`UPDATE ${tabellaContratto} SET procedure = ? WHERE id = ?`, [nuovaProceduraTrim, contrattoId]);
        }

        if (statoChanged && contractFound) {
            await pool.query(`UPDATE ${tabellaContratto} SET stato = ? WHERE id = ?`, [stato_nuovo, contrattoId]);
        }

        let clienteId: any = null;
        let clienteTipo: any = null;
        if (contractFound) {
            const contr = await pool.query(`SELECT * FROM ${tabellaContratto} WHERE id = ?`, [contrattoId]);
            const c = contr.rows[0] as any;
            clienteId = c.cliente_privato_id || c.cliente_azienda_id;
            clienteTipo = c.cliente_privato_id ? 'privato' : 'azienda';
        } else {
            clienteId = cliente_id || null;
            clienteTipo = cliente_tipo || null;
        }

        if (statoChanged && clienteId && clienteTipo) {
            const tabellaCliente = clienteTipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
            await pool.query(`UPDATE ${tabellaCliente} SET stato = ? WHERE id = ?`, [stato_nuovo, clienteId]);
        }

        if (procedureChanged) {
            await pool.query(`
                INSERT INTO audit_log (
                    tipo_azione, risorsa_tipo, risorsa_id,
                    cliente_id, cliente_tipo,
                    descrizione, dati_prima, dati_dopo,
                    utente_id, utente_nome, data_azione
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, ['contratto_modificato', `contratto_${tipoContratto}`, contrattoId, clienteId, clienteTipo, `Procedura contratto ${tipoContratto.toUpperCase()} modificata: ${proceduraPrecedente || 'N/A'} → ${nuovaProceduraTrim}${note ? ` - ${note}` : ''}`, JSON.stringify({ procedure: proceduraPrecedente }), JSON.stringify({ procedure: nuovaProceduraTrim }), user.id, `${user.nome} ${user.cognome}`]);
        }

        if (statoChanged) {
            await pool.query(`
                INSERT INTO audit_log (
                    tipo_azione, risorsa_tipo, risorsa_id,
                    cliente_id, cliente_tipo,
                    descrizione, dati_prima, dati_dopo,
                    utente_id, utente_nome, data_azione
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, ['contratto_modificato', `contratto_${tipoContratto}`, contrattoId, clienteId, clienteTipo, `Stato contratto ${tipoContratto.toUpperCase()} modificato: ${stato_precedente} → ${stato_nuovo}${note ? ` - ${note}` : ''}`, JSON.stringify({ stato: stato_precedente }), JSON.stringify({ stato: stato_nuovo }), user.id, `${user.nome} ${user.cognome}`]);

            const statiPagamento = ['Da attivare', 'Chiusa', 'chiusa', 'Attivo'];
            if (stato_precedente !== stato_nuovo && statiPagamento.includes(stato_nuovo)) {
                if (agente_id && commissione_pattuita && cliente_id && cliente_tipo) {
                    const tc = cliente_tipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
                    await pool.query(`UPDATE ${tc} SET assigned_agent_id = ?, commissione_pattuita = ? WHERE id = ?`, [agente_id, commissione_pattuita, cliente_id]);
                }

                if (clienteId && clienteTipo) {
                    const tc2 = clienteTipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
                    const cr = await pool.query(`SELECT assigned_agent_id, commissione_pattuita, commissione_pagata, commissione_luce, commissione_gas FROM ${tc2} WHERE id = ?`, [clienteId]);
                    if (cr.rows && cr.rows.length > 0) {
                        const cl = cr.rows[0] as any;
                        const triggerAttivo = ['Attivo', 'attivo', 'attiva', 'ATTIVA'].includes(stato_nuovo || '');
                        const commissioneImporto = tipoContratto === 'luce' ? (cl as any).commissione_luce ?? cl.commissione_pattuita : tipoContratto === 'gas' ? (cl as any).commissione_gas ?? cl.commissione_pattuita : cl.commissione_pattuita;
                        if (cl.assigned_agent_id && commissioneImporto && triggerAttivo) {
                            const ex = await pool.query(`SELECT id FROM compensi WHERE contratto_id = ? AND contratto_tipo = ? AND agente_id = ?`, [contrattoId, tipoContratto, cl.assigned_agent_id]);
                            if (ex.rows.length === 0) {
                                const compId = randomUUID();
                                await pool.query(`INSERT INTO compensi (id, agente_id, cliente_id, cliente_tipo, contratto_id, contratto_tipo, importo, tipo, descrizione, stato, data_maturazione, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`, [compId, cl.assigned_agent_id, clienteId, clienteTipo, contrattoId, tipoContratto, commissioneImporto, 'commissione_contratto', `Commissione per contratto ${tipoContratto.toUpperCase()} - Cambio stato da ${stato_precedente} a ${stato_nuovo}`, 'maturato', new Date().toISOString()]);
                                await pool.query(`INSERT INTO audit_log (tipo_azione, risorsa_tipo, risorsa_id, cliente_id, cliente_tipo, descrizione, utente_id, utente_nome, data_azione) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`, ['compenso_creato', 'compenso', compId, clienteId, clienteTipo, `Compenso automatico creato per contratto ${tipoContratto.toUpperCase()} - Importo: €${commissioneImporto}`, user.id, `${user.nome} ${user.cognome}`]);
                            }
                        }
                    }
                }
            }
        }

        if (procedureChanged && storicoInserito) {
            const nuovoRecordResult = await pool.query(`SELECT sp.*, u.nome as modificato_da_nome, u.cognome as modificato_da_cognome, u.email as modificato_da_email FROM storico_procedure sp LEFT JOIN users u ON sp.created_by = u.id WHERE sp.id = ?`, [storicoId]);
            return res.status(201).json({ success: true, message: 'Procedura aggiornata con successo', data: nuovoRecordResult.rows[0] });
        }

        return res.status(200).json({ success: true, message: statoChanged ? 'Stato aggiornato con successo' : 'Nessuna modifica di procedura; nessun record storico creato', data: null });
    } catch (error) {
        if (req.file) {
            try { await fs.unlink(req.file.path); } catch {}
        }
        next(error);
    }
});

/**
 * GET /api/storico-procedure/allegato/:storicoId
 * Download allegato PDF
 */
router.get('/allegato/:storicoId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { storicoId } = req.params;

        const recordResult = await pool.query(`
            SELECT allegato_filename, allegato_path, allegato_mimetype
            FROM storico_procedure
            WHERE id = ?
        `, [storicoId]);

        const record = recordResult.rows[0] as any;
        
        if (!recordResult.rows || recordResult.rows.length === 0 || !record.allegato_path) {
            return res.status(404).json({
                success: false,
                message: 'Allegato non trovato'
            });
        }

        const filePath = record.allegato_path;
        const fileName = record.allegato_filename;
        const mimeType = record.allegato_mimetype;

        // Verifica che il file esista
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                success: false,
                message: 'File non trovato sul server'
            });
        }

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.sendFile(path.resolve(filePath));
    } catch (error) {
        next(error);
    }
});

export default router;

