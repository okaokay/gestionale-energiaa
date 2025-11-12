/**
 * Middleware per gestione centralizzata errori
 */

import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    
    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Gestione errori centralizzata
 */
export function errorHandler(
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error('❌ Errore:', err);
    
    // Se è un AppError gestito
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }
    
    // Errori di validazione PostgreSQL
    if ((err as any).code === '23505') { // Violazione unique constraint
        return res.status(409).json({
            success: false,
            message: 'Il record esiste già nel database'
        });
    }
    
    if ((err as any).code === '23503') { // Violazione foreign key
        return res.status(400).json({
            success: false,
            message: 'Riferimento a risorsa non esistente'
        });
    }
    
    // Errore generico
    return res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Si è verificato un errore interno' 
            : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

/**
 * Handler per rotte non trovate
 */
export function notFoundHandler(req: Request, res: Response) {
    res.status(404).json({
        success: false,
        message: `Risorsa non trovata: ${req.method} ${req.path}`
    });
}

export default {
    AppError,
    errorHandler,
    notFoundHandler,
};

