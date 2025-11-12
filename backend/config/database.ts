/**
 * Database SQLite - Configurazione semplificata
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';

// Preferisci DATABASE_PATH se definito, altrimenti usa la working directory del processo
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'gestionale_energia.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

console.log('✅ Database SQLite connesso:', dbPath);

// Tipi helper per risultati delle query
export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
}

/**
 * Pool compatibile con PostgreSQL
 */
export const pool = {
    query: <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
        try {
            // Converti $1, $2 in ?
            let sqliteQuery = text;
            for (let i = params.length; i >= 1; i--) {
                sqliteQuery = sqliteQuery.replace(new RegExp(`\\$${i}`, 'g'), '?');
            }
            
            // Converti NOW() PostgreSQL -> datetime('now') SQLite
            sqliteQuery = sqliteQuery.replace(/NOW\(\)/gi, "datetime('now')");
            
            // Converti ILIKE -> LIKE (SQLite è case-insensitive di default)
            sqliteQuery = sqliteQuery.replace(/ILIKE/gi, 'LIKE');
            
            // Converti INTERVAL (PostgreSQL) in equivalente SQLite
            sqliteQuery = sqliteQuery.replace(/NOW\(\)\s*-\s*INTERVAL\s+'(\d+)\s+days?'/gi, "datetime('now', '-$1 days')");
            
            // Rimuovi RETURNING (non supportato)
            const hasReturning = sqliteQuery.toUpperCase().includes('RETURNING');
            if (hasReturning) {
                sqliteQuery = sqliteQuery.replace(/RETURNING.*/gi, '');
            }
            
            // Esegui query
            const isSelectLike = (() => {
                const q = sqliteQuery.trim().toUpperCase();
                return q.startsWith('SELECT') || q.startsWith('PRAGMA');
            })();
            if (isSelectLike) {
                const stmt = db.prepare(sqliteQuery);
                const rows = stmt.all(...params) as T[];
                return Promise.resolve({ rows, rowCount: rows.length });
            } else {
                const stmt = db.prepare(sqliteQuery);
                const result = stmt.run(...params);
                
                // Se è INSERT e aveva RETURNING, recupera il record
                if (hasReturning && sqliteQuery.trim().toUpperCase().startsWith('INSERT')) {
                    const tableName = sqliteQuery.match(/INSERT INTO\s+(\w+)/i)?.[1];
                    if (tableName && result.lastInsertRowid) {
                        const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
                        const row = selectStmt.get(result.lastInsertRowid) as T | undefined;
                        return Promise.resolve({ rows: row ? [row] : [], rowCount: 1 });
                    }
                }
                
                return Promise.resolve({ rows: [] as T[], rowCount: result.changes });
            }
        } catch (error) {
            // Log esteso: mostra SQL e parametri per debug "datatype mismatch"
            try {
                // Prova a ricostruire la query con placeholder convertiti come sopra
                let printableQuery = text;
                for (let i = params.length; i >= 1; i--) {
                    printableQuery = printableQuery.replace(new RegExp(`\\$${i}`, 'g'), '?');
                }
                printableQuery = printableQuery.replace(/NOW\(\)/gi, "datetime('now')");
                printableQuery = printableQuery.replace(/ILIKE/gi, 'LIKE');
                printableQuery = printableQuery.replace(/NOW\(\)\s*-\s*INTERVAL\s+'(\d+)\s+days?'/gi, "datetime('now', '-$1 days')");
                console.error('❌ Errore query SQLite:', error);
                console.error('   ↳ SQL:', printableQuery);
                console.error('   ↳ Params:', params);
            } catch {
                console.error('❌ Errore query SQLite:', error);
            }
            return Promise.reject(error);
        }
    }
};

export async function testConnection(): Promise<boolean> {
    try {
        await pool.query<{ test: number }>('SELECT 1 as test');
        console.log('✅ Test connessione SQLite OK');
        return true;
    } catch (error) {
        console.error('❌ Errore connessione SQLite:', error);
        return false;
    }
}

export async function closePool() {
    db.close();
    console.log('🔌 Database SQLite chiuso');
}

export function generateUUID(): string {
    return randomUUID();
}

export default { pool, testConnection, closePool, generateUUID };
