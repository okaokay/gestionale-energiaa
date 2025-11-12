/**
 * API ENDPOINTS - Compilazione e Gestione Contratti
 */

import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// Applica autenticazione
router.use(authenticate);

// ============================================================
// CONTRATTI - CRUD
// ============================================================

/**
 * GET /api/contratti-compilazione
 * Recupera tutti i contratti
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { stato, cliente_id, fornitore, tipo_cliente } = req.query;
        
        let query = `
            SELECT 
                c.*,
                ct.nome as template_nome,
                u.email as created_by_email,
                CASE 
                    WHEN c.cliente_tipo = 'privato' THEN cp.nome || ' ' || cp.cognome
                    WHEN c.cliente_tipo = 'azienda' THEN ca.ragione_sociale
                END as cliente_nome
            FROM contracts c
            LEFT JOIN contract_templates ct ON c.template_id = ct.id
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN clienti_privati cp ON c.cliente_id = cp.id AND c.cliente_tipo = 'privato'
            LEFT JOIN clienti_aziende ca ON c.cliente_id = ca.id AND c.cliente_tipo = 'azienda'
            WHERE 1=1
        `;
        
        const params: any[] = [];
        
        if (stato) {
            query += ` AND c.stato = ?`;
            params.push(stato);
        }
        
        if (cliente_id) {
            query += ` AND c.cliente_id = ?`;
            params.push(cliente_id);
        }
        
        if (fornitore) {
            query += ` AND c.fornitore = ?`;
            params.push(fornitore);
        }
        
        if (tipo_cliente) {
            query += ` AND c.tipo_cliente = ?`;
            params.push(tipo_cliente);
        }
        
        query += ` ORDER BY c.created_at DESC`;
        
        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows.map((r: any) => ({
                ...r,
                dati_compilati: r.dati_compilati ? JSON.parse(r.dati_compilati) : null
            })),
            count: result.rowCount
        });
    } catch (error: any) {
        console.error('❌ Errore recupero contratti:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante il recupero dei contratti',
            error: error.message
        });
    }
});

/**
 * GET /api/contratti-compilazione/:id
 * Recupera dettaglio contratto
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                c.*,
                ct.nome as template_nome,
                ct.campi_estratti as template_campi,
                u.email as created_by_email,
                CASE 
                    WHEN c.cliente_tipo = 'privato' THEN cp.nome || ' ' || cp.cognome
                    WHEN c.cliente_tipo = 'azienda' THEN ca.ragione_sociale
                END as cliente_nome
            FROM contracts c
            LEFT JOIN contract_templates ct ON c.template_id = ct.id
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN clienti_privati cp ON c.cliente_id = cp.id AND c.cliente_tipo = 'privato'
            LEFT JOIN clienti_aziende ca ON c.cliente_id = ca.id AND c.cliente_tipo = 'azienda'
            WHERE c.id = ?
        `, [id]);

        if ((!result.rows || result.rows.length === 0)) {
            return res.status(404).json({
                success: false,
                message: 'Contratto non trovato'
            });
        }

        const contract = result.rows[0] as any;

        res.json({
            success: true,
            data: {
                ...contract,
                dati_compilati: contract.dati_compilati ? JSON.parse(contract.dati_compilati) : null,
                template_campi: contract.template_campi ? JSON.parse(contract.template_campi) : null
            }
        });
    } catch (error: any) {
        console.error('❌ Errore recupero contratto:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante il recupero del contratto',
            error: error.message
        });
    }
});

/**
 * POST /api/contratti-compilazione/create-manual
 * Crea nuovo contratto con compilazione manuale
 */
router.post('/create-manual', async (req: Request, res: Response) => {
    try {
        let {
            cliente_id,
            cliente_tipo,
            template_id,
            dati_compilati,
            fornitore
        } = req.body;

        const user = req.user as any;

        if (!template_id) {
            return res.status(400).json({
                success: false,
                message: 'Parametri mancanti: template_id'
            });
        }

        // ══════════════════════════════════════════════════════════════════
        // 🆕 CREAZIONE AUTOMATICA CLIENTE SE NON ESISTE
        // ══════════════════════════════════════════════════════════════════
        if (!cliente_id && dati_compilati) {
            console.log('🆕 Creazione automatica cliente da dati contratto...');
            
            try {
                const newClienteId = crypto.randomUUID();
                const now = new Date().toISOString();
                
                // Determina il tipo cliente dai dati
                if (!cliente_tipo) {
                    cliente_tipo = dati_compilati.ragione_sociale ? 'azienda' : 'privato';
                }

                if (cliente_tipo === 'privato') {
                    await pool.query(`
                        INSERT INTO clienti_privati (
                            id, nome, cognome, codice_fiscale, data_nascita,
                            email_principale, telefono_mobile, telefono_fisso,
                            via_fornitura, civico_fornitura, cap_fornitura, citta_fornitura, provincia_fornitura,
                            note, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        newClienteId,
                        dati_compilati.nome || dati_compilati.nome_cliente || '',
                        dati_compilati.cognome || dati_compilati.cognome_cliente || '',
                        dati_compilati.codice_fiscale?.toUpperCase() || '',
                        dati_compilati.data_nascita || null,
                        dati_compilati.email || dati_compilati.email_principale || '',
                        dati_compilati.cellulare || dati_compilati.telefono_mobile || dati_compilati.telefono || '',
                        dati_compilati.telefono_fisso || dati_compilati.telefono || null,
                        dati_compilati.indirizzo_fornitura || dati_compilati.indirizzo || '',
                        dati_compilati.civico_fornitura || dati_compilati.civico || '',
                        dati_compilati.cap_fornitura || dati_compilati.cap || '',
                        dati_compilati.comune_fornitura || dati_compilati.citta_fornitura || dati_compilati.comune || '',
                        dati_compilati.provincia_fornitura?.toUpperCase() || dati_compilati.provincia?.toUpperCase() || '',
                        'Cliente creato automaticamente da compilazione contratto',
                        user.id
                    ]);
                    
                    console.log(`✅ Cliente privato creato: ${dati_compilati.nome} ${dati_compilati.cognome}`);
                } else {
                    await pool.query(`
                        INSERT INTO clienti_aziende (
                            id, ragione_sociale, partita_iva, codice_ateco, codice_fiscale, codice_sdi,
                            pec_aziendale, via_sede_legale, civico_sede_legale, cap_sede_legale, citta_sede_legale, provincia_sede_legale,
                            nome_referente, cognome_referente, email_referente, telefono_referente,
                            note, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        newClienteId,
                        dati_compilati.ragione_sociale || '',
                        dati_compilati.partita_iva?.toUpperCase() || '',
                        dati_compilati.codice_ateco || null,
                        dati_compilati.codice_fiscale?.toUpperCase() || null,
                        dati_compilati.codice_sdi || null,
                        dati_compilati.pec || dati_compilati.pec_aziendale || null,
                        dati_compilati.indirizzo_fornitura || dati_compilati.via_sede_legale || '',
                        dati_compilati.civico_fornitura || dati_compilati.civico_sede_legale || '',
                        dati_compilati.cap_fornitura || dati_compilati.cap_sede_legale || '',
                        dati_compilati.comune_fornitura || dati_compilati.citta_sede_legale || '',
                        dati_compilati.provincia_fornitura?.toUpperCase() || dati_compilati.provincia_sede_legale?.toUpperCase() || '',
                        dati_compilati.nome_referente || null,
                        dati_compilati.cognome_referente || dati_compilati.referente || null,
                        dati_compilati.email || dati_compilati.email_referente || '',
                        dati_compilati.telefono || dati_compilati.telefono_referente || '',
                        'Cliente creato automaticamente da compilazione contratto',
                        user.id
                    ]);
                    
                    console.log(`✅ Cliente business creato: ${dati_compilati.ragione_sociale}`);
                }

                cliente_id = newClienteId;
                
                // Crea anche contratti luce/gas se ci sono POD/PDR
                const dataOggi = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const dataScadenzaDefault = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]; // +1 anno
                
                if (dati_compilati.pod) {
                    const podId = crypto.randomUUID();
                    const clientePrivatoId = cliente_tipo === 'privato' ? newClienteId : null;
                    const clienteAziendaId = cliente_tipo === 'azienda' ? newClienteId : null;
                    const numeroContratto = `LUCE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    
                    await pool.query(`
                        INSERT INTO contratti_luce (
                            id, cliente_privato_id, cliente_azienda_id, tipo_cliente, numero_contratto, pod, fornitore,
                            prezzo_energia, data_inizio, data_fine, stato
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'attivo')
                    `, [
                        podId,
                        clientePrivatoId,
                        clienteAziendaId,
                        cliente_tipo,
                        numeroContratto,
                        dati_compilati.pod,
                        dati_compilati.fornitore || fornitore || 'Da definire',
                        dati_compilati.prezzo_luce || dati_compilati.prezzo_energia || dati_compilati.prezzo || 0,
                        dati_compilati.data_attivazione || dataOggi,
                        dati_compilati.data_scadenza || dataScadenzaDefault
                    ]);
                    console.log(`✅ Contratto luce creato con POD: ${dati_compilati.pod} - Numero: ${numeroContratto}`);
                }

                if (dati_compilati.pdr) {
                    const pdrId = crypto.randomUUID();
                    const clientePrivatoId = cliente_tipo === 'privato' ? newClienteId : null;
                    const clienteAziendaId = cliente_tipo === 'azienda' ? newClienteId : null;
                    const numeroContratto = `GAS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    
                    await pool.query(`
                        INSERT INTO contratti_gas (
                            id, cliente_privato_id, cliente_azienda_id, tipo_cliente, numero_contratto, pdr, fornitore,
                            prezzo_gas, data_inizio, data_fine, stato
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'attivo')
                    `, [
                        pdrId,
                        clientePrivatoId,
                        clienteAziendaId,
                        cliente_tipo,
                        numeroContratto,
                        dati_compilati.pdr,
                        dati_compilati.fornitore || fornitore || 'Da definire',
                        dati_compilati.prezzo_gas || dati_compilati.prezzo || 0,
                        dati_compilati.data_attivazione || dataOggi,
                        dati_compilati.data_scadenza || dataScadenzaDefault
                    ]);
                    console.log(`✅ Contratto gas creato con PDR: ${dati_compilati.pdr} - Numero: ${numeroContratto}`);
                }
                
            } catch (clientError: any) {
                console.error('❌ Errore creazione automatica cliente:', clientError);
                return res.status(500).json({
                    success: false,
                    message: 'Errore durante la creazione automatica del cliente',
                    error: clientError.message
                });
            }
        }

        if (!cliente_id || !cliente_tipo) {
            return res.status(400).json({
                success: false,
                message: 'Parametri mancanti: cliente_id o dati cliente per creazione automatica'
            });
        }

        // Recupera template per info
        const template = await pool.query(`SELECT * FROM contract_templates WHERE id = ?`, [template_id]);
        
        if ((!template.rows || template.rows.length === 0)) {
            return res.status(404).json({
                success: false,
                message: 'Template non trovato'
            });
        }

        const templateData = template.rows[0] as any;
        const contractId = crypto.randomUUID();
        const numeroContratto = `CTR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        await pool.query(`
            INSERT INTO contracts 
            (id, numero_contratto, cliente_id, cliente_tipo, template_id, fornitore, categoria, tipo_cliente, dati_compilati, stato, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_compilazione', ?)
        `, [
            contractId,
            numeroContratto,
            cliente_id,
            cliente_tipo,
            template_id,
            fornitore || templateData.fornitore,
            templateData.categoria === 'luce' ? 'luce' : templateData.categoria === 'gas' ? 'gas' : 'dual',
            templateData.tipo_cliente || 'domestico',
            JSON.stringify(dati_compilati || {}),
            user.id
        ]);

        // TODO: Registra storico stato (quando implementeremo la tabella contract_status_history)
        // await pool.query(`
        //     INSERT INTO contract_status_history (contract_id, stato_precedente, stato_nuovo, changed_by)
        //     VALUES (?, NULL, 'compilato', ?)
        // `, [contractId, user.id]);

        const result = await pool.query(`SELECT * FROM contracts WHERE id = ?`, [contractId]);
        const newContract = result.rows[0] as any;

        res.json({
            success: true,
            message: 'Contratto creato con successo',
            data: {
                ...newContract,
                dati_compilati: JSON.parse(newContract.dati_compilati)
            }
        });
    } catch (error: any) {
        console.error('❌ Errore creazione contratto:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante la creazione del contratto',
            error: error.message
        });
    }
});

/**
 * PUT /api/contratti-compilazione/:id
 * Aggiorna dati contratto
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { dati_compilati, stato } = req.body;
        const user = req.user as any;

        const updates: string[] = [];
        const params: any[] = [];

        if (dati_compilati) {
            updates.push('dati_compilati = ?');
            params.push(JSON.stringify(dati_compilati));
        }

        if (stato) {
            // Recupera stato precedente per storico
            const current = await pool.query(`SELECT stato FROM contracts WHERE id = ?`, [id]);
            if ((current.rows && current.rows.length > 0)) {
                const currentContract = current.rows[0] as any;
                const statoPrec = currentContract.stato;
                
                updates.push('stato = ?');
                params.push(stato);

                // Registra cambio stato
                await pool.query(`
                    INSERT INTO contract_status_history (contract_id, stato_precedente, stato_nuovo, changed_by)
                    VALUES (?, ?, ?, ?)
                `, [id, statoPrec, stato, user.id]);
            }
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        await pool.query(`
            UPDATE contracts 
            SET ${updates.join(', ')}
            WHERE id = ?
        `, params);

        const result = await pool.query(`SELECT * FROM contracts WHERE id = ?`, [id]);
        const updatedContract = result.rows[0] as any;

        res.json({
            success: true,
            message: 'Contratto aggiornato con successo',
            data: {
                ...updatedContract,
                dati_compilati: JSON.parse(updatedContract.dati_compilati)
            }
        });
    } catch (error: any) {
        console.error('❌ Errore aggiornamento contratto:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante l\'aggiornamento del contratto',
            error: error.message
        });
    }
});

/**
 * PUT /api/contratti-compilazione/:id/stato
 * Cambia stato contratto
 */
