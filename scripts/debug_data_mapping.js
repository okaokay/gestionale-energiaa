'use strict';
const XLSX = require('xlsx');
const path = require('path');

const INPUT_XLSX = path.resolve(__dirname, '..', 'esempio import cvs.xlsx');

function main() {
  const wb = XLSX.readFile(INPUT_XLSX);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  console.log('=== ANALISI DETTAGLIATA MAPPING ===');
  
  const systemHeaders = rows[0] || [];
  const supplierHeaders = rows[2] || [];
  const firstDataRow = rows[3] || [];
  
  console.log('\n--- INTESTAZIONI SISTEMA (riga 0) ---');
  systemHeaders.forEach((header, index) => {
    if (header && header.trim()) {
      console.log(`[${index}] "${header}" -> dato: "${firstDataRow[index] || 'VUOTO'}"`);
    }
  });
  
  console.log('\n--- INTESTAZIONI FORNITORE (riga 2) ---');
  supplierHeaders.forEach((header, index) => {
    if (header && header.trim()) {
      console.log(`[${index}] "${header}" -> dato: "${firstDataRow[index] || 'VUOTO'}"`);
    }
  });
  
  console.log('\n--- PRIMA RIGA DATI (riga 3) ---');
  firstDataRow.forEach((value, index) => {
    if (value && String(value).trim()) {
      const systemHeader = systemHeaders[index] || '';
      const supplierHeader = supplierHeaders[index] || '';
      console.log(`[${index}] "${value}" <- sistema:"${systemHeader}" fornitore:"${supplierHeader}"`);
    }
  });
}

if (require.main === module) {
  main();
}