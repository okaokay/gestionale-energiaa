/**
 * ════════════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE CONTROLLO RUOLI - Sistema Multi-Level
 * ════════════════════════════════════════════════════════════════════════════════
 * 
 * Gestisce i permessi per:
 * - Super Admin: accesso totale
 * - Admin: accesso solo alla sua agenzia
 * - Agent: accesso solo ai suoi clienti assegnati
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

export interface UserRole {
    id: number;
    email: string;
    role: 'super_admin' | 'admin' | 'agent' | 'operatore' | 'visualizzatore';
    agency_name?: string;
    parent_id?: number;
}

/**
 * Middleware per verificare se l'utente ha un ruolo specifico
 */
export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as unknown as UserRole;
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Non autenticato' 
            });
        }

        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Accesso negato. Richiesto uno dei seguenti ruoli: ${allowedRoles.join(', ')}` 
            });
        }

        next();
    };
}

/**
 * Middleware per verificare se l'utente può accedere a un cliente specifico
 */
export async function canAccessCliente(req: Request, res: Response, next: NextFunction) {
    const user = req.user as unknown as UserRole;
    
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Non autenticato' 
        });
    }

    // Super Admin può accedere a tutto
    if (user.role === 'super_admin') {
        return next();
    }

    const clienteId = parseInt(req.params.id);
    const clienteTipo = req.params.tipo; // 'privato' o 'azienda'

    if (!clienteId || !clienteTipo) {
        return res.status(400).json({ 
            success: false, 
            message: 'ID cliente o tipo mancante' 
        });
    }

    try {
        const tabella = clienteTipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
        
        const clienteResult = await pool.query(
            `SELECT assigned_agent_id FROM ${tabella} WHERE id = ?`,
            [clienteId]
        );
        const cliente = clienteResult.rows[0] as { assigned_agent_id: number | null } | undefined;

        if (!cliente) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cliente non trovato' 
            });
        }

        // Agent: può accedere solo se il cliente è assegnato a lui
        if (user.role === 'agent') {
            if (cliente.assigned_agent_id !== user.id) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Non hai i permessi per accedere a questo cliente' 
                });
            }
        }

        // Admin: può accedere se il cliente è assegnato a un agente della sua agenzia
        if (user.role === 'admin') {
            if (cliente.assigned_agent_id) {
                const agentResult = await pool.query(
                    `SELECT parent_id, agency_name FROM users WHERE id = ?`,
                    [cliente.assigned_agent_id]
                );
                const agent = agentResult.rows[0] as { parent_id: number; agency_name: string } | undefined;

                if (agent) {
                    // Verifica se l'agente appartiene all'admin (stesso parent_id o stessa agenzia)
                    if (agent.parent_id !== user.id && agent.agency_name !== user.agency_name) {
                        return res.status(403).json({ 
                            success: false, 
                            message: 'Questo cliente non appartiene alla tua agenzia' 
                        });
                    }
                }
            }
        }

        next();
    } catch (error: any) {
        console.error('Errore controllo permessi cliente:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Errore verifica permessi' 
        });
    }
}

/**
 * Filtra query clienti in base al ruolo utente
 */
export function getClientiFilter(user: UserRole): { whereClause: string; params: any[] } {
    // Super Admin: nessun filtro
    if (user.role === 'super_admin') {
        return { whereClause: '', params: [] };
    }

    // Agent: solo clienti assegnati a lui
    if (user.role === 'agent') {
        return { 
            whereClause: 'WHERE assigned_agent_id = ?', 
            params: [user.id] 
        };
    }

    // Admin: clienti della sua agenzia
    if (user.role === 'admin') {
        // Prendi tutti gli agenti della sua agenzia (sincrono per questo caso)
        // Nota: questa funzione è sincrona quindi non possiamo usare await qui
        // TODO: Rendere questa funzione async se necessario
        return { 
            whereClause: `WHERE assigned_agent_id IN (SELECT id FROM users WHERE (parent_id = ? OR id = ?) AND is_active = 1)`, 
            params: [user.id, user.id] 
        };
    }

    // Default: nessun accesso
    return { whereClause: 'WHERE 1 = 0', params: [] };
}

/**
 * Middleware per verificare se l'utente può riassegnare clienti
 */
export function canReassignCliente(req: Request, res: Response, next: NextFunction) {
    const user = req.user as unknown as UserRole;
    
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Non autenticato' 
        });
    }

    // Solo Admin e Super Admin possono riassegnare
    if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Solo gli amministratori possono riassegnare clienti' 
        });
    }

    next();
}

/**
 * Middleware per verificare accesso a compensi/contabilità
 */
export async function canAccessContabilita(req: Request, res: Response, next: NextFunction) {
    const user = req.user as unknown as UserRole;
    
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Non autenticato' 
        });
    }

    // Agent può vedere solo i suoi compensi
    if (user.role === 'agent') {
        const agentId = parseInt(req.params.agentId || req.query.agentId as string);
        
        if (agentId && agentId !== user.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'Puoi vedere solo i tuoi compensi' 
            });
        }
    }

    // Admin può vedere compensi della sua agenzia
    if (user.role === 'admin') {
        const agentId = parseInt(req.params.agentId || req.query.agentId as string);
        
        if (agentId) {
            const agentResult = await pool.query(
                `SELECT parent_id, agency_name FROM users WHERE id = ?`,
                [agentId]
            );
            const agent = agentResult.rows[0] as { parent_id: number; agency_name: string } | undefined;

            if (agent && agent.parent_id !== user.id && agent.agency_name !== user.agency_name) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Puoi vedere solo compensi della tua agenzia' 
                });
            }
        }
    }

    next();
}

/**
 * Log operazione per audit
 */
export function logOperation(
    userId: number,
    operation: string,
    resourceType: string,
    resourceId: string | number,
    details?: any
) {
    try {
        // TODO: Implementare tabella audit_log se necessario
        console.log(`[AUDIT] User ${userId} - ${operation} - ${resourceType} ${resourceId}`, details);
    } catch (error) {
        console.error('Errore log operazione:', error);
    }
}

/**
 * Helper per creare notifica
 */
export async function createNotifica(
    userId: number,
    tipo: string,
    titolo: string,
    messaggio: string,
    link?: string
) {
    try {
        await pool.query(
            `INSERT INTO notifiche (user_id, tipo, titolo, messaggio, link) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, tipo, titolo, messaggio, link || null]
        );
    } catch (error) {
        console.error('Errore creazione notifica:', error);
    }
}

export default {
    requireRole,
    canAccessCliente,
    getClientiFilter,
    canReassignCliente,
    canAccessContabilita,
    logOperation,
    createNotifica
};