router.put('/:id/stato', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { stato, note } = req.body;
        const user = req.user as any;

        if (!stato) {
            return res.status(400).json({
                success: false,
                message: 'Stato mancante'
            });
        }

        // Recupera stato attuale
        const current = await pool.query(`SELECT stato, cliente_id, cliente_tipo FROM contracts WHERE id = ?`, [id]);
        
        if (current.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contratto non trovato'
            });
        }

        const currentData = current.rows[0] as any;
        const statoPrec = currentData.stato;

        // Aggiorna stato
        await pool.query(`UPDATE contracts SET stato = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [stato, id]);

        // Registra storico
        await pool.query(`
            INSERT INTO contract_status_history (contract_id, stato_precedente, stato_nuovo, note, changed_by)
            VALUES (?, ?, ?, ?, ?)
        `, [id, statoPrec, stato, note || null, user.id]);

        // Sincronizza con pagina clienti (aggiorna stato cliente)
        const clienteData = currentData as any;
        const tabella = clienteData.cliente_tipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
        
        await pool.query(`UPDATE ${tabella} SET stato = ? WHERE id = ?`, [stato, clienteData.cliente_id]);

        // ═══════════════════════════════════════════════════════════════════════════
        // AUTOMAZIONE PAGAMENTO COMMISSIONE
        // ═══════════════════════════════════════════════════════════════════════════
        
        const statiPagamento = ['Da attivare', 'Chiusa', 'chiusa', 'chiuso', 'Attivo']; // Stati che triggerano il pagamento
        
        console.log('🔍 Verifica condizioni automazione commissione (da contratti-compilazione):');
        console.log('   - Stato precedente:', statoPrec);
        console.log('   - Stato nuovo:', stato);
        console.log('   - Stati che triggerano pagamento:', statiPagamento);
        console.log('   - Stato è valido?', statiPagamento.includes(stato));
        
        if (statiPagamento.includes(stato)) {
            // Recupera dati cliente per verificare agente e commissione
            const clienteResult = await pool.query(`
                SELECT assigned_agent_id, commissione_pattuita, commissione_pagata 
                FROM ${tabella} 
                WHERE id = ?
            `, [clienteData.cliente_id]);
            
            if (clienteResult.rows.length > 0) {
                const cliente = clienteResult.rows[0] as any;
                
                console.log('   - Commissione già pagata?', cliente.commissione_pagata);
                console.log('   - Commissione pattuita:', cliente.commissione_pattuita);
                console.log('   - Agente assegnato:', cliente.assigned_agent_id);
                
                if (cliente.commissione_pattuita && 
                    cliente.assigned_agent_id) {
                    
                    // Verifica se esiste già un compenso per questo contratto specifico
                    const compensoEsistente = await pool.query(`
                        SELECT id FROM compensi 
                        WHERE contratto_id = ? AND agente_id = ?
                    `, [id, cliente.assigned_agent_id]);
                    
                    if (compensoEsistente.rows.length === 0) {
                        console.log(`💰 Automazione commissione (da contratti-compilazione): Cliente ${clienteData.cliente_id} - Stato "${stato}" - Commissione: €${cliente.commissione_pattuita}`);
                        
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
                            clienteData.cliente_id,
                            clienteData.cliente_tipo,
                            id, // ID del contratto
                            clienteData.cliente_tipo === 'privato' ? 'luce' : 'gas', // Tipo contratto basato sul tipo cliente
                            cliente.commissione_pattuita,
                            'commissione_contratto',
                            `Commissione per contratto - Cambio stato a ${stato}`,
                            'maturato',
                            new Date().toISOString()
                        ]);

                        console.log(`✅ Commissione automatica creata per cliente ${clienteData.cliente_id}: €${cliente.commissione_pattuita}`);
                    } else {
                        console.log(`ℹ️ Compenso già esistente per contratto ${id}`);
                    }
                }
            }
        }

        // Registra audit log
        await pool.query(`
            INSERT INTO audit_log (tipo_azione, risorsa_tipo, risorsa_id, cliente_id, cliente_tipo, utente_id, utente_nome, descrizione)
            VALUES (?, 'contratto', ?, ?, ?, ?, ?, ?)
        `, [
            'stato_cambiato',
            id,
            clienteData.cliente_id,
            clienteData.cliente_tipo,
            user.id,
            user.email,
            `Stato contratto cambiato da "${statoPrec}" a "${stato}"`
        ]);

        res.json({
            success: true,
            message: 'Stato contratto aggiornato con successo'
        });
    } catch (error: any) {
        console.error('❌ Errore cambio stato contratto:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante il cambio di stato',
            error: error.message
        });
    }
});

/**
 * GET /api/contratti-compilazione/:id/storico-stati
 * Recupera storico stati contratto
 */
router.get('/:id/storico-stati', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                csh.*,
                u.email as changed_by_email,
                u.nome || ' ' || COALESCE(u.cognome, '') as changed_by_name
            FROM contract_status_history csh
            LEFT JOIN users u ON csh.changed_by = u.id
            WHERE csh.contract_id = ?
            ORDER BY csh.changed_at DESC
        `, [id]);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error: any) {
        console.error('❌ Errore storico stati:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante il recupero dello storico',
            error: error.message
        });
    }
});

/**
 * DELETE /api/contratti-compilazione/:id
 * Elimina contratto
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Verifica esistenza
        const exists = await pool.query(`SELECT id FROM contracts WHERE id = ?`, [id]);
        
        if (exists.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contratto non trovato'
            });
        }

        // Elimina (cascade eliminerà anche lo storico stati)
        await pool.query(`DELETE FROM contracts WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: 'Contratto eliminato con successo'
        });
    } catch (error: any) {
        console.error('❌ Errore eliminazione contratto:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante l\'eliminazione del contratto',
            error: error.message
        });
    }
});

export default router;

