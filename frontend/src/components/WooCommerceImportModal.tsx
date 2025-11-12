import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Download, Save, RotateCcw, Eye, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WooCommerceImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
}

interface CSVColumn {
    name: string;
    sample: string;
    type: 'text' | 'number' | 'date' | 'email' | 'phone';
}

interface FieldMapping {
    csvColumn: string;
    systemField: string;
    required: boolean;
    transform?: string;
}

interface MappingPreset {
    id: string;
    name: string;
    mappings: FieldMapping[];
    createdAt: string;
}

type ImportPhase = 'upload' | 'mapping' | 'confirmation' | 'importing' | 'complete';

const SYSTEM_FIELDS = [
    // Clienti Privati
    { key: 'nome', label: 'Nome', required: false, type: 'text', category: 'Clienti Privati' },
    { key: 'cognome', label: 'Cognome', required: false, type: 'text', category: 'Clienti Privati' },
    { key: 'codice_fiscale', label: 'Codice Fiscale', required: false, type: 'text', category: 'Clienti Privati' },
    { key: 'email_principale', label: 'Email Principale', required: false, type: 'email', category: 'Clienti Privati' },
    { key: 'telefono_principale', label: 'Telefono Principale', required: false, type: 'phone', category: 'Clienti Privati' },
    { key: 'data_nascita', label: 'Data di Nascita', required: false, type: 'date', category: 'Clienti Privati' },
    { key: 'luogo_nascita', label: 'Luogo di Nascita', required: false, type: 'text', category: 'Clienti Privati' },
    { key: 'indirizzo_residenza', label: 'Indirizzo Residenza', required: false, type: 'text', category: 'Clienti Privati' },
    { key: 'cap_residenza', label: 'CAP Residenza', required: false, type: 'text', category: 'Clienti Privati' },
    { key: 'citta_residenza', label: 'Città Residenza', required: false, type: 'text', category: 'Clienti Privati' },
    { key: 'provincia_residenza', label: 'Provincia Residenza', required: false, type: 'text', category: 'Clienti Privati' },
    { key: 'indirizzo_domicilio', label: 'Indirizzo Domicilio', required: false, type: 'text', category: 'Clienti Privati' },
    { key: 'cap_domicilio', label: 'CAP Domicilio', required: false, type: 'text', category: 'Clienti Privati' },
    { key: 'citta_domicilio', label: 'Città Domicilio', required: false, type: 'text', category: 'Clienti Privati' },
    { key: 'provincia_domicilio', label: 'Provincia Domicilio', required: false, type: 'text', category: 'Clienti Privati' },

    // Clienti Aziende
    { key: 'ragione_sociale', label: 'Ragione Sociale', required: false, type: 'text', category: 'Clienti Aziende' },
    { key: 'partita_iva', label: 'Partita IVA', required: false, type: 'text', category: 'Clienti Aziende' },
    { key: 'codice_destinatario', label: 'Codice Destinatario', required: false, type: 'text', category: 'Clienti Aziende' },
    { key: 'pec_aziendale', label: 'PEC Aziendale', required: false, type: 'email', category: 'Clienti Aziende' },
    { key: 'telefono_aziendale', label: 'Telefono Aziendale', required: false, type: 'phone', category: 'Clienti Aziende' },
    { key: 'indirizzo_sede_legale', label: 'Indirizzo Sede Legale', required: false, type: 'text', category: 'Clienti Aziende' },
    { key: 'cap_sede_legale', label: 'CAP Sede Legale', required: false, type: 'text', category: 'Clienti Aziende' },
    { key: 'citta_sede_legale', label: 'Città Sede Legale', required: false, type: 'text', category: 'Clienti Aziende' },
    { key: 'provincia_sede_legale', label: 'Provincia Sede Legale', required: false, type: 'text', category: 'Clienti Aziende' },

    // Contratti Luce
    { key: 'pod', label: 'POD (Punto di Prelievo)', required: false, type: 'text', category: 'Contratti Luce' },
    { key: 'tipo_contratto', label: 'Tipo Contratto', required: false, type: 'text', category: 'Contratti Luce' },
    { key: 'fornitore_attuale', label: 'Fornitore Attuale', required: false, type: 'text', category: 'Contratti Luce' },
    { key: 'data_inizio_contratto', label: 'Data Inizio Contratto', required: false, type: 'date', category: 'Contratti Luce' },
    { key: 'data_fine_contratto', label: 'Data Fine Contratto', required: false, type: 'date', category: 'Contratti Luce' },
    { key: 'potenza_impegnata', label: 'Potenza Impegnata (kW)', required: false, type: 'number', category: 'Contratti Luce' },
    { key: 'consumo_annuo_stimato', label: 'Consumo Annuo Stimato (kWh)', required: false, type: 'number', category: 'Contratti Luce' },
    { key: 'tipo_tariffa', label: 'Tipo Tariffa', required: false, type: 'text', category: 'Contratti Luce' },

    // Contratti Gas
    { key: 'pdr', label: 'PDR (Punto di Riconsegna)', required: false, type: 'text', category: 'Contratti Gas' },
    { key: 'tipo_contratto_gas', label: 'Tipo Contratto Gas', required: false, type: 'text', category: 'Contratti Gas' },
    { key: 'fornitore_attuale_gas', label: 'Fornitore Attuale Gas', required: false, type: 'text', category: 'Contratti Gas' },
    { key: 'data_inizio_contratto_gas', label: 'Data Inizio Contratto Gas', required: false, type: 'date', category: 'Contratti Gas' },
    { key: 'data_fine_contratto_gas', label: 'Data Fine Contratto Gas', required: false, type: 'date', category: 'Contratti Gas' },
    { key: 'consumo_annuo_stimato_gas', label: 'Consumo Annuo Stimato Gas (Smc)', required: false, type: 'number', category: 'Contratti Gas' },
    { key: 'tipo_tariffa_gas', label: 'Tipo Tariffa Gas', required: false, type: 'text', category: 'Contratti Gas' },

    // Agente
    { key: 'assigned_agent_email', label: 'Email Agente Assegnato', required: false, type: 'email', category: 'Agente' },

    // Campi Generali
    { key: 'note_aggiuntive', label: 'Note Aggiuntive', required: false, type: 'text', category: 'Generale' }
];

