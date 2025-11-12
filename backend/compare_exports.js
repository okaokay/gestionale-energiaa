const fs = require('fs');
const path = require('path');

function readJson(p) {
  const full = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  const raw = fs.readFileSync(full, 'utf8');
  return JSON.parse(raw);
}

function safeLen(value) {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  return 0;
}

function extractMetrics(clientObj) {
  const d = clientObj?.data || clientObj;
  if (!d) return {};
  const contrattiLuce = safeLen(d?.contratti?.luce);
  const contrattiGas = safeLen(d?.contratti?.gas);
  const documenti = safeLen(d?.documenti);
  const email = safeLen(d?.comunicazioni?.email);
  const note = safeLen(d?.note);
  const storicoEventi = safeLen(d?.storico?.eventi);
  const storicoProcedure = safeLen(d?.storico?.procedure_contratti);
  const consensi = safeLen(d?.consensi_gdpr);
  const tasks = safeLen(d?.tasks);
  return {
    contratti_luce: contrattiLuce,
    contratti_gas: contrattiGas,
    documenti,
    email,
    note,
    storico_eventi: storicoEventi,
    storico_procedure: storicoProcedure,
    consensi_gdpr: consensi,
    tasks
  };
}

function compareMetrics(m1 = {}, m2 = {}) {
  const keys = Array.from(new Set([...Object.keys(m1), ...Object.keys(m2)]));
  const diffs = {};
  keys.forEach(k => {
    const a = m1[k] ?? 0;
    const b = m2[k] ?? 0;
    const diff = b - a;
    if (diff !== 0) {
      diffs[k] = { from: a, to: b, diff };
    }
  });
  return diffs;
}

function indexById(list = []) {
  const map = new Map();
  for (const c of list) {
    const id = c?.id || c?.cliente?.dati?.id;
    if (id) map.set(id, c);
  }
  return map;
}

function buildReport(summary, { onlyDiff = false } = {}) {
  const lines = [];
  lines.push('=== Confronto Export ===');
  lines.push(`Snapshot A: generated_at=${summary.aGeneratedAt}, clients=${summary.aCount}`);
  lines.push(`Snapshot B: generated_at=${summary.bGeneratedAt}, clients=${summary.bCount}`);
  lines.push('');
  lines.push(`Clienti confrontati: ${summary.clientsCompared}`);
  lines.push(`Clienti solo in A: ${summary.onlyInA.length}`);
  lines.push(`Clienti solo in B: ${summary.onlyInB.length}`);
  lines.push('');

  let changes = 0;
  for (const row of summary.rows) {
    const keys = Object.keys(row.diffs);
    if (onlyDiff && keys.length === 0) continue;
    if (keys.length > 0) changes++;
    const header = `• ${row.id} (${row.tipoA || row.tipoB || 'n/d'})`;
    lines.push(header);
    if (keys.length === 0) {
      if (!onlyDiff) lines.push('  - nessuna differenza');
      continue;
    }
    keys.forEach(k => {
      const d = row.diffs[k];
      const arrow = d.diff > 0 ? '↑' : '↓';
      lines.push(`  - ${k}: ${d.from} → ${d.to} (${arrow} ${d.diff})`);
    });
  }
  lines.push('');
  lines.push(`Totale clienti con cambiamenti: ${changes}`);
  return lines.join('\n');
}

function main() {
  const rawArgs = process.argv.slice(2);
  const options = { onlyDiff: false, outFile: null };
  const positional = [];
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--only-diff') {
      options.onlyDiff = true;
    } else if (arg === '--out') {
      const next = rawArgs[i + 1];
      if (!next || next.startsWith('--')) {
        console.error('Errore: --out richiede un percorso file');
        process.exit(1);
      }
      options.outFile = next;
      i++;
    } else {
      positional.push(arg);
    }
  }

  const [fileA, fileB] = positional;
  if (!fileA || !fileB) {
    console.log('Uso: node backend/compare_exports.js [--only-diff] [--out <report.txt>] <fileA.json> <fileB.json>');
    console.log('Esempio: node backend/compare_exports.js --only-diff --out diff_export_report.txt clienti_completi_export.json backup/clienti_completi_export_2025-10-30.json');
    process.exit(1);
  }

  const a = readJson(fileA);
  const b = readJson(fileB);

  const listA = a?.clients || a?.data || [];
  const listB = b?.clients || b?.data || [];

  const mapA = indexById(listA);
  const mapB = indexById(listB);

  const ids = new Set([...mapA.keys(), ...mapB.keys()]);
  const rows = [];
  const onlyInA = [];
  const onlyInB = [];

  for (const id of ids) {
    const ca = mapA.get(id);
    const cb = mapB.get(id);
    if (!ca && cb) { onlyInB.push(id); continue; }
    if (!cb && ca) { onlyInA.push(id); continue; }
    const mA = extractMetrics(ca);
    const mB = extractMetrics(cb);
    const diffs = compareMetrics(mA, mB);
    rows.push({ id, tipoA: ca?.tipo, tipoB: cb?.tipo, diffs });
  }

  const summary = {
    aGeneratedAt: a?.generated_at || a?.data?.generated_at || 'n/d',
    bGeneratedAt: b?.generated_at || b?.data?.generated_at || 'n/d',
    aCount: listA.length,
    bCount: listB.length,
    clientsCompared: rows.length,
    onlyInA,
    onlyInB,
    rows
  };

  const report = buildReport(summary, { onlyDiff: options.onlyDiff });
  if (options.outFile) {
    const outPath = path.isAbsolute(options.outFile) ? options.outFile : path.join(process.cwd(), options.outFile);
    fs.writeFileSync(outPath, report, 'utf8');
    console.log(`Report scritto in: ${outPath}`);
  } else {
    console.log(report);
  }
}

main();