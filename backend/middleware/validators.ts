/**
 * Middleware di validazione input
 */

import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware per gestire risultati validazione
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Errori di validazione',
            errors: errors.array()
        });
    }
    next();
}

/**
 * Validatori per clienti privati (TUTTI OPZIONALI - validazione solo se non vuoti)
 */
export const validateClientePrivato = [
    body('codice_fiscale').optional({ checkFalsy: true }).trim().isLength({ min: 16, max: 16 }).withMessage('Codice fiscale deve essere di 16 caratteri'),
    body('email_principale').optional({ checkFalsy: true }).isEmail().withMessage('Email principale non valida'),
    body('email_secondaria').optional({ checkFalsy: true }).isEmail().withMessage('Email secondaria non valida'),
    body('pec').optional({ checkFalsy: true }).isEmail().withMessage('PEC non valida'),
    body('cap_residenza').optional({ checkFalsy: true }).trim().isLength({ min: 5, max: 5 }).withMessage('CAP residenza deve essere di 5 cifre'),
    body('cap_fornitura').optional({ checkFalsy: true }).trim().isLength({ min: 5, max: 5 }).withMessage('CAP fornitura deve essere di 5 cifre'),
    body('iban').optional({ checkFalsy: true }).trim().isLength({ min: 27, max: 27 }).withMessage('IBAN non valido'),
    handleValidationErrors
];

/**
 * Validatori per clienti aziende (TUTTI OPZIONALI - validazione solo se non vuoti)
 */
export const validateClienteAzienda = [
    body('partita_iva').optional({ checkFalsy: true }).trim().isLength({ min: 11, max: 11 }).isNumeric().withMessage('Partita IVA deve essere di 11 cifre'),
    body('codice_fiscale').optional({ checkFalsy: true }).trim().isLength({ min: 11, max: 16 }).withMessage('Codice fiscale non valido'),
    body('pec_aziendale').optional({ checkFalsy: true }).isEmail().withMessage('PEC aziendale non valida'),
    body('email_referente').optional({ checkFalsy: true }).isEmail().withMessage('Email referente non valida'),
    body('cap_sede_legale').optional({ checkFalsy: true }).trim().isLength({ min: 5, max: 5 }).withMessage('CAP deve essere di 5 cifre'),
    handleValidationErrors
];

/**
 * Validatori per contratti luce
 */
export const validateContrattoLuce = [
    body('numero_contratto').trim().notEmpty().withMessage('Numero contratto obbligatorio'),
    body('pod').trim().isLength({ min: 14, max: 14 }).withMessage('POD deve essere di 14 caratteri'),
    body('fornitore').trim().notEmpty().withMessage('Fornitore obbligatorio'),
    body('data_attivazione').isDate().withMessage('Data attivazione non valida'),
    body('data_scadenza').isDate().withMessage('Data scadenza non valida'),
    body('potenza_impegnata').isFloat({ min: 0 }).withMessage('Potenza impegnata non valida'),
    body('prezzo_energia').isFloat({ min: 0 }).withMessage('Prezzo energia non valido'),
    handleValidationErrors
];

/**
 * Validatori per contratti gas
 */
export const validateContrattoGas = [
    body('numero_contratto').trim().notEmpty().withMessage('Numero contratto obbligatorio'),
    body('pdr').trim().isLength({ min: 14, max: 14 }).withMessage('PDR deve essere di 14 caratteri'),
    body('fornitore').trim().notEmpty().withMessage('Fornitore obbligatorio'),
    body('data_attivazione').isDate().withMessage('Data attivazione non valida'),
    body('data_scadenza').isDate().withMessage('Data scadenza non valida'),
    body('prezzo_gas').isFloat({ min: 0 }).withMessage('Prezzo gas non valido'),
    handleValidationErrors
];

/**
 * Validatori per offerte
 */
export const validateOfferta = [
    body('nome_offerta').trim().notEmpty().withMessage('Nome offerta obbligatorio'),
    body('fornitore').trim().notEmpty().withMessage('Fornitore obbligatorio'),
    body('tipo_energia').isIn(['luce', 'gas', 'dual']).withMessage('Tipo energia non valido'),
    body('data_inizio_validita').isDate().withMessage('Data inizio validità non valida'),
    body('data_fine_validita').isDate().withMessage('Data fine validità non valida'),
    body('target_clienti').isIn(['privati', 'aziende', 'entrambi']).withMessage('Target clienti non valido'),
    handleValidationErrors
];

/**
 * Validatori per email campaigns
 */
export const validateEmailCampaign = [
    body('nome_campagna').trim().notEmpty().withMessage('Nome campagna obbligatorio'),
    body('tipologia').isIn(['scadenza', 'promozionale', 'informativa', 'followup']).withMessage('Tipologia non valida'),
    body('template_id').isUUID().withMessage('Template ID non valido'),
    body('target_clienti').isIn(['privati', 'aziende', 'entrambi']).withMessage('Target clienti non valido'),
    handleValidationErrors
];

/**
 * Validatore UUID generico
 */
export const validateUUID = (paramName: string = 'id') => [
    param(paramName).isUUID().withMessage(`${paramName} non è un UUID valido`),
    handleValidationErrors
];

/**
 * Validatore flessibile per ID (accetta UUID, numerici o stringhe non vuote)
 */
export const validateFlexibleId = (paramName: string = 'id') => [
    param(paramName)
        .trim()
        .notEmpty().withMessage(`${paramName} obbligatorio`)
        .matches(/^[A-Za-z0-9\-]+$/).withMessage(`${paramName} contiene caratteri non validi`),
    handleValidationErrors
];

/**
 * Validatore paginazione
 */
export const validatePagination = [
    query('page').optional().isInt({ min: 1 }).withMessage('Pagina deve essere >= 1'),
    query('limit').optional().isInt({ min: 1, max: 5000 }).withMessage('Limit deve essere tra 1 e 5000'),
    handleValidationErrors
];

export default {
    handleValidationErrors,
    validateClientePrivato,
    validateClienteAzienda,
    validateContrattoLuce,
    validateContrattoGas,
    validateOfferta,
    validateEmailCampaign,
    validateUUID,
    validateFlexibleId,
    validatePagination,
};

