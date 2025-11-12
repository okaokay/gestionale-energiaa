/**
 * API Routes - Sistema Documenti Cliente
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configurazione upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const categoria = req.body.categoria || 'altro';
        const dir = `uploads/documenti/${categoria}`;
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        const allowed = /pdf|jpg|jpeg|png|doc|docx|xls|xlsx/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) {
            cb(null, true);
        } else {
            cb(new Error('Formato non supportato'));
        }
    }
});

router.use(authenticate);

/**
 * GET /api/documenti/cliente/:tipo/:id
 */
router.get('/cliente/:tipo/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipo, id } = req.params;
        const clienteTipo = tipo === 'privati' ? 'privato' : 'azienda';
        
        const docs = await pool.query(`
            SELECT 
                d.*,
                u.nome || ' ' || u.cognome as uploaded_by_name
            FROM clienti_documenti d
            LEFT JOIN users u ON d.uploaded_by = u.id
            WHERE d.cliente_id = ? AND d.cliente_tipo = ?
            ORDER BY d.created_at DESC
        `, [id, clienteTipo]);
        
        res.json({ success: true, data: docs.rows });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/documenti/upload
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Nessun file' });
        }

        const { cliente_id, cliente_tipo, categoria, descrizione, data_scadenza } = req.body;
        const user = req.user as any;

        await pool.query(`
            INSERT INTO clienti_documenti 
            (cliente_id, cliente_tipo, categoria, nome_file, nome_originale, tipo_file, dimensione, percorso, descrizione, data_scadenza, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            cliente_id,
            cliente_tipo,
            categoria,
            req.file.filename,
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            req.file.path,
            descrizione || null,
            data_scadenza || null,
            user?.id || null
        ]);

        res.json({ success: true, message: 'Documento caricato' });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        next(error);
    }
});

/**
 * GET /api/documenti/:id/download
 */
router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const doc = await pool.query(`SELECT * FROM clienti_documenti WHERE id = ?`, [req.params.id]);
        
        const documento = doc.rows[0] as any;
        
        if (!documento) {
            return res.status(404).json({ success: false, message: 'Documento non trovato' });
        }

        const filePath = documento.percorso;
        res.download(filePath, documento.nome_originale);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/documenti/:id
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const doc = await pool.query(`SELECT * FROM clienti_documenti WHERE id = ?`, [req.params.id]);
        
        const documento = doc.rows[0] as any;
        
        if (documento) {
            fs.unlinkSync(documento.percorso);
        }

        await pool.query(`DELETE FROM clienti_documenti WHERE id = ?`, [req.params.id]);
        
        res.json({ success: true, message: 'Documento eliminato' });
    } catch (error) {
        next(error);
    }
});

export default router;
