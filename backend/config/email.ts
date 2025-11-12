/**
 * Configurazione Email Marketing System
 * Brevo SMTP + BullMQ + Redis
 * Configurazioni caricate dal DATABASE (non da .env)
 */

import * as dotenv from 'dotenv';
import { pool } from './database';
dotenv.config();

// Cache configurazioni in memoria
let configCache: any = null;
let lastCacheUpdate: number = 0;
const CACHE_TTL = 60000; // 1 minuto

/**
 * Carica configurazioni dal database
 */
export async function loadConfigFromDB(): Promise<any> {
    try {
        // Usa cache se recente
        if (configCache && Date.now() - lastCacheUpdate < CACHE_TTL) {
            return configCache;
        }

        const result = await pool.query('SELECT chiave, valore FROM configurazioni');
        
        const config: any = {};
        for (const row of result.rows) {
            const r = row as any;
            config[r.chiave] = r.valore;
        }
        
        // Aggiorna cache
        configCache = config;
        lastCacheUpdate = Date.now();
        
        return config;
    } catch (error) {
        console.warn('⚠️  Impossibile caricare configurazioni dal DB, uso .env come fallback');
        return {};
    }
}

/**
 * Ottiene un valore di configurazione dal DB o .env
 */
export async function getConfig(key: string, defaultValue: string = ''): Promise<string> {
    const dbConfig = await loadConfigFromDB();
    return dbConfig[key] || process.env[key.toUpperCase()] || defaultValue;
}

/**
 * Ottiene configurazioni email aggiornate
 */
export async function getEmailConfig() {
    const dbConfig = await loadConfigFromDB();
    
    return {
    // ═══════════════════════════════════════════════════
    // BREVO (ex Sendinblue) SMTP Configuration
    // ═══════════════════════════════════════════════════
    brevo: {
        host: dbConfig.brevo_smtp_host || process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(dbConfig.brevo_smtp_port || process.env.BREVO_SMTP_PORT || '587'),
        secure: false, // true per porta 465, false per 587
        auth: {
            user: dbConfig.brevo_smtp_user || process.env.BREVO_SMTP_USER || '',
            pass: dbConfig.brevo_smtp_pass || process.env.BREVO_SMTP_PASS || ''
        }
    },

    // API Key Brevo (per tracking e webhook)
    brevoApiKey: dbConfig.brevo_api_key || process.env.BREVO_API_KEY || '',

    // ═══════════════════════════════════════════════════
    // REDIS Configuration (per BullMQ)
    // ═══════════════════════════════════════════════════
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null, // Richiesto da BullMQ
    },

    // ═══════════════════════════════════════════════════
    // EMAIL SENDING LIMITS (Brevo Free Tier = 300/giorno)
    // ═══════════════════════════════════════════════════
    limits: {
        dailyLimit: parseInt(dbConfig.email_daily_limit || process.env.EMAIL_DAILY_LIMIT || '300'),
        hourlyLimit: parseInt(process.env.EMAIL_HOURLY_LIMIT || '50'),
        perMinute: parseInt(process.env.EMAIL_PER_MINUTE || '10'),
        retryAttempts: 3, // Tentativi di reinvio su errore
        retryDelay: 60000 // Delay tra retry (ms)
    },

    // ═══════════════════════════════════════════════════
    // SENDER CONFIGURATION
    // ═══════════════════════════════════════════════════
    defaultSender: {
        name: dbConfig.email_sender_name || process.env.EMAIL_SENDER_NAME || 'Gestionale Energia',
        email: dbConfig.email_sender_address || process.env.EMAIL_SENDER_ADDRESS || 'noreply@gestionale-energia.it'
    },

    // ═══════════════════════════════════════════════════
    // AGENZIA INFO (per template)
    // ═══════════════════════════════════════════════════
    agenzia: {
        nome: dbConfig.agenzia_nome || process.env.AGENZIA_NOME || 'Gestionale Energia',
        email: dbConfig.agenzia_email || process.env.AGENZIA_EMAIL || 'info@gestionale-energia.it',
        telefono: dbConfig.agenzia_telefono || process.env.AGENZIA_TELEFONO || '+39 02 1234567',
        indirizzo: dbConfig.agenzia_indirizzo || 'Via Roma 1, 00100 Roma',
        website: process.env.AGENZIA_WEBSITE || 'https://gestionale-energia.it'
    },

    // ═══════════════════════════════════════════════════
    // URLS (per link nelle email)
    // ═══════════════════════════════════════════════════
    urls: {
        frontend: dbConfig.frontend_url || process.env.FRONTEND_URL || 'http://localhost:5173',
        backend: process.env.BACKEND_URL || 'http://localhost:3001',
        unsubscribe: `${dbConfig.frontend_url || process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe`
    },

    // ═══════════════════════════════════════════════════
    // QUEUE CONFIGURATION
    // ═══════════════════════════════════════════════════
    queues: {
        campaigns: {
            name: 'email-campaigns',
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 60000 // 1 minuto
                },
                removeOnComplete: 100, // Mantieni ultimi 100 job completati
                removeOnFail: 50 // Mantieni ultimi 50 job falliti
            }
        },
        expiryAlerts: {
            name: 'expiry-alerts',
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 120000 // 2 minuti
                },
                removeOnComplete: 200,
                removeOnFail: 100
            }
        }
    },

    // ═══════════════════════════════════════════════════
    // CRON SCHEDULE
    // ═══════════════════════════════════════════════════
    cron: {
        expiryAlerts: process.env.CRON_EXPIRY_ALERTS || '0 9 * * *', // Ogni giorno alle 09:00
        enabled: process.env.CRON_ENABLED !== 'false' // Default: true
    },

    // ═══════════════════════════════════════════════════
    // TEMPLATE PLACEHOLDERS DEFAULTS
    // ═══════════════════════════════════════════════════
    placeholders: {
        nome_agenzia: dbConfig.agenzia_nome || process.env.AGENZIA_NOME || 'Gestionale Energia',
        email_contatto: dbConfig.agenzia_email || process.env.AGENZIA_EMAIL || 'info@gestionale-energia.it',
        telefono_contatto: dbConfig.agenzia_telefono || process.env.AGENZIA_TELEFONO || '+39 02 1234567',
        link_dashboard: dbConfig.frontend_url || process.env.FRONTEND_URL || 'http://localhost:5173',
        link_offerte: `${dbConfig.frontend_url || process.env.FRONTEND_URL || 'http://localhost:5173'}/offerte`
    }
    };
}

