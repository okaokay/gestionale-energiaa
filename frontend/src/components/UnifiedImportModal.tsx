import { useState } from 'react';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { unifiedImportAPI } from '../services/api';

interface UnifiedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function UnifiedImportModal({ isOpen, onClose, onImportComplete }: UnifiedImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [autoDetectType, setAutoDetectType] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importId, setImportId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setImportId(null);
    setResult(null);
  };

  const startImport = async () => {
    if (!file) {
      toast.error('Seleziona un file CSV da importare');
      return;
    }
    setUploading(true);
    setImportId(null);
    setResult(null);
    try {
      const { data } = await unifiedImportAPI.upload(file, { dryRun, autoDetectType });
      if (!data?.success) {
        throw new Error(data?.message || 'Errore upload import');
      }
      const id = data?.data?.importId || data?.importId;
      setImportId(id);
      toast.success('Import avviato');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Errore durante l\'import');
    } finally {
      setUploading(false);
    }
  };

  const fetchResult = async () => {
    if (!importId) return;
    try {
      const { data } = await unifiedImportAPI.result(importId);
      if (!data?.success) {
        throw new Error(data?.message || 'Errore risultato import');
      }
      setResult(data.data);
      const ok = data.data?.success && (data.data?.processed ?? 0) > 0;
      if (ok && !dryRun) {
        onImportComplete();
      }
      toast.success('Risultato import ottenuto');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Errore ottenendo il risultato');
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportId(null);
    setResult(null);
    setUploading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10000]">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
            <Upload size={24} /> Import Unificato (beta)
          </h2>
          <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
            <X size={22} />
          </button>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4 text-sm text-blue-700">
          <div className="flex items-center gap-2 font-semibold mb-1"><AlertCircle size={18} /> Istruzioni rapide</div>
          <div>
            Carica un file <strong>CSV</strong> con colonne <code>tipo_record</code>, dati cliente e contratti (luce/gas).
            Il sistema può rilevare automaticamente il tipo record.
          </div>
          <div className="mt-1">
            Suggerito: usa <code>combined_unified.csv</code> generato dallo script di unione, oppure un CSV che includa
            almeno <code>codice_fiscale</code>/<code>email_principale</code> per i clienti e <code>pod</code>/<code>pdr</code> o <code>commodity</code> per i contratti.
          </div>
          <div className="mt-2">
            <a
              href="/docs/import"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
              title="Apri documentazione Import Unificato"
            >
              Apri documentazione
            </a>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
          />

          <div className="flex items-center gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              <span>Dry run (non scrive su DB)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={autoDetectType} onChange={(e) => setAutoDetectType(e.target.checked)} />
              <span>Rileva automaticamente tipo record</span>
            </label>
          </div>
        </div>

        {importId && (
          <div className="mb-3 text-sm">
            <div className="font-semibold">Import ID:</div>
            <div className="font-mono break-all">{importId}</div>
          </div>
        )}

        {result && (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold mb-2"><CheckCircle size={18} className="text-green-600" /> Risultato</div>
            <div>Righe totali: <strong>{result.totalRows}</strong></div>
            <div>Processate: <strong>{result.processed}</strong></div>
            <div>Inseriti — Clienti Privati: <strong>{result.inserted?.clienti_privati}</strong>, Luce: <strong>{result.inserted?.contratti_luce}</strong>, Gas: <strong>{result.inserted?.contratti_gas}</strong></div>
            {Array.isArray(result.errors) && result.errors.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold text-red-700">Errori:</div>
                <div className="max-h-32 overflow-y-auto bg-white p-2 rounded border">
                  {result.errors.map((e: any, idx: number) => (
                    <div key={idx} className="text-red-700">Riga {e.row}: {e.error}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <button
            onClick={startImport}
            disabled={uploading || !file}
            className="btn bg-blue-600 hover:bg-blue-700 text-white flex-1"
          >
            {uploading ? 'Caricamento...' : 'Avvia Import'}
          </button>
          <button
            onClick={fetchResult}
            disabled={!importId}
            className="btn btn-secondary"
          >
            Mostra Risultato
          </button>
          <button onClick={handleClose} className="btn bg-gray-500 hover:bg-gray-600 text-white">Chiudi</button>
        </div>
      </div>
    </div>
  );
}