export default function WooCommerceImportModal({ isOpen, onClose, onImportComplete }: WooCommerceImportModalProps) {
    const [phase, setPhase] = useState<ImportPhase>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([]);
    const [clientType, setClientType] = useState<'privato' | 'azienda'>('privato');
    const [mappings, setMappings] = useState<FieldMapping[]>([]);
    const [savedPresets, setSavedPresets] = useState<MappingPreset[]>([]);
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [importProgress, setImportProgress] = useState(0);
    const [importResults, setImportResults] = useState<any>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetModal = useCallback(() => {
        setPhase('upload');
        setFile(null);
        setCsvData([]);
        setCsvColumns([]);
        setMappings([]);
        setSelectedPreset('');
        setImportProgress(0);
        setImportResults(null);
        setErrors([]);
    }, []);

    const handleClose = () => {
        resetModal();
        onClose();
    };

    // FASE 1: CARICAMENTO FILE
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        // Validazione formato file
        const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const validExtensions = ['.csv', '.xls', '.xlsx'];
        const hasValidType = validTypes.includes(selectedFile.type);
        const hasValidExtension = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));

        if (!hasValidType && !hasValidExtension) {
            toast.error('❌ Formato file non valido. Sono supportati solo file CSV, XLS e XLSX.');
            return;
        }

        setFile(selectedFile);
        parseCSVFile(selectedFile);
    };

    const parseCSVFile = async (file: File) => {
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                throw new Error('Il file deve contenere almeno un header e una riga di dati');
            }

            // Parse header
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            // Parse sample data (prime 5 righe)
            const sampleData = lines.slice(1, 6).map(line => {
                const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                const row: any = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                return row;
            });

            // Analizza colonne e tipi
            const columns: CSVColumn[] = headers.map(header => {
                const sampleValue = sampleData[0]?.[header] || '';
                let type: CSVColumn['type'] = 'text';
                
                if (sampleValue.includes('@')) type = 'email';
                else if (/^\d{4}-\d{2}-\d{2}/.test(sampleValue)) type = 'date';
                else if (/^\+?\d+/.test(sampleValue)) type = 'phone';
                else if (/^\d+\.?\d*$/.test(sampleValue)) type = 'number';

                return {
                    name: header,
                    sample: sampleValue,
                    type
                };
            });

            setCsvColumns(columns);
            setCsvData(sampleData);
            setPhase('mapping');
            toast.success('✅ File caricato con successo!');

        } catch (error: any) {
            toast.error(`❌ Errore nel parsing del file: ${error.message}`);
            setFile(null);
        }
    };

    // FASE 2: MAPPATURA CAMPI
    const handleMappingChange = (csvColumn: string, systemField: string) => {
        setMappings(prev => {
            const existing = prev.find(m => m.csvColumn === csvColumn);
            if (existing) {
                return prev.map(m => 
                    m.csvColumn === csvColumn 
                        ? { ...m, systemField }
                        : m
                );
            } else {
                return [...prev, {
                    csvColumn,
                    systemField,
                    required: false
                }];
            }
        });
    };

    const autoMapFields = () => {
        const systemFields = SYSTEM_FIELDS;
        const newMappings: FieldMapping[] = [];

        csvColumns.forEach(csvCol => {
            const csvName = csvCol.name.toLowerCase();
            const matchedField = systemFields.find(sysField => {
                const sysName = sysField.label.toLowerCase();
                const sysKey = sysField.key.toLowerCase();
                return csvName.includes(sysName) || 
                       csvName.includes(sysKey) ||
                       sysName.includes(csvName) ||
                       sysKey.includes(csvName);
            });

            if (matchedField) {
                newMappings.push({
                    csvColumn: csvCol.name,
                    systemField: matchedField.key,
                    required: matchedField.required
                });
            }
        });

        setMappings(newMappings);
        toast.success(`✅ ${newMappings.length} campi mappati automaticamente!`);
    };

    const savePreset = () => {
        const presetName = prompt('Nome per questa configurazione di mappatura:');
        if (!presetName) return;

        const newPreset: MappingPreset = {
            id: Date.now().toString(),
            name: presetName,
            mappings: [...mappings],
            createdAt: new Date().toISOString()
        };

        setSavedPresets(prev => [...prev, newPreset]);
        toast.success('✅ Configurazione salvata!');
    };

    const loadPreset = (presetId: string) => {
        const preset = savedPresets.find(p => p.id === presetId);
        if (preset) {
            setMappings(preset.mappings);
            setSelectedPreset(presetId);
            toast.success('✅ Configurazione caricata!');
        }
    };

    // FASE 3: CONFERMA E IMPORTAZIONE
    const proceedToConfirmation = () => {
        if (mappings.length === 0) {
            toast.error('❌ Devi mappare almeno un campo prima di procedere');
            return;
        }
        setPhase('confirmation');
    };

    const startImport = async () => {
        if (!file) return;

        setPhase('importing');
        setImportProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('mappings', JSON.stringify(mappings));
            formData.append('clientType', clientType);

            const token = localStorage.getItem('token');
    const response = await fetch('/api/clienti/woocommerce-import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                setImportResults(result);
                setPhase('complete');
                toast.success('✅ Importazione completata!');
                setTimeout(() => {
                    onImportComplete();
                }, 2000);
            } else {
                throw new Error(result.message || 'Errore durante l\'importazione');
            }

        } catch (error: any) {
            toast.error(`❌ ${error.message}`);
            setPhase('confirmation');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10000]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Importazione CSV Avanzata</h2>
                            <p className="text-blue-100 mt-1">Sistema guidato in 3 fasi ispirato a WooCommerce</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center mt-6 space-x-4">
                        {[
                            { key: 'upload', label: 'Caricamento', icon: Upload },
                            { key: 'mapping', label: 'Mappatura', icon: Settings },
                            { key: 'confirmation', label: 'Conferma', icon: CheckCircle }
                        ].map((step, index) => {
                            const Icon = step.icon;
                            const isActive = phase === step.key;
                            const isCompleted = ['upload', 'mapping'].includes(step.key) && 
                                              ['mapping', 'confirmation', 'importing', 'complete'].includes(phase);
                            
                            return (
                                <div key={step.key} className="flex items-center">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                                        isActive ? 'bg-white text-blue-600 border-white' :
                                        isCompleted ? 'bg-green-500 text-white border-green-500' :
                                        'bg-transparent text-white border-white/50'
                                    }`}>
                                        <Icon size={20} />
                                    </div>
                                    <span className={`ml-2 font-medium ${
                                        isActive ? 'text-white' : 'text-blue-100'
                                    }`}>
                                        {step.label}
                                    </span>
                                    {index < 2 && (
                                        <div className={`w-8 h-0.5 mx-4 ${
                                            isCompleted ? 'bg-green-500' : 'bg-white/30'
                                        }`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* FASE 1: CARICAMENTO FILE */}
                    {phase === 'upload' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h3 className="text-xl font-semibold mb-2">Carica il tuo file CSV</h3>
                                <p className="text-gray-600 mb-6">
                                    Supportiamo file CSV, XLS e XLSX. Il sistema rileverà automaticamente la struttura dei dati.
                                </p>
                            </div>

                            {/* Tipo Cliente */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Tipo di clienti da importare:
                                </label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="privato"
                                            checked={clientType === 'privato'}
                                            onChange={(e) => setClientType(e.target.value as 'privato')}
                                            className="mr-2"
                                        />
                                        Clienti Privati
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="azienda"
                                            checked={clientType === 'azienda'}
                                            onChange={(e) => setClientType(e.target.value as 'azienda')}
                                            className="mr-2"
                                        />
                                        Aziende
                                    </label>
                                </div>
                            </div>

                            {/* File Upload Area */}
                            <div
                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                                <p className="text-lg font-medium text-gray-700 mb-2">
                                    Clicca per selezionare un file o trascinalo qui
                                </p>
                                <p className="text-sm text-gray-500">
                                    Formati supportati: CSV, XLS, XLSX (max 10MB)
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xls,.xlsx"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>

                            {file && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <FileText className="text-green-600 mr-3" size={20} />
                                        <div>
                                            <p className="font-medium text-green-800">{file.name}</p>
                                            <p className="text-sm text-green-600">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FASE 2: MAPPATURA CAMPI */}
                    {phase === 'mapping' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold">Mappatura dei Campi</h3>
                                    <p className="text-gray-600">
                                        Associa le colonne del tuo CSV ai campi del sistema
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={autoMapFields}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                                    >
                                        <RotateCcw size={16} className="mr-2" />
                                        Auto-Map
                                    </button>
                                    <button
                                        onClick={savePreset}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                                        disabled={mappings.length === 0}
                                    >
                                        <Save size={16} className="mr-2" />
                                        Salva Config
                                    </button>
                                </div>
                            </div>

                            {/* Preset Selector */}
                            {savedPresets.length > 0 && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Carica configurazione salvata:
                                    </label>
                                    <select
                                        value={selectedPreset}
                                        onChange={(e) => loadPreset(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">Seleziona una configurazione...</option>
                                        {savedPresets.map(preset => (
                                            <option key={preset.id} value={preset.id}>
                                                {preset.name} ({new Date(preset.createdAt).toLocaleDateString()})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Mapping Table */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                                    <div className="grid grid-cols-4 gap-4 font-medium text-gray-700">
                                        <div>Colonna CSV</div>
                                        <div>Esempio Dati</div>
                                        <div>Campo Sistema</div>
                                        <div>Anteprima</div>
                                    </div>
                                </div>
                                <div className="divide-y divide-gray-200">
                                    {csvColumns.map((column, index) => {
                                        const mapping = mappings.find(m => m.csvColumn === column.name);
                                        const systemFields = SYSTEM_FIELDS;
                                        
                                        return (
                                            <div key={index} className="px-6 py-4 grid grid-cols-4 gap-4 items-center">
                                                <div className="font-medium text-gray-900">
                                                    {column.name}
                                                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                                        column.type === 'email' ? 'bg-blue-100 text-blue-800' :
                                                        column.type === 'phone' ? 'bg-green-100 text-green-800' :
                                                        column.type === 'date' ? 'bg-purple-100 text-purple-800' :
                                                        column.type === 'number' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {column.type}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600 truncate">
                                                    {column.sample || 'N/A'}
                                                </div>
                                                <div>
                                                    <select
                                                        value={mapping?.systemField || ''}
                                                        onChange={(e) => handleMappingChange(column.name, e.target.value)}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                                    >
                                                        <option value="">Non mappare</option>
                                                        {Object.entries(
                                                            systemFields.reduce((acc, field) => {
                                                                if (!acc[field.category]) acc[field.category] = [];
                                                                acc[field.category].push(field);
                                                                return acc;
                                                            }, {} as Record<string, typeof systemFields>)
                                                        ).map(([category, fields]) => (
                                                            <optgroup key={category} label={category}>
                                                                {fields.map(field => (
                                                                    <option key={field.key} value={field.key}>
                                                                        {field.label} {field.required && '*'}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="text-sm">
                                                    {mapping && (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                                            <CheckCircle size={12} className="mr-1" />
                                                            Mappato
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Data Preview */}
                            {csvData.length > 0 && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                        <Eye size={16} className="mr-2" />
                                        Anteprima Dati (prime 3 righe)
                                    </h4>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="bg-white">
                                                    {csvColumns.map(col => (
                                                        <th key={col.name} className="px-3 py-2 text-left font-medium text-gray-700 border">
                                                            {col.name}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {csvData.slice(0, 3).map((row, index) => (
                                                    <tr key={index} className="bg-white">
                                                        {csvColumns.map(col => (
                                                            <td key={col.name} className="px-3 py-2 border text-gray-600">
                                                                {row[col.name] || '-'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between">
                                <button
                                    onClick={() => setPhase('upload')}
                                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Indietro
                                </button>
                                <button
                                    onClick={proceedToConfirmation}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    disabled={mappings.length === 0}
                                >
                                    Procedi alla Conferma
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FASE 3: CONFERMA */}
                    {phase === 'confirmation' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold">Conferma Importazione</h3>
                                <p className="text-gray-600">
                                    Rivedi le impostazioni prima di procedere con l'importazione
                                </p>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-medium text-blue-900">File</h4>
                                    <p className="text-blue-700">{file?.name}</p>
                                    <p className="text-sm text-blue-600">{csvColumns.length} colonne</p>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="font-medium text-green-900">Tipo Cliente</h4>
                                    <p className="text-green-700 capitalize">{clientType}</p>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <h4 className="font-medium text-purple-900">Campi Mappati</h4>
                                    <p className="text-purple-700">{mappings.length} su {csvColumns.length}</p>
                                </div>
                            </div>

                            {/* Mapping Summary */}
                            <div className="bg-white border border-gray-200 rounded-lg">
                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                                    <h4 className="font-medium text-gray-900">Riepilogo Mappature</h4>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {mappings.map((mapping, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <span className="font-medium text-gray-700">{mapping.csvColumn}</span>
                                                <span className="text-gray-500">→</span>
                                                <span className="text-blue-600">
                                                    {SYSTEM_FIELDS.find(f => f.key === mapping.systemField)?.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <button
                                    onClick={() => setPhase('mapping')}
                                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Modifica Mappature
                                </button>
                                <button
                                    onClick={startImport}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                                >
                                    <Upload size={16} className="mr-2" />
                                    Avvia Importazione
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FASE 4: IMPORTAZIONE IN CORSO */}
                    {phase === 'importing' && (
                        <div className="text-center space-y-6">
                            <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                            <h3 className="text-xl font-semibold">Importazione in corso...</h3>
                            <p className="text-gray-600">
                                Stiamo processando i tuoi dati. Questo potrebbe richiedere alcuni minuti.
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${importProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* FASE 5: COMPLETAMENTO */}
                    {phase === 'complete' && importResults && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle size={32} className="text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-green-800">Importazione Completata!</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="font-medium text-green-900">Importati</h4>
                                    <p className="text-2xl font-bold text-green-700">{importResults.imported || 0}</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-medium text-blue-900">Totali</h4>
                                    <p className="text-2xl font-bold text-blue-700">{importResults.total || 0}</p>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h4 className="font-medium text-red-900">Errori</h4>
                                    <p className="text-2xl font-bold text-red-700">{importResults.errors || 0}</p>
                                </div>
                            </div>

                            {importResults.errorDetails && importResults.errorDetails.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                                    <h4 className="font-medium text-red-900 mb-2">Dettagli Errori:</h4>
                                    <div className="max-h-32 overflow-y-auto">
                                        {importResults.errorDetails.map((error: any, index: number) => (
                                            <p key={index} className="text-sm text-red-700">
                                                Riga {error.row}: {error.message}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleClose}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Chiudi
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}