/**
 * Route per gestione contratti luce e gas
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validateContrattoLuce, validateContrattoGas, validateFlexibleId } from '../middleware/validators';

const router = Router();
router.use(authenticate);

/**
 * GET /api/contratti/luce
 * Lista contratti luce
 */
router.get('/luce', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stato = req.query.stato as string;
        const limit = parseInt(req.query.limit as string) || 50;
        
        let query = `
            SELECT cl.*, 
                   cp.nome as cliente_nome, cp.cognome as cliente_cognome, cp.email_principale as cliente_email,
                   ca.ragione_sociale as azienda_nome, ca.email_referente as azienda_email,
                   CAST((julianday(cl.data_fine) - julianday('now')) AS INTEGER) as giorni_a_scadenza
            FROM contratti_luce cl
            LEFT JOIN clienti_privati cp ON cl.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON cl.cliente_azienda_id = ca.id
        `;
        
        const params: any[] = [];
        if (stato) {
            query += ' WHERE cl.stato = $1';
            params.push(stato);
        }
        
        query += ' ORDER BY cl.data_fine ASC LIMIT $' + (params.length + 1);
        params.push(limit);
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/contratti/gas
 * Lista contratti gas
 */
router.get('/gas', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stato = req.query.stato as string;
        const limit = parseInt(req.query.limit as string) || 50;
        
        let query = `
            SELECT cg.*, 
                   cp.nome as cliente_nome, cp.cognome as cliente_cognome, cp.email_principale as cliente_email,
                   ca.ragione_sociale as azienda_nome, ca.email_referente as azienda_email,
                   cg.data_scadenza - CURRENT_DATE as giorni_a_scadenza
            FROM contratti_gas cg
            LEFT JOIN clienti_privati cp ON cg.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON cg.cliente_azienda_id = ca.id
        `;
        
        const params: any[] = [];
        if (stato) {
            query += ' WHERE cg.stato = $1';
            params.push(stato);
        }
        
        query += ' ORDER BY cg.data_scadenza ASC LIMIT $' + (params.length + 1);
        params.push(limit);
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/contratti/scadenze
 * Contratti in scadenza
 */
/**
 * GET /api/contratti/cliente/:tipo/:id
 * Tutti i contratti di un cliente specifico
 */
router.get('/cliente/:tipo/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipo, id } = req.params;
        
        // Determina la colonna ID corretta
        const clienteIdColumn = tipo === 'privato' ? 'cliente_privato_id' : 'cliente_azienda_id';
        
        // Contratti luce
        const contrattiLuce = await pool.query(`
            SELECT 
                cl.*,
                'luce' as tipo_contratto
            FROM contratti_luce cl
            WHERE cl.${clienteIdColumn} = $1
            ORDER BY cl.data_fine DESC
        `, [id]);
        
        // Contratti gas
        const contrattiGas = await pool.query(`
            SELECT 
                cg.*,
                'gas' as tipo_contratto
            FROM contratti_gas cg
            WHERE cg.${clienteIdColumn} = $1
            ORDER BY cg.data_fine DESC
        `, [id]);
        
        const contrattiLuceArray = (contrattiLuce.rows || []).map((c: any) => ({ ...c, tipo_contratto: 'luce' }));
        const contrattiGasArray = (contrattiGas.rows || []).map((c: any) => ({ ...c, tipo_contratto: 'gas' }));
        
        const contratti = [...contrattiLuceArray, ...contrattiGasArray]
            .sort((a: any, b: any) => new Date(b.data_fine).getTime() - new Date(a.data_fine).getTime());
        
        res.json({
            success: true,
            data: contratti
        });
    } catch (error) {
        next(error);
    }
});

router.get('/scadenze', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const giorni = parseInt(req.query.giorni as string) || 60;
        
        // Query diretta per contratti luce in scadenza
        const scadenzeLuce = await pool.query(`
            SELECT 
                cl.*,
                'luce' as tipo_contratto,
                'luce' as tipo_energia,
                cp.nome || ' ' || cp.cognome as cliente_nome,
                cp.email_principale as cliente_email,
                ca.ragione_sociale as azienda_nome,
                ca.email_referente as azienda_email,
                CAST((julianday(cl.data_fine) - julianday('now')) AS INTEGER) as giorni_a_scadenza
            FROM contratti_luce cl
            LEFT JOIN clienti_privati cp ON cl.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON cl.cliente_azienda_id = ca.id
            WHERE cl.stato = 'attivo' 
            AND julianday(cl.data_fine) - julianday('now') <= $1
        `, [giorni]);
        
        // Query diretta per contratti gas in scadenza
        const scadenzeGas = await pool.query(`
            SELECT 
                cg.*,
                'gas' as tipo_contratto,
                'gas' as tipo_energia,
                cp.nome || ' ' || cp.cognome as cliente_nome,
                cp.email_principale as cliente_email,
                ca.ragione_sociale as azienda_nome,
                ca.email_referente as azienda_email,
                CAST((julianday(cg.data_fine) - julianday('now')) AS INTEGER) as giorni_a_scadenza
            FROM contratti_gas cg
            LEFT JOIN clienti_privati cp ON cg.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON cg.cliente_azienda_id = ca.id
            WHERE cg.stato = 'attivo' 
            AND julianday(cg.data_fine) - julianday('now') <= $1
        `, [giorni]);
        
        // Combina e ordina
        const tutteScadenze = [...scadenzeLuce.rows, ...scadenzeGas.rows]
            .sort((a: any, b: any) => a.giorni_a_scadenza - b.giorni_a_scadenza);
        
        res.json({
            success: true,
            data: tutteScadenze
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/contratti/luce
 * Crea contratto luce
 */
router.post('/luce', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            cliente_privato_id, cliente_azienda_id, tipo_cliente, numero_contratto, pod, fornitore,
            data_attivazione, data_scadenza, prezzo_energia, note, data_stipula, agente, nome_offerta,
            validita_offerta, commodity, procedure, pdp, tipo_offerta, stato
        } = req.body;

        const { randomUUID } = require('crypto');
        const contrattoId = randomUUID();

        await pool.query(`
            INSERT INTO contratti_luce (
                id, cliente_privato_id, cliente_azienda_id, tipo_cliente, numero_contratto, pod, fornitore,
                data_inizio, data_fine, prezzo_energia, note, data_stipula, agente, nome_offerta,
                validita_offerta, commodity, procedure, pdp, tipo_offerta, stato, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            contrattoId, cliente_privato_id || null, cliente_azienda_id || null, tipo_cliente, numero_contratto, pod,
            fornitore, data_attivazione, data_scadenza, prezzo_energia || null, note || null, data_stipula || null,
            agente || null, nome_offerta || null, validita_offerta || null, commodity || null, procedure || null,
            pdp || null, tipo_offerta || null, stato || 'In compilazione', req.user!.userId
        ]);
        
        const result = await pool.query(`SELECT * FROM contratti_luce WHERE id = ?`, [contrattoId]);
        
        res.status(201).json({
            success: true,
            message: 'Contratto luce creato con successo',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/contratti/gas
 * Crea contratto gas
 */
router.post('/gas', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            cliente_privato_id, cliente_azienda_id, tipo_cliente, numero_contratto, pdr, fornitore,
            data_attivazione, data_scadenza, prezzo_gas, note, data_stipula, agente, nome_offerta,
            validita_offerta, commodity, procedure, pdp, tipo_offerta, stato
        } = req.body;
        
        const { randomUUID } = require('crypto');
        const contrattoId = randomUUID();
        
        await pool.query(`
            INSERT INTO contratti_gas (
                id, cliente_privato_id, cliente_azienda_id, tipo_cliente, numero_contratto, pdr, fornitore,
                data_inizio, data_fine, prezzo_gas, note, data_stipula, agente, nome_offerta,
                validita_offerta, commodity, procedure, pdp, tipo_offerta, stato, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            contrattoId, cliente_privato_id || null, cliente_azienda_id || null, tipo_cliente, numero_contratto, pdr,
            fornitore, data_attivazione, data_scadenza, prezzo_gas || null, note || null, data_stipula || null,
            agente || null, nome_offerta || null, validita_offerta || null, commodity || null, procedure || null,
            pdp || null, tipo_offerta || null, stato || 'In compilazione', req.user!.userId
        ]);
        
        const result = await pool.query(`SELECT * FROM contratti_gas WHERE id = ?`, [contrattoId]);
        
        res.status(201).json({
            success: true,
            message: 'Contratto gas creato con successo',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/contratti/luce/:id
 * Aggiorna contratto luce
 */
router.put('/luce/:id', authorize('operatore', 'admin', 'super_admin'), validateFlexibleId('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updates: string[] = [];
        const values: any[] = [];
        
        const updatableFields = [
            'fornitore', 'data_fine', 'potenza_impegnata', 'consumo_annuo_reale',
            'prezzo_energia', 'costo_fisso_mensile', 'stato', 'note', 'procedure', 
            'commodity', 'pdp', 'data_stipula', 'data_inizio', 'agente',
            'nome_offerta', 'tipo_offerta', 'validita_offerta', 'utente_acquisizione'
        ];
        
        for (const field of updatableFields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Nessun campo da aggiornare' });
        }
        
        values.push(req.params.id);
        
        const result = await pool.query(`
            UPDATE contratti_luce 
            SET ${updates.join(', ')}
            WHERE id = ?
        `, values);
        
        // Recupera il contratto aggiornato
        const updated = await pool.query(`SELECT * FROM contratti_luce WHERE id = ?`, [req.params.id]);
        
        if (!updated.rows || updated.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Contratto non trovato' });
        }
        
        // 🔄 Se è stato modificato lo stato, sincronizza con lo stato del cliente
        if (req.body.stato !== undefined) {
            const contratto = updated.rows[0] as any;
            const clienteId = contratto.cliente_privato_id || contratto.cliente_azienda_id;
            const clienteTipo = contratto.cliente_privato_id ? 'privato' : 'azienda';
            
            if (clienteId && clienteTipo) {
                const tabellaCliente = clienteTipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
                
                // Prima recupera i dati del cliente per la logica di pagamento
                const clienteResult = await pool.query(`SELECT * FROM ${tabellaCliente} WHERE id = ?`, [clienteId]);
                const cliente = clienteResult.rows[0] as any;
                
                // Aggiorna lo stato del cliente
                await pool.query(`
                    UPDATE ${tabellaCliente}
                    SET stato = ?
                    WHERE id = ?
                `, [req.body.stato, clienteId]);
                
                console.log(`🔄 Stato cliente ${clienteId} sincronizzato con contratto luce: ${req.body.stato}`);
                
                // ═══════════════════════════════════════════════════════════════════════════
                // AUTOMAZIONE PAGAMENTO COMMISSIONE
                // ═══════════════════════════════════════════════════════════════════════════
                
                const statiPagamento = ['Da attivare', 'Chiusa', 'chiusa', 'Attivo']; // Stati che triggerano il pagamento
                
                console.log('🔍 Verifica condizioni automazione commissione (da contratto LUCE):');
                console.log('   - Stato nuovo:', req.body.stato);
                console.log('   - Stati che triggerano pagamento:', statiPagamento);
                console.log('   - Stato è valido?', statiPagamento.includes(req.body.stato));
                console.log('   - Commissione già pagata?', cliente?.commissione_pagata);
                console.log('   - Commissione LUCE:', cliente?.commissione_luce);
                console.log('   - Agente assegnato:', cliente?.assigned_agent_id);
                
                if (cliente && statiPagamento.includes(req.body.stato) && 
                    cliente.commissione_luce && 
                    cliente.assigned_agent_id) {
                    
                    // Verifica se esiste già un compenso per questo contratto specifico
                    const compensoEsistente = await pool.query(`
                        SELECT id FROM compensi 
                        WHERE contratto_id = ? AND contratto_tipo = 'luce' AND agente_id = ?
                    `, [req.params.id, cliente.assigned_agent_id]);
                    
                    if (compensoEsistente.rows.length === 0) {
                        console.log(`💰 Automazione commissione LUCE: Cliente ${clienteId} - Stato "${req.body.stato}" - Commissione: €${cliente.commissione_luce}`);
                        
                        // Crea compenso nella tabella compensi (logica corretta)
                        const { randomUUID } = require('crypto');
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
                            req.params.id, // ID del contratto
                            'luce', // Tipo contratto
                            cliente.commissione_luce,
                            'commissione_contratto',
                            `Commissione per contratto luce - Cambio stato a ${req.body.stato}`,
                            'maturato',
                            new Date().toISOString()
                        ]);

                        console.log(`✅ Commissione automatica LUCE creata per cliente ${clienteId}: €${cliente.commissione_luce}`);
                    } else {
                        console.log(`ℹ️ Compenso LUCE già esistente per contratto ${req.params.id}`);
                    }
                }
            }
        }
        
        res.json({
            success: true,
            message: 'Contratto aggiornato con successo',
            data: updated.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/contratti/gas/:id
 * Aggiorna un contratto gas
 */
router.put('/gas/:id', authorize('operatore', 'admin', 'super_admin'), validateFlexibleId('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updates: string[] = [];
        const values: any[] = [];
        
        const updatableFields = [
            'fornitore', 'data_fine', 'consumo_annuo_gas', 'classe_contatore',
            'prezzo_gas', 'costo_fisso_mensile', 'stato', 'note', 'procedure', 
            'commodity', 'pdp', 'data_stipula', 'data_inizio', 'agente',
            'nome_offerta', 'tipo_offerta', 'validita_offerta', 'utente_acquisizione'
        ];
        
        for (const field of updatableFields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Nessun campo da aggiornare' });
        }
        
        values.push(req.params.id);
        
        await pool.query(`
            UPDATE contratti_gas 
            SET ${updates.join(', ')}
            WHERE id = ?
        `, values);
        
        // Recupera il contratto aggiornato
        const updated = await pool.query(`SELECT * FROM contratti_gas WHERE id = ?`, [req.params.id]);
        
        if (!updated.rows || updated.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Contratto non trovato' });
        }
        
        // 🔄 Se è stato modificato lo stato, sincronizza con lo stato del cliente
        if (req.body.stato !== undefined) {
            const contratto = updated.rows[0] as any;
            const clienteId = contratto.cliente_privato_id || contratto.cliente_azienda_id;
            const clienteTipo = contratto.cliente_privato_id ? 'privato' : 'azienda';
            
            if (clienteId && clienteTipo) {
                const tabellaCliente = clienteTipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
                
                // Prima recupera i dati del cliente per la logica di pagamento
                const clienteResult = await pool.query(`SELECT * FROM ${tabellaCliente} WHERE id = ?`, [clienteId]);
                const cliente = clienteResult.rows[0] as any;
                
                // Aggiorna lo stato del cliente
                await pool.query(`
                    UPDATE ${tabellaCliente}
                    SET stato = ?
                    WHERE id = ?
                `, [req.body.stato, clienteId]);
                
                console.log(`🔄 Stato cliente ${clienteId} sincronizzato con contratto gas: ${req.body.stato}`);
                
                // ═══════════════════════════════════════════════════════════════════════════
                // AUTOMAZIONE PAGAMENTO COMMISSIONE
                // ═══════════════════════════════════════════════════════════════════════════
                
                const statiPagamento = ['Da attivare', 'Chiusa', 'chiusa', 'Attivo']; // Stati che triggerano il pagamento
                
                console.log('🔍 Verifica condizioni automazione commissione (da contratto GAS):');
                console.log('   - Stato nuovo:', req.body.stato);
                console.log('   - Stati che triggerano pagamento:', statiPagamento);
                console.log('   - Stato è valido?', statiPagamento.includes(req.body.stato));
                console.log('   - Commissione già pagata?', cliente?.commissione_pagata);
                console.log('   - Commissione GAS:', cliente?.commissione_gas);
                console.log('   - Agente assegnato:', cliente?.assigned_agent_id);
                
                if (cliente && statiPagamento.includes(req.body.stato) && 
                    cliente.commissione_gas && 
                    cliente.assigned_agent_id) {
                    
                    // Verifica se esiste già un compenso per questo contratto specifico
                    const compensoEsistente = await pool.query(`
                        SELECT id FROM compensi 
                        WHERE contratto_id = ? AND contratto_tipo = 'gas' AND agente_id = ?
                    `, [req.params.id, cliente.assigned_agent_id]);
                    
                    if (compensoEsistente.rows.length === 0) {
                        console.log(`💰 Automazione commissione GAS: Cliente ${clienteId} - Stato "${req.body.stato}" - Commissione: €${cliente.commissione_gas}`);
                        
                        // Crea compenso nella tabella compensi (logica corretta)
                        const { randomUUID } = require('crypto');
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
                            req.params.id, // ID del contratto
                            'gas', // Tipo contratto
                            cliente.commissione_gas,
                            'commissione_contratto',
                            `Commissione per contratto gas - Cambio stato a ${req.body.stato}`,
                            'maturato',
                            new Date().toISOString()
                        ]);

                        console.log(`✅ Commissione automatica GAS creata per cliente ${clienteId}: €${cliente.commissione_gas}`);
                    } else {
                        console.log(`ℹ️ Compenso GAS già esistente per contratto ${req.params.id}`);
                    }
                }
            }
        }
        
        res.json({
            success: true,
            message: 'Contratto aggiornato con successo',
            data: updated.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/contratti/:tipo/:id/send-scadenza-email
 * Invia email manuale di scadenza
 */
router.post('/:tipo/:id/send-scadenza-email', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipo, id } = req.params;
        const { template = 'default', customMessage } = req.body;
        
        if (tipo !== 'luce' && tipo !== 'gas') {
            return res.status(400).json({ success: false, message: 'Tipo contratto non valido' });
        }
        
        // Query per recuperare i dati del contratto
        const table = tipo === 'luce' ? 'contratti_luce' : 'contratti_gas';
        const podField = tipo === 'luce' ? 'pod' : 'pdr';
        
        const contrattoQuery = await pool.query(`
            SELECT 
                c.*,
                cp.nome || ' ' || cp.cognome as cliente_nome,
                cp.email_principale as cliente_email,
                ca.ragione_sociale as azienda_nome,
                ca.email_referente as azienda_email,
                CAST((julianday(c.data_fine) - julianday('now')) AS INTEGER) as giorni_a_scadenza
            FROM ${table} c
            LEFT JOIN clienti_privati cp ON c.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON c.cliente_azienda_id = ca.id
            WHERE c.id = ?
        `, [id]);
        
        if (contrattoQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Contratto non trovato' });
        }
        
        const contratto = contrattoQuery.rows[0] as any;
        const emailDestinatario = contratto.cliente_email || contratto.azienda_email;
        
        if (!emailDestinatario) {
            return res.status(400).json({ success: false, message: 'Cliente senza email' });
        }
        
        // Importa emailService dinamicamente per evitare dipendenze circolari
        const { sendEmail } = await import('../services/emailService');
        
        // Prepara il corpo dell'email
        const nomeCliente = contratto.cliente_nome || contratto.azienda_nome;
        const subject = `⏰ Il tuo contratto ${tipo.toUpperCase()} scade tra ${contratto.giorni_a_scadenza} giorni`;
        
        // Dettagli contratto per tutti i template
        const dettagliContratto = `
            <div style="background-color: #fff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Dettagli Contratto</h3>
                <p><strong>Fornitore:</strong> ${contratto.fornitore}</p>
                <p><strong>${tipo === 'luce' ? 'POD' : 'PDR'}:</strong> ${contratto[podField]}</p>
                <p><strong>Data Scadenza:</strong> ${new Date(contratto.data_scadenza).toLocaleDateString('it-IT')}</p>
            </div>
        `;
        
        let htmlBody = '';
        
        // Genera HTML in base al template scelto
        switch (template) {
            case 'formal':
                htmlBody = `
                    <html>
                        <body style="font-family: 'Times New Roman', serif; line-height: 1.8; color: #000;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 2px solid #333;">
                                <p style="text-align: right; margin-bottom: 30px;">${new Date().toLocaleDateString('it-IT')}</p>
                                <p><strong>Gentile ${nomeCliente},</strong></p>
                                <p>Con la presente desideriamo informarLa che il Suo contratto di fornitura <strong>${tipo.toUpperCase()}</strong> è in scadenza tra <strong>${contratto.giorni_a_scadenza} giorni</strong>.</p>
                                ${dettagliContratto}
                                <p>La invitiamo a contattarci tempestivamente al fine di valutare le migliori soluzioni disponibili sul mercato energetico.</p>
                                <p style="margin-top: 40px;">Cordiali saluti,</p>
                                <p><strong>Il Team di Gestionale Energia</strong></p>
                            </div>
                        </body>
                    </html>
                `;
                break;
                
            case 'friendly':
                htmlBody = `
                    <html>
                        <body style="font-family: 'Comic Sans MS', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f0f9ff;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px;">
                                <div style="background-color: #fff; padding: 25px; border-radius: 10px;">
                                    <h2 style="color: #667eea; font-size: 24px;">👋 Ciao ${nomeCliente}!</h2>
                                    <p style="font-size: 16px;">Ti scriviamo per ricordarti che il tuo contratto <strong>${tipo.toUpperCase()}</strong> sta per scadere tra <strong>${contratto.giorni_a_scadenza} giorni</strong>! ⏰</p>
                                    ${dettagliContratto}
                                    <p style="font-size: 16px;">Non preoccuparti! Siamo qui per aiutarti a trovare la migliore offerta sul mercato. 🌟</p>
                                    <p style="margin-top: 20px; text-align: center;">
                                        <span style="font-size: 18px;">💬 Parliamone insieme!</span>
                                    </p>
                                    <p style="text-align: center; margin-top: 30px; color: #667eea;">
                                        <strong>Il Team di Gestionale Energia</strong> 💙
                                    </p>
                                </div>
                            </div>
                        </body>
                    </html>
                `;
                break;
                
            case 'urgent':
                htmlBody = `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #fff; background-color: #dc2626;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <div style="background-color: #991b1b; padding: 20px; border: 3px solid #fbbf24; border-radius: 10px;">
                                    <h2 style="color: #fbbf24; text-align: center; font-size: 28px;">⚠️ ATTENZIONE URGENTE ⚠️</h2>
                                    <p style="font-size: 18px; font-weight: bold; text-align: center;">
                                        Caro ${nomeCliente}, il tuo contratto ${tipo.toUpperCase()} scade tra soli ${contratto.giorni_a_scadenza} giorni!
                                    </p>
                                    ${dettagliContratto.replace(/background-color: #fff/g, 'background-color: #7f1d1d')}
                                    <p style="font-size: 16px; background-color: #fbbf24; color: #000; padding: 15px; border-radius: 5px; text-align: center; font-weight: bold;">
                                        È FONDAMENTALE RINNOVARLO SUBITO per evitare interruzioni del servizio!
                                    </p>
                                    <p style="margin-top: 20px; text-align: center; font-size: 16px;">
                                        Contattaci IMMEDIATAMENTE per trovare la soluzione migliore!
                                    </p>
                                    <p style="text-align: center; margin-top: 30px;">
                                        <strong>Il Team di Gestionale Energia</strong>
                                    </p>
                                </div>
                            </div>
                        </body>
                    </html>
                `;
                break;
                
            case 'custom':
                // Usa il messaggio personalizzato dell'admin
                const messaggioFormattato = customMessage ? customMessage.replace(/\n/g, '<br>') : '';
                htmlBody = `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                                <h2 style="color: #1f2937;">Ciao ${nomeCliente},</h2>
                                <div style="margin: 20px 0; font-size: 16px;">
                                    ${messaggioFormattato}
                                </div>
                                ${dettagliContratto}
                                <p style="margin-top: 30px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                                    Il Team di Gestionale Energia
                                </p>
                            </div>
                        </body>
                    </html>
                `;
                break;
                
            default:
                // Template default (standard)
                htmlBody = `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                                <h2 style="color: #1f2937;">Ciao ${nomeCliente},</h2>
                                <p>Ti informiamo che il tuo contratto <strong>${tipo.toUpperCase()}</strong> è in scadenza tra <strong>${contratto.giorni_a_scadenza} giorni</strong>.</p>
                                ${dettagliContratto}
                                <p style="margin-top: 20px;">Contattaci per valutare insieme le migliori offerte disponibili sul mercato!</p>
                                <p>Il Team di Gestionale Energia</p>
                            </div>
                        </body>
                    </html>
                `;
        }
        
        await sendEmail({
            to: emailDestinatario,
            subject,
            html: htmlBody,
            tipoEmail: 'custom'
        });
        
        res.json({
            success: true,
            message: `Email inviata con successo a ${emailDestinatario}`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/contratti/:tipo/:id/mark-contacted
 * Segna contratto come contattato
 */
router.post('/:tipo/:id/mark-contacted', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipo, id } = req.params;
        const { note } = req.body;
        
        if (tipo !== 'luce' && tipo !== 'gas') {
            return res.status(400).json({ success: false, message: 'Tipo contratto non valido' });
        }
        
        const table = tipo === 'luce' ? 'contratti_luce' : 'contratti_gas';
        
        // Aggiorna le note del contratto
        const noteText = note ? `[${new Date().toLocaleDateString('it-IT')}] Contattato: ${note}` : `[${new Date().toLocaleDateString('it-IT')}] Cliente contattato`;
        
        await pool.query(`
            UPDATE ${table}
            SET note = CASE 
                WHEN note IS NULL OR note = '' THEN ?
                ELSE note || '\n' || ?
            END
            WHERE id = ?
        `, [noteText, noteText, id]);
        
        res.json({
            success: true,
            message: 'Contratto segnato come contattato'
        });
    } catch (error) {
        next(error);
    }
});

export default router;

