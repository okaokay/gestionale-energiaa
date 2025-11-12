/**
 * 📄 PDF Viewer con Compilazione Diretta
 * 
 * Mostra il PDF originale del fornitore e permette compilazione visuale
 */

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Setup worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
    pdfUrl: string;
    onFieldsDetected?: (fields: any[]) => void;
}

export default function PDFViewer({ pdfUrl, onFieldsDetected }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    
    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        console.log(`📄 PDF caricato: ${numPages} pagine`);
    }
    
    return (
        <div className="pdf-viewer-container border-2 border-gray-300 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="bg-gray-800 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                        disabled={pageNumber <= 1}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                    >
                        ← Prec
                    </button>
                    
                    <span className="text-sm">
                        Pagina {pageNumber} di {numPages}
                    </span>
                    
                    <button
                        onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                        disabled={pageNumber >= numPages}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                    >
                        Succ →
                    </button>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                        −
                    </button>
                    
                    <span className="text-sm">
                        {Math.round(scale * 100)}%
                    </span>
                    
                    <button
                        onClick={() => setScale(Math.min(2.0, scale + 0.1))}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                        +
                    </button>
                </div>
            </div>
            
            {/* PDF Content */}
            <div className="pdf-content bg-gray-100 overflow-auto" style={{ maxHeight: '70vh' }}>
                <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                        </div>
                    }
                    error={
                        <div className="text-center p-8 text-red-600">
                            <p className="font-bold">Errore caricamento PDF</p>
                            <p className="text-sm">Impossibile caricare il documento</p>
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                    />
                </Document>
            </div>
            
            {/* Info */}
            <div className="bg-blue-50 border-t border-blue-200 p-2 text-xs text-blue-800">
                💡 Questo è il modulo originale del fornitore. Compila i campi nella sezione accanto.
            </div>
        </div>
    );
}