// Mantieni export sincrono per compatibilità (usa cache o .env)
export const emailConfig = {
    brevo: {
        host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.BREVO_SMTP_USER || '',
            pass: process.env.BREVO_SMTP_PASS || ''
        }
    },
    brevoApiKey: process.env.BREVO_API_KEY || '',
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
    },
    limits: {
        dailyLimit: parseInt(process.env.EMAIL_DAILY_LIMIT || '300'),
        hourlyLimit: parseInt(process.env.EMAIL_HOURLY_LIMIT || '50'),
        perMinute: parseInt(process.env.EMAIL_PER_MINUTE || '10'),
        retryAttempts: 3,
        retryDelay: 60000
    },
    defaultSender: {
        name: process.env.EMAIL_SENDER_NAME || 'Gestionale Energia',
        email: process.env.EMAIL_SENDER_ADDRESS || 'noreply@gestionale-energia.it'
    },
    agenzia: {
        nome: process.env.AGENZIA_NOME || 'Gestionale Energia',
        email: process.env.AGENZIA_EMAIL || 'info@gestionale-energia.it',
        telefono: process.env.AGENZIA_TELEFONO || '+39 02 1234567',
        website: process.env.AGENZIA_WEBSITE || 'https://gestionale-energia.it'
    },
    urls: {
        frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
        backend: process.env.BACKEND_URL || 'http://localhost:3001',
        unsubscribe: process.env.UNSUBSCRIBE_URL || 'http://localhost:5173/unsubscribe'
    },
    queues: {
        campaigns: {
            name: 'email-campaigns',
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential' as const,
                    delay: 60000
                },
                removeOnComplete: 100,
                removeOnFail: 50
            }
        },
        expiryAlerts: {
            name: 'expiry-alerts',
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential' as const,
                    delay: 120000
                },
                removeOnComplete: 200,
                removeOnFail: 100
            }
        }
    },
    cron: {
        expiryAlerts: process.env.CRON_EXPIRY_ALERTS || '0 9 * * *',
        enabled: process.env.CRON_ENABLED !== 'false'
    },
    placeholders: {
        nome_agenzia: process.env.AGENZIA_NOME || 'Gestionale Energia',
        email_contatto: process.env.AGENZIA_EMAIL || 'info@gestionale-energia.it',
        telefono_contatto: process.env.AGENZIA_TELEFONO || '+39 02 1234567',
        link_dashboard: process.env.FRONTEND_URL || 'http://localhost:5173',
        link_offerte: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/offerte`
    }
};

// ═══════════════════════════════════════════════════
// VALIDAZIONE CONFIGURAZIONE
// ═══════════════════════════════════════════════════
export function validateEmailConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Controlla Brevo SMTP
    if (!emailConfig.brevo.auth.user) {
        errors.push('❌ BREVO_SMTP_USER non configurato in .env');
    }
    if (!emailConfig.brevo.auth.pass) {
        errors.push('❌ BREVO_SMTP_PASS non configurato in .env');
    }

    // Controlla Redis
    if (!emailConfig.redis.host) {
        errors.push('❌ REDIS_HOST non configurato');
    }

    // Warning per limiti
    if (emailConfig.limits.dailyLimit > 300) {
        errors.push('⚠️  WARNING: Daily limit > 300 (Brevo free tier limit)');
    }

    return {
        valid: errors.filter(e => e.startsWith('❌')).length === 0,
        errors
    };
}

// ═══════════════════════════════════════════════════
// HELPER: Ottieni info configurazione per log
// ═══════════════════════════════════════════════════
export function getEmailConfigInfo(): string {
    return `
╔═══════════════════════════════════════════════════════╗
║        EMAIL MARKETING SYSTEM - CONFIGURAZIONE        ║
╠═══════════════════════════════════════════════════════╣
║ BREVO SMTP:                                           ║
║   Host: ${emailConfig.brevo.host.padEnd(45)}║
║   Port: ${String(emailConfig.brevo.port).padEnd(45)}║
║   User: ${(emailConfig.brevo.auth.user || 'NON CONFIGURATO').padEnd(45)}║
║                                                       ║
║ REDIS:                                                ║
║   Host: ${emailConfig.redis.host}:${emailConfig.redis.port}${' '.repeat(38)}║
║                                                       ║
║ LIMITI:                                               ║
║   Giornaliero: ${emailConfig.limits.dailyLimit} email/giorno${' '.repeat(26)}║
║   Orario: ${emailConfig.limits.hourlyLimit} email/ora${' '.repeat(32)}║
║   Al minuto: ${emailConfig.limits.perMinute} email/min${' '.repeat(31)}║
║                                                       ║
║ MITTENTE:                                             ║
║   Nome: ${emailConfig.defaultSender.name.padEnd(43)}║
║   Email: ${emailConfig.defaultSender.email.padEnd(42)}║
╚═══════════════════════════════════════════════════════╝
    `.trim();
}

