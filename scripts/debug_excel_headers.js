'use strict';
const XLSX = require('xlsx');
const path = require('path');

const INPUT_XLSX = path.resolve(__dirname, '..', 'esempio import cvs.xlsx');

function main() {
  const wb = XLSX.readFile(INPUT_XLSX);
  
  console.log('=== ANALISI EXCEL ===');
  console.log('Fogli trovati:', wb.SheetNames);
  
  for (const sheetName of wb.SheetNames) {
    console.log(`\n--- FOGLIO: ${sheetName} ---`);
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    if (rows.length > 0) {
      console.log('Intestazioni originali:');
      rows[0].forEach((header, index) => {
        console.log(`  [${index}] "${header}"`);
      });
      
      if (rows.length > 1) {
        console.log('\nPrime 3 righe di dati:');
        for (let r = 1; r <= Math.min(3, rows.length - 1); r++) {
          console.log(`\n--- Riga ${r} ---`);
          rows[r].forEach((value, index) => {
            if (value && String(value).trim()) {
              console.log(`  [${index}] "${value}"`);
            }
          });
        }
      }
      
      console.log(`\nTotale righe: ${rows.length}`);
      console.log(`Totale colonne: ${rows[0].length}`);
    }
  }
}

if (require.main === module) {
  main();
}