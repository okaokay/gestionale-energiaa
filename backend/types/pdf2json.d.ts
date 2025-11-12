// Type definitions for pdf2json
declare module 'pdf2json' {
  class PDFParser {
    constructor(context?: any, needRawText?: number);
    on(event: 'pdfParser_dataReady', handler: (pdfData: any) => void): void;
    on(event: 'pdfParser_dataError', handler: (err: Error) => void): void;
    loadPDF(pdfFilePath: string): void;
  }
  
  export = PDFParser;
}


