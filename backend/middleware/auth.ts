/**
 * Middleware per autenticazione e autorizzazione
 */

import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken, hasPermission, JwtPayload } from '../config/jwt';
import { pool } from '../config/database';

// Estendi Request per includere user
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Middleware: verifica che l'utente sia autenticato
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token di autenticazione mancante'
            });
        }
        
        // Verifica validità token
        const decoded = verifyToken(token);
        
        // Verifica che l'utente esista ancora nel database e recupera tutti i dati
        const userCheck = await pool.query(
            'SELECT id, email, ruolo, nome, cognome, attivo FROM users WHERE id = ?',
            [decoded.userId]
        );
        
        if (userCheck.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Utente non trovato'
            });
        }
        
        const user = userCheck.rows[0] as any;
        if (!user.attivo) {
            return res.status(401).json({
                success: false,
                message: 'Utente disattivato'
            });
        }
        
        // Aggiorna ultimo accesso
        await pool.query(
            'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [decoded.userId]
        );
        
        // Allega dati utente COMPLETI alla request (compatibile con UserRole)
        req.user = {
            userId: decoded.userId,
            id: user.id,
            email: user.email,
            ruolo: user.ruolo,  // Per retrocompatibilità frontend
            role: user.ruolo,   // Standard per backend
            nome: user.nome,
            cognome: user.cognome,
            agency_name: user.agency_name,
            parent_id: user.parent_id
        } as any;
        next();
    } catch (error: any) {
        return res.status(401).json({
            success: false,
            message: error.message || 'Autenticazione fallita'
        });
    }
}

/**
 * Middleware: verifica che l'utente abbia uno dei ruoli richiesti
 */
export function authorize(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticazione richiesta'
            });
        }
        
        // 🔐 Usa req.user.role (NON ruolo) per compatibilità con UserRole interface
        const userRole = (req.user as any).role || req.user.ruolo;
        
        if (!hasPermission(userRole, roles)) {
            console.log(`🚫 Accesso negato: ruolo "${userRole}" non in [${roles.join(', ')}]`);
            return res.status(403).json({
                success: false,
                message: 'Non hai i permessi per eseguire questa operazione'
            });
        }
        
        next();
    };
}

/**
 * Middleware: log delle richieste per audit GDPR
 */
export async function auditLog(req: Request, res: Response, next: NextFunction) {
    try {
        if (req.user) {
            // Log solo operazioni sensibili (POST, PUT, DELETE)
            if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
                await pool.query(`
                    INSERT INTO audit_logs (user_id, azione, tabella_interessata, dettagli_azione, ip_address, user_agent)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    req.user.userId,
                    `${req.method} ${req.path}`,
                    req.path.split('/')[2] || 'unknown', // Estrae la risorsa dal path
                    JSON.stringify({ body: req.body, query: req.query }),
                    req.ip,
                    req.headers['user-agent']
                ]);
            }
        }
    } catch (error) {
        console.error('Errore audit log:', error);
        // Non bloccare la richiesta se il log fallisce
    }
    next();
}

export default {
    authenticate,
    authorize,
    auditLog,
};

