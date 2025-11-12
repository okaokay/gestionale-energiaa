/**
 * Modal per importazione massiva clienti da CSV/Excel
 */

import { useState } from 'react';
import { X, Upload, FileText, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImportClientiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
}

export default function ImportClientiModal({ isOpen, onClose, onImportComplete }: ImportClientiModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const validTypes = [
                'text/csv',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain'
            ];
            
            if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xls|xlsx)$/i)) {
                toast.error('Formato file non valido. Usa CSV o Excel.');
                return;
            }
            
            setFile(selectedFile);
            setResult(null);
        }
    };

    const handleImport = async () => {
        if (!file) {
            toast.error('Seleziona un file da importare');
            return;
        }

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
    const response = await fetch('/api/clienti/import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Errore durante l\'importazione');
            }

            const data = await response.json();
            setResult(data.data);
            
            toast.success(`✅ Importati ${data.data.imported} clienti su ${data.data.total}`);
            
            if (data.data.imported > 0) {
                onImportComplete();
            }
        } catch (error: any) {
            console.error('Errore importazione:', error);
            toast.error(error.message || 'Errore durante l\'importazione');
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const csvContent = `tipo,nome,cognome,email_principale,telefono_mobile,codice_fiscale,codice_cliente,data_nascita,luogo_nascita,provincia_nascita,email_secondaria,telefono_fisso,via,numero_civico,citta,cap,provincia,nazione,consenso_marketing,news_letter,utente_acquisizione,note,ragione_sociale,partita_iva,codice_ateco,pec,codice_sdi,nome_referente,cognome_referente,email_referente,telefono_referente,tipo_contratto,numero_contratto,pod_pdr,fornitore,commodity,procedure,pdp,data_stipula,data_attivazione,data_scadenza,agente,nome_offerta,tipo_offerta,validita_offerta,stato_contratto,prezzo,note_contratto
privato,Mario,Rossi,mario.rossi@email.it,3331234567,RSSMRA80A01H501U,CLI001,1980-01-01,Roma,RM,mario.r@email.it,0612345678,Via Roma,10,Roma,00100,RM,Italia,1,1,Giovanni Bianchi,Cliente VIP,,,,,,,,,luce,LUCE123456,IT001E12345678,Enel,Luce,Switch,PDP001,2024-01-15,2024-02-01,2026-02-01,Giovanni Bianchi,Offerta Luce Flex,Domestico,2026-01-31,attivo,0.25,Contratto vantaggioso
privato,Lucia,Bianchi,lucia.b@gmail.com,3339876543,,CLI002,,,,,,,Via Milano,25,Milano,20100,MI,Italia,0,0,,,,,,,,,,,,,,,,,,,,,,,,,
azienda,,,info@azienda.it,,,CLI003,,,,,,,Via Torino,15,Torino,10100,TO,Italia,1,1,Maria Neri,Nota azienda,Azienda SRL,12345678901,47.11.20,pec@azienda.it,ABCDEFG,Giovanni,Verdi,g.verdi@azienda.it,3331112222,gas,GAS789012,IT002G98765432,Eni,Gas,Voltura,PDP002,2024-03-10,2024-04-01,2027-04-01,Maria Neri,Offerta Gas Business,Business,2027-03-31,attivo,0.75,Contratto aziendale
privato,Paolo,Neri,paolo.neri@libero.it,3334445566,,,,,,,,,,,,,Italia,1,0,,,,,,,,,,,,,,,,,,,,,,,`;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'template_import_completo.csv';
        link.click();
        
        toast.success('📥 Template scaricato!');
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10000]">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* HEADER */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-blue-800 flex items-center gap-3">
                        <Upload size={28} /> Importa Clienti da CSV/Excel
                    </h2>
                    <button onClick={handleClose} className="text-gray-600 hover:text-gray-900 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* ISTRUZIONI */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                        <AlertCircle size={20} /> Istruzioni
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Formati supportati: <strong>CSV, XLS, XLSX</strong></li>
                        <li>• <strong>Campi obbligatori CLIENTE:</strong> tipo, nome+cognome o ragione_sociale, email</li>
                        <li>• <strong>Campi opzionali CLIENTE:</strong> codice_cliente, codice_fiscale, codice_ateco (solo aziende), consenso_marketing (1/0), news_letter (1/0), utente_acquisizione, note</li>
                        <li>• <strong>Campi opzionali CONTRATTO:</strong> tipo_contratto (luce/gas), numero_contratto, pod_pdr, fornitore, commodity, procedure, pdp, data_stipula, data_attivazione, data_scadenza, agente, nome_offerta, tipo_offerta, validita_offerta, stato_contratto, prezzo, note_contratto</li>
                        <li>• Se compili <strong>tipo_contratto + fornitore</strong> → verrà creato anche il contratto!</li>
                        <li>• <strong>Tutti i campi sono opzionali</strong> (tranne quelli obbligatori cliente)</li>
                        <li>• <strong>Novità:</strong> codice_cliente, commodity, procedure, pdp, tipo_offerta, news_letter, utente_acquisizione</li>
                    </ul>
                </div>

                {/* DOWNLOAD TEMPLATE */}
                <button
                    onClick={downloadTemplate}
                    className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 mb-6 w-full justify-center"
                >
                    <Download size={20} />
                    Scarica Template CSV
                </button>

                {/* UPLOAD FILE */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleziona File da Importare
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                        <input
                            type="file"
                            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                            {file ? (
                                <p className="text-lg text-green-600 font-semibold">{file.name}</p>
                            ) : (
                                <>
                                    <p className="text-lg text-gray-600 mb-2">Clicca per selezionare un file</p>
                                    <p className="text-sm text-gray-400">o trascina qui il file</p>
                                </>
                            )}
                        </label>
                    </div>
                </div>

                {/* RISULTATI */}
                {result && (
                    <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <h3 className="font-bold text-lg mb-4">Risultato Importazione</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-100 p-4 rounded-lg text-center">
                                <p className="text-3xl font-bold text-blue-600">{result.total}</p>
                                <p className="text-sm text-blue-700">Righe Totali</p>
                            </div>
                            <div className="bg-green-100 p-4 rounded-lg text-center">
                                <CheckCircle size={24} className="mx-auto mb-2 text-green-600" />
                                <p className="text-3xl font-bold text-green-600">{result.imported}</p>
                                <p className="text-sm text-green-700">Importati</p>
                            </div>
                            <div className="bg-red-100 p-4 rounded-lg text-center">
                                <XCircle size={24} className="mx-auto mb-2 text-red-600" />
                                <p className="text-3xl font-bold text-red-600">{result.errors}</p>
                                <p className="text-sm text-red-700">Errori</p>
                            </div>
                        </div>

                        {result.errorDetails && result.errorDetails.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-red-700 mb-2">Dettaglio Errori:</h4>
                                <div className="max-h-40 overflow-y-auto bg-white p-3 rounded border border-red-200">
                                    {result.errorDetails.map((err: any, idx: number) => (
                                        <p key={idx} className="text-sm text-red-600 mb-1">
                                            Riga {err.row}: {err.error}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* AZIONI */}
                <div className="flex gap-3">
                    <button
                        onClick={handleImport}
                        disabled={!file || importing}
                        className="btn bg-blue-600 hover:bg-blue-700 text-white flex-1 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {importing ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Importazione in corso...
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                Importa Clienti
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleClose}
                        className="btn bg-gray-500 hover:bg-gray-600 text-white px-6"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
}

