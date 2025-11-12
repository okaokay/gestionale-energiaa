/**
 * Database SQLite - Configurazione semplificata
 */

const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, '../../gestionale_energia.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

console.log('✅ Database SQLite connesso:', dbPath);

/**
 * Pool compatibile con PostgreSQL
 */
const pool = {
    query: (text, params = []) => {
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
            if (sqliteQuery.trim().toUpperCase().startsWith('SELECT')) {
                const stmt = db.prepare(sqliteQuery);
                const rows = stmt.all(...params);
                return Promise.resolve({ rows, rowCount: rows.length });
            } else {
                const stmt = db.prepare(sqliteQuery);
                const result = stmt.run(...params);
                
                // Per INSERT, UPDATE, DELETE
                return Promise.resolve({
                    rows: [],
                    rowCount: result.changes,
                    insertId: result.lastInsertRowid
                });
            }
        } catch (error) {
            console.error('❌ Errore query SQLite:', error);
            console.error('Query originale:', text);
            console.error('Parametri:', params);
            return Promise.reject(error);
        }
    }
};

async function testConnection() {
    try {
        const result = await pool.query('SELECT 1 as test');
        return result.rows.length > 0;
    } catch (error) {
        console.error('❌ Errore test connessione:', error);
        return false;
    }
}

async function closePool() {
    db.close();
    console.log('✅ Database SQLite chiuso');
}

function generateUUID() {
    return randomUUID();
}

module.exports = { pool, testConnection, closePool, generateUUID };