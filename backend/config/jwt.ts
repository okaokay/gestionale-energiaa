/**
 * Configurazione JWT per autenticazione
 */

import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
    userId: string;
    email: string;
    ruolo: 'super_admin' | 'admin' | 'operatore' | 'visualizzatore';
    nome: string;
    cognome: string;
}

/**
 * Genera un token JWT
 */
export function generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN as string,
        issuer: 'gestionale-energia',
    } as jwt.SignOptions);
}

/**
 * Verifica e decodifica un token JWT
 */
export function verifyToken(token: string): JwtPayload {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'gestionale-energia',
        } as jwt.VerifyOptions) as JwtPayload;
        return decoded;
    } catch (error) {
        throw new Error('Token non valido o scaduto');
    }
}

/**
 * Estrae il token dall'header Authorization
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}

/**
 * Verifica se un ruolo ha i permessi richiesti
 */
export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
    // Verifica se il ruolo utente è nella lista dei ruoli permessi
    // O se ha un livello gerarchico sufficiente
    
    // 1. Verifica diretta: il ruolo è nella lista?
    if (requiredRoles.includes(userRole)) {
        return true;
    }
    
    // 2. Verifica gerarchica: super_admin può fare tutto
    const roleHierarchy: { [key: string]: number } = {
        'super_admin': 4,
        'admin': 3,
        'operatore': 2,
        'agent': 2,
        'visualizzatore': 1,
    };
    
    const userLevel = roleHierarchy[userRole] || 0;
    
    // Se super_admin, può accedere a tutto
    if (userLevel === 4) {
        return true;
    }
    
    // Altrimenti, deve essere esplicitamente nella lista
    return false;
}

export default {
    generateToken,
    verifyToken,
    extractTokenFromHeader,
    hasPermission,
};

