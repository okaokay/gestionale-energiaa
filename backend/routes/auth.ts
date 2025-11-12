/**
 * Route per autenticazione
 */

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { generateToken } from '../config/jwt';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/login
 * Login utente
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email e password obbligatorie'
            });
        }
        
        // Trova utente
        console.log('🔍 Login tentativo per:', email.toLowerCase());
        
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        
        console.log('📊 Risultati query:', result.rows.length);
        
        if (result.rows.length === 0) {
            console.log('❌ Utente non trovato nel database');
            return res.status(401).json({
                success: false,
                message: 'Credenziali non valide'
            });
        }
        
        const user = result.rows[0] as any;
        console.log('✅ Utente trovato:', user.email);
        
        // Verifica che l'utente sia attivo (supporta colonne 'attivo' o 'is_active')
        const rawActiveValues = [user.attivo, (user as any).is_active];
        const hasActiveFlag = rawActiveValues.some(v => typeof v !== 'undefined' && v !== null);
        const isActive = rawActiveValues.some(v => v === true || v === 1 || v === '1');

        if (hasActiveFlag && !isActive) {
            return res.status(401).json({
                success: false,
                message: 'Utente disattivato'
            });
        }
        
        // Verifica password (supporta sia 'password_hash' che 'password')
        const passwordHash: string | null =
            (typeof (user as any).password_hash === 'string' && (user as any).password_hash.length > 0)
                ? (user as any).password_hash
                : ((typeof (user as any).password === 'string' && (user as any).password.length > 0)
                    ? (user as any).password
                    : null);

        if (!passwordHash) {
            console.warn('⚠️  Login fallito: hash password mancante per utente', user.email);
            return res.status(401).json({
                success: false,
                message: 'Credenziali non valide'
            });
        }

        const passwordMatch = await bcrypt.compare(password, passwordHash);
        
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenziali non valide'
            });
        }
        
        // Genera token JWT
        const token = generateToken({
            userId: user.id,
            email: user.email,
            ruolo: user.ruolo,
            nome: user.nome,
            cognome: user.cognome
        });
        
        res.json({
            success: true,
            message: 'Login effettuato con successo',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    nome: user.nome,
                    cognome: user.cognome,
                    ruolo: user.ruolo
                }
            }
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/auth/me
 * Ottieni dati utente corrente
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await pool.query(
            'SELECT id, email, nome, cognome, ruolo, created_at, ultimo_accesso FROM users WHERE id = $1',
            [req.user!.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/change-password
 * Cambio password
 */
router.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password vecchia e nuova obbligatorie'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La nuova password deve essere di almeno 8 caratteri'
            });
        }
        
        // Verifica password attuale
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user!.userId]
        );
        
        const currentUser = userResult.rows[0] as any;
        const passwordMatch = await bcrypt.compare(oldPassword, currentUser.password_hash);
        
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Password attuale non corretta'
            });
        }
        
        // Aggiorna password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newPasswordHash, req.user!.userId]
        );
        
        res.json({
            success: true,
            message: 'Password aggiornata con successo'
        });
        
    } catch (error) {
        next(error);
    }
});

export default router;

