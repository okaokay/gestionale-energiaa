/**
 * PDF Context Extractor - Sistema avanzato di estrazione contesto campi PDF
 * Ispirato a Ai-pdf-form-filler, usa pdf2json per estrarre coordinate e testo
 */

import { PDFDocument } from 'pdf-lib';
import PDFParser from 'pdf2json';
import fs from 'fs/promises';
import path from 'path';

interface TextWithPosition {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

// Esporta il tipo per usarlo in altri moduli
export interface FieldContext {
  fieldName: string;
  fieldType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  contextBefore: string; // Testo prima del campo (label)
  contextAfter: string;  // Testo dopo del campo
  contextAbove: string;  // Testo sopra il campo
  contextBelow: string;  // Testo sotto il campo
  nearbyText: string[];  // Tutto il testo vicino
}

export interface ExtractedPDFData {
  fields: FieldContext[];
  fullText: string;
  totalFields: number;
}

/**
 * Estrae tutto il testo dal PDF con le coordinate usando pdf2json
 */
async function extractTextWithCoordinates(pdfPath: string): Promise<TextWithPosition[]> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)(null, 1);
    const textItems: TextWithPosition[] = [];

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        // Estrai testo da ogni pagina
        if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
          pdfData.Pages.forEach((page: any, pageIndex: number) => {
            if (page.Texts && Array.isArray(page.Texts)) {
              page.Texts.forEach((textItem: any) => {
                if (textItem.R && Array.isArray(textItem.R)) {
                  textItem.R.forEach((run: any) => {
                    if (run.T) {
                      textItems.push({
                        text: decodeURIComponent(run.T),
                        x: textItem.x,
                        y: textItem.y,
                        width: textItem.w || 0,
                        height: textItem.h || 0,
                        page: pageIndex
                      });
                    }
                  });
                }
              });
            }
          });
        }
        resolve(textItems);
      } catch (error) {
        reject(error);
      }
    });

    pdfParser.on('pdfParser_dataError', (err: Error) => {
      reject(err);
    });

    pdfParser.loadPDF(pdfPath);
  });
}

/**
 * Trova il testo vicino a un campo PDF in base alle coordinate
 */
function findNearbyText(
  fieldX: number,
  fieldY: number,
  fieldWidth: number,
  fieldHeight: number,
  fieldPage: number,
  allText: TextWithPosition[],
  searchRadius: number = 5
): {
  contextBefore: string;
  contextAfter: string;
  contextAbove: string;
  contextBelow: string;
  nearbyText: string[];
} {
  // Filtra testo nella stessa pagina
  const pageText = allText.filter(t => t.page === fieldPage);

  // Testo sulla stessa riga (a sinistra - label principale)
  const textBefore = pageText
    .filter(t => 
      Math.abs(t.y - fieldY) < 2 && // Stessa riga
      t.x < fieldX && // A sinistra
      (fieldX - t.x) < searchRadius // Entro il raggio
    )
    .sort((a, b) => b.x - a.x) // Ordina dal più vicino
    .slice(0, 5)
    .map(t => t.text)
    .reverse()
    .join(' ');

  // Testo dopo (a destra)
  const textAfter = pageText
    .filter(t =>
      Math.abs(t.y - fieldY) < 2 &&
      t.x > (fieldX + fieldWidth) &&
      (t.x - (fieldX + fieldWidth)) < searchRadius
    )
    .sort((a, b) => a.x - b.x)
    .slice(0, 3)
    .map(t => t.text)
    .join(' ');

  // Testo sopra (label alternativa)
  const textAbove = pageText
    .filter(t =>
      Math.abs(t.x - fieldX) < fieldWidth + 2 && // Allineato verticalmente
      t.y < fieldY && // Sopra
      (fieldY - t.y) < searchRadius
    )
    .sort((a, b) => b.y - a.y)
    .slice(0, 3)
    .map(t => t.text)
    .join(' ');

  // Testo sotto
  const textBelow = pageText
    .filter(t =>
      Math.abs(t.x - fieldX) < fieldWidth + 2 &&
      t.y > (fieldY + fieldHeight) &&
      (t.y - (fieldY + fieldHeight)) < searchRadius
    )
    .sort((a, b) => a.y - b.y)
    .slice(0, 3)
    .map(t => t.text)
    .join(' ');

  // Tutto il testo nelle vicinanze
  const nearby = pageText
    .filter(t => {
      const dx = Math.abs(t.x - fieldX);
      const dy = Math.abs(t.y - fieldY);
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < searchRadius;
    })
    .map(t => t.text);

  return {
    contextBefore: textBefore.trim(),
    contextAfter: textAfter.trim(),
    contextAbove: textAbove.trim(),
    contextBelow: textBelow.trim(),
    nearbyText: nearby.filter(t => t.trim().length > 0)
  };
}

/**
 * Estrae campi PDF con contesto completo
 */
export async function extractPDFFieldsWithContext(pdfPath: string): Promise<ExtractedPDFData> {
  console.log(`🔍 === ANALISI AVANZATA PDF CON CONTESTO ===`);
  console.log(`📄 File: ${pdfPath}`);

  // 1. Estrai campi interattivi con pdf-lib
  const pdfBytes = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const pdfFields = form.getFields();

  console.log(`✅ Estratti ${pdfFields.length} campi interattivi`);

  // 2. Estrai tutto il testo con coordinate usando pdf2json
  console.log(`🔍 Estrazione testo con coordinate...`);
  const textWithCoordinates = await extractTextWithCoordinates(pdfPath);
  const fullText = textWithCoordinates.map(t => t.text).join(' ');
  
  console.log(`✅ Estratte ${textWithCoordinates.length} porzioni di testo posizionale`);

  // 3. Per ogni campo, trova il contesto
  const fieldsWithContext: FieldContext[] = [];

  for (const field of pdfFields) {
    const fieldName = field.getName();
    const fieldType = field.constructor.name; // PDFTextField, PDFCheckBox, etc.
    
    // Ottieni coordinate del campo (approssimate)
    const widgets = (field as any).acroField.getWidgets();
    if (widgets && widgets.length > 0) {
      const widget = widgets[0];
      const rect = widget.getRectangle();
      
      // Coordinate normalizzate (pdf2json usa coordinate diverse)
      const fieldX = rect.x / 72; // Converti da punti a pollici
      const fieldY = rect.y / 72;
      const fieldWidth = rect.width / 72;
      const fieldHeight = rect.height / 72;
      const fieldPage = 0; // Per semplicità, assumiamo prima pagina (da migliorare)

      // Trova testo vicino
      const context = findNearbyText(
        fieldX,
        fieldY,
        fieldWidth,
        fieldHeight,
        fieldPage,
        textWithCoordinates,
        10 // Raggio di ricerca
      );

      fieldsWithContext.push({
        fieldName,
        fieldType,
        x: fieldX,
        y: fieldY,
        width: fieldWidth,
        height: fieldHeight,
        page: fieldPage,
        ...context
      });

      console.log(`📍 Campo: ${fieldName}`);
      console.log(`   Label/Contesto: "${context.contextBefore || context.contextAbove || 'N/A'}"`);
    }
  }

  console.log(`✅ Analisi completata: ${fieldsWithContext.length} campi con contesto`);

  return {
    fields: fieldsWithContext,
    fullText,
    totalFields: fieldsWithContext.length
  };
}
