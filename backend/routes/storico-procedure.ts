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

        // DEBUG: Log dettagliato del valore procedura_nuova
        console.log('=== DEBUG PROCEDURA_NUOVA ===');
        console.log('Valore ricevuto:', JSON.stringify(procedura_nuova));
        console.log('Tipo:', typeof procedura_nuova);
        console.log('Lunghezza:', procedura_nuova ? procedura_nuova.length : 'N/A');
        console.log('Valore trimmed:', procedura_nuova ? JSON.stringify(procedura_nuova.trim()) : 'N/A');
        console.log('Valori validi:', ['Switch', 'Voltura', 'Subentro', 'Allaccio', 'Attivazione su presa morosa', 'Disattivazione', 'Voltura mortis causa']);
        console.log('È incluso nei valori validi?', ['Switch', 'Voltura', 'Subentro', 'Allaccio', 'Attivazione su presa morosa', 'Disattivazione', 'Voltura mortis causa'].includes(procedura_nuova));
        console.log('=============================');

        if (tipoContratto !== 'luce' && tipoContratto !== 'gas') {
            return res.status(400).json({
                success: false,
                message: 'Tipo contratto non valido. Usa "luce" o "gas"'
            });
        }

        // Normalizza e valida procedura
        const allowedProcedure = ['Switch', 'Voltura', 'Subentro', 'Allaccio', 'Attivazione su presa morosa', 'Disattivazione', 'Voltura mortis causa'];
        const nuovaProceduraTrim = typeof procedura_nuova === 'string' ? procedura_nuova.trim() : '';

        // Ottieni la procedura precedente dal contratto
        const tabellaContratto = tipoContratto === 'luce' ? 'contratti_luce' : 'contratti_gas';
        const contrattoResult = await pool.query(`
            SELECT procedure 
            FROM ${tabellaContratto} 
            WHERE id = ?
        `, [contrattoId]);

        if (!contrattoResult.rows || contrattoResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contratto non trovato'
            });
        }

        const proceduraPrecedente = (contrattoResult.rows[0] as any).procedure;

        const proceduraValida = nuovaProceduraTrim && allowedProcedure.includes(nuovaProceduraTrim);
        const procedureChanged = proceduraValida && nuovaProceduraTrim !== (proceduraPrecedente || '');
        const statoChanged = !!stato_nuovo && stato_nuovo !== stato_precedente;

        // Crea il record dello storico
        const storicoId = randomUUID();
        const allegatoData = req.file ? {
            filename: req.file.filename,
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : {
            filename: null,
            path: null,
            mimetype: null,
            size: null
        };

        // Inserisci storico solo se la procedura è valida e cambiata
        if (procedureChanged) {
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
            `, [
                storicoId,
                contrattoId,
                tipoContratto,
                proceduraPrecedente,
                nuovaProceduraTrim,
                note || null,
                allegatoData.filename,
                allegatoData.path,
                allegatoData.mimetype,
                allegatoData.size,
                user.id
            ]);
        }

        // Aggiorna la procedura nel contratto
        // Aggiorna la procedura nel contratto solo se valida e cambiata
        if (procedureChanged) {
            await pool.query(`
                UPDATE ${tabellaContratto}
                SET procedure = ?
                WHERE id = ?
            `, [nuovaProceduraTrim, contrattoId]);
        }
        
        // Aggiorna anche lo stato se è stato modificato
        if (statoChanged) {
            await pool.query(`
                UPDATE ${tabellaContratto}
                SET stato = ?
                WHERE id = ?
            `, [stato_nuovo, contrattoId]);
        }

        // Recupera i dati del contratto per l'audit log
        const contrattoAggiornato = await pool.query(`
            SELECT * FROM ${tabellaContratto} WHERE id = ?
        `, [contrattoId]);
        const contratto = contrattoAggiornato.rows[0] as any;
        
        // Determina cliente_id e cliente_tipo
        const clienteId = contratto.cliente_privato_id || contratto.cliente_azienda_id;
        const clienteTipo = contratto.cliente_privato_id ? 'privato' : 'azienda';
        
        // 🔄 SINCRONIZZA STATO CLIENTE con STATO CONTRATTO
        if (stato_nuovo && stato_precedente !== stato_nuovo && clienteId && clienteTipo) {
            const tabellaCliente = clienteTipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
            
            console.log('🔄 Sincronizzazione stato cliente:');
            console.log('   - Cliente ID:', clienteId);
            console.log('   - Cliente Tipo:', clienteTipo);
            console.log('   - Nuovo Stato:', stato_nuovo);
            
            await pool.query(`
                UPDATE ${tabellaCliente}
                SET stato = ?
                WHERE id = ?
            `, [stato_nuovo, clienteId]);
            
            console.log('✅ Stato cliente aggiornato con successo');
        }

        // Registra attività procedura nell'audit log generale (solo se è cambiata)
        if (procedureChanged) {
            await pool.query(`
                INSERT INTO audit_log (
                    tipo_azione, risorsa_tipo, risorsa_id,
                    cliente_id, cliente_tipo,
                    descrizione, dati_prima, dati_dopo,
                    utente_id, utente_nome, data_azione
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
                'contratto_modificato',
                `contratto_${tipoContratto}`,
                contrattoId,
                clienteId,
                clienteTipo,
                `Procedura contratto ${tipoContratto.toUpperCase()} modificata: ${proceduraPrecedente || 'N/A'} → ${nuovaProceduraTrim}${note ? ` - ${note}` : ''}`,
                JSON.stringify({ procedure: proceduraPrecedente }),
                JSON.stringify({ procedure: nuovaProceduraTrim }),
                user.id,
                `${user.nome} ${user.cognome}`
            ]);
        }
        
        // Se lo stato è cambiato, registra anche quello
        if (statoChanged) {
            await pool.query(`
                INSERT INTO audit_log (
                    tipo_azione, risorsa_tipo, risorsa_id,
                    cliente_id, cliente_tipo,
                    descrizione, dati_prima, dati_dopo,
                    utente_id, utente_nome, data_azione
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
                'contratto_modificato',
                `contratto_${tipoContratto}`,
                contrattoId,
                clienteId,
                clienteTipo,
                `Stato contratto ${tipoContratto.toUpperCase()} modificato: ${stato_precedente} → ${stato_nuovo}${note ? ` - ${note}` : ''}`,
                JSON.stringify({ stato: stato_precedente }),
                JSON.stringify({ stato: stato_nuovo }),
                user.id,
                `${user.nome} ${user.cognome}`
            ]);
            
            // ═══════════════════════════════════════════════════════════════════════════
            // AUTOMAZIONE PAGAMENTO COMMISSIONE
            // ═══════════════════════════════════════════════════════════════════════════
            
            const statiPagamento = ['Da attivare', 'Chiusa', 'chiusa', 'Attivo']; // Stati che triggerano il pagamento
            
            console.log('🔍 Verifica condizioni automazione commissione (da scheda cliente):');
            console.log('   - Stato precedente:', stato_precedente);
            console.log('   - Stato nuovo:', stato_nuovo);
            console.log('   - Stato è cambiato?', stato_precedente !== stato_nuovo);
            console.log('   - Va a Chiusa/Da attivare?', statiPagamento.includes(stato_nuovo));
            
            // Se lo stato cambia verso Chiusa/Da attivare, gestisci commissione
            if (stato_precedente !== stato_nuovo && statiPagamento.includes(stato_nuovo)) {
                // Se sono stati forniti agente_id e commissione_pattuita, assegna al cliente
                if (agente_id && commissione_pattuita && cliente_id && cliente_tipo) {
                    const tabellaCliente = cliente_tipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
                    
                    console.log('📋 Assegnazione agente e commissione al cliente:');
                    console.log('   - Cliente ID:', cliente_id);
                    console.log('   - Cliente Tipo:', cliente_tipo);
                    console.log('   - Agente ID:', agente_id);
                    console.log('   - Commissione:', commissione_pattuita);
                    
                    await pool.query(`
                        UPDATE ${tabellaCliente} 
                        SET assigned_agent_id = ?, commissione_pattuita = ?
                        WHERE id = ?
                    `, [agente_id, commissione_pattuita, cliente_id]);
                }
                
                // Recupera dati cliente per verificare agente e commissione
                const tabellaCliente = clienteTipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
                
                try {
                    const clienteResult = await pool.query(`
                        SELECT assigned_agent_id, commissione_pattuita, commissione_pagata 
                        FROM ${tabellaCliente} 
                        WHERE id = ?
                    `, [clienteId]);
                    
                    if (clienteResult.rows && clienteResult.rows.length > 0) {
                        const cliente = clienteResult.rows[0] as any;
                        
                        console.log('   - Agente assegnato:', cliente.assigned_agent_id);
                        console.log('   - Commissione pattuita:', cliente.commissione_pattuita);
                        console.log('   - Commissione già pagata?', cliente.commissione_pagata);
                        
                        if (cliente.assigned_agent_id && cliente.commissione_pattuita) {
                            console.log('✅ Condizioni soddisfatte - Creazione compenso automatico');
                            
                            // Verifica se esiste già un compenso per questo contratto specifico
                            const compensoEsistente = await pool.query(`
                                SELECT id FROM compensi 
                                WHERE contratto_id = ? AND contratto_tipo = ? AND agente_id = ?
                            `, [contrattoId, tipoContratto, cliente.assigned_agent_id]);
                            
                            if (compensoEsistente.rows.length === 0) {
                                // Crea compenso per l'agente
                                const compensoId = randomUUID();
                                await pool.query(`
                                    INSERT INTO compensi (
                                        id, 
                                        agente_id, 
                                        cliente_id, 
                                        cliente_tipo,
                                        contratto_id,
                                        contratto_tipo,
                                        importo, 
                                        tipo,
                                        descrizione,
                                        stato,
                                        data_maturazione,
                                        created_at
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                                `, [
                                    compensoId,
                                    cliente.assigned_agent_id,
                                    clienteId,
                                    clienteTipo,
                                    contrattoId,
                                    tipoContratto,
                                    cliente.commissione_pattuita,
                                    'commissione_contratto',
                                    `Commissione per contratto ${tipoContratto.toUpperCase()} - Cambio stato da ${stato_precedente} a ${stato_nuovo}`,
                                    'maturato',
                                    new Date().toISOString()
                                ]);
                                
                                // Log audit per compenso creato
                                await pool.query(`
                                    INSERT INTO audit_log (
                                        tipo_azione, risorsa_tipo, risorsa_id,
                                        cliente_id, cliente_tipo,
                                        descrizione,
                                        utente_id, utente_nome, data_azione
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                                `, [
                                    'compenso_creato',
                                    'compenso',
                                    compensoId,
                                    clienteId,
                                    clienteTipo,
                                    `Compenso automatico creato per contratto ${tipoContratto.toUpperCase()} - Importo: €${cliente.commissione_pattuita}`,
                                    user.id,
                                    `${user.nome} ${user.cognome}`
                                ]);
                                
                                console.log('💰 Compenso creato con successo:', compensoId);
                            } else {
                                console.log(`ℹ️ Compenso ${tipoContratto.toUpperCase()} già esistente per contratto ${contrattoId}`);
                            }
                    } else {
                        console.log('⏭️ Condizioni non soddisfatte - Nessun compenso creato');
                    }
                } else {
                    console.log('⚠️ Cliente non trovato nella tabella:', tabellaCliente);
                }
                } catch (clienteError: any) {
                    console.log('⚠️ Tabella clienti non disponibile:', tabellaCliente);
                    console.log('   Errore:', clienteError.message);
                    console.log('   Automazione commissione saltata - continuando con il salvataggio della procedura');
                }
            }
        }

        // Recupera il record appena creato con i dati dell'utente
        if (procedureChanged) {
            const nuovoRecordResult = await pool.query(`
                SELECT 
                    sp.*,
                    u.nome as modificato_da_nome,
                    u.cognome as modificato_da_cognome,
                    u.email as modificato_da_email
                FROM storico_procedure sp
                LEFT JOIN users u ON sp.created_by = u.id
                WHERE sp.id = ?
            `, [storicoId]);

            return res.status(201).json({
                success: true,
                message: 'Procedura aggiornata con successo',
                data: nuovoRecordResult.rows[0]
            });
        }

        // Se non c'è cambio procedura ma solo stato (o nulla), rispondi comunque OK
        return res.status(200).json({
            success: true,
            message: statoChanged ? 'Stato aggiornato con successo' : 'Nessuna modifica di procedura; nessun record storico creato',
            data: null
        });
    } catch (error) {
        // Rimuovi il file se c'è stato un errore
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Errore rimozione file:', unlinkError);
            }
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

