/**
 * Componente per selezione clienti con filtri avanzati
 * Usato per campagne email marketing
 */

import { useState, useEffect } from 'react';
import { Search, Filter, Users, CheckSquare, Square, X } from 'lucide-react';
import { clientiAPI } from '../services/api';
import toast from 'react-hot-toast';

interface Cliente {
    id: string;
    tipo: 'privato' | 'azienda';
    nome?: string;
    cognome?: string;
    ragione_sociale?: string;
    email: string;
    telefono?: string;
    citta?: string;
    consenso_marketing?: boolean;
}

interface ClientiSelectorProps {
    selectedClientIds: string[];
    onSelectionChange: (clientIds: string[]) => void;
    maxHeight?: string;
}

export default function ClientiSelector({ selectedClientIds, onSelectionChange, maxHeight = '400px' }: ClientiSelectorProps) {
    const [clienti, setClienti] = useState<Cliente[]>([]);
    const [clientiFiltered, setClientiFiltered] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        tipo: 'tutti', // tutti | privato | azienda
        consenso: 'tutti', // tutti | con_consenso | senza_consenso
        citta: '',
        provincia: '',
        cap: '',
        scadenza: 'tutti', // tutti | 30gg | 60gg | 90gg | scaduti
        tipoEnergia: 'tutti', // tutti | luce | gas | entrambi
        fornitore: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    // Carica tutti i clienti all'avvio
    useEffect(() => {
        loadClienti();
    }, []);

    // Applica filtri quando cambiano
    useEffect(() => {
        applyFilters();
    }, [clienti, searchTerm, filters]);

    const loadClienti = async () => {
        setLoading(true);
        try {
            const response = await clientiAPI.getAll({ limit: 1000 });
            const allClienti = response.data.data.clienti || [];
            setClienti(allClienti);
        } catch (error) {
            toast.error('Errore caricamento clienti');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...clienti];

        // Filtro ricerca (nome, cognome, ragione sociale, email, telefono)
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(c => {
                const nomeCompleto = c.tipo === 'privato' 
                    ? `${c.nome || ''} ${c.cognome || ''}`
                    : c.ragione_sociale || '';
                return (
                    nomeCompleto.toLowerCase().includes(search) ||
                    (c.email || '').toLowerCase().includes(search) ||
                    (c.telefono || '').toLowerCase().includes(search)
                );
            });
        }

        // Filtro tipo
        if (filters.tipo !== 'tutti') {
            filtered = filtered.filter(c => c.tipo === filters.tipo);
        }

        // Filtro consenso marketing
        if (filters.consenso === 'con_consenso') {
            filtered = filtered.filter(c => c.consenso_marketing === true);
        } else if (filters.consenso === 'senza_consenso') {
            filtered = filtered.filter(c => !c.consenso_marketing);
        }

        // Filtro città
        if (filters.citta.trim()) {
            const citta = filters.citta.toLowerCase();
            filtered = filtered.filter(c => (c.citta || '').toLowerCase().includes(citta));
        }

        // Filtro provincia (primi 2 caratteri CAP o campo provincia se presente)
        if (filters.provincia.trim()) {
            const prov = filters.provincia.toLowerCase();
            filtered = filtered.filter(c => 
                (c.citta || '').toLowerCase().includes(prov) || 
                ((c as any).provincia || '').toLowerCase().includes(prov)
            );
        }

        // Filtro CAP
        if (filters.cap.trim()) {
            filtered = filtered.filter(c => 
                ((c as any).cap || '').toString().startsWith(filters.cap)
            );
        }

        // TODO: Filtri avanzati contratti (scadenza, tipo energia, fornitore)
        // Richiedono caricamento contratti - implementabile in futuro

        setClientiFiltered(filtered);
    };

    const handleSelectAll = () => {
        if (selectedClientIds.length === clientiFiltered.length) {
            // Deseleziona tutti
            onSelectionChange([]);
        } else {
            // Seleziona tutti i filtrati
            const allIds = clientiFiltered.map(c => c.id);
            onSelectionChange(allIds);
        }
    };

    const handleToggleCliente = (clienteId: string) => {
        if (selectedClientIds.includes(clienteId)) {
            // Rimuovi dalla selezione
            onSelectionChange(selectedClientIds.filter(id => id !== clienteId));
        } else {
            // Aggiungi alla selezione
            onSelectionChange([...selectedClientIds, clienteId]);
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilters({
            tipo: 'tutti',
            consenso: 'tutti',
            citta: '',
            provincia: '',
            cap: '',
            scadenza: 'tutti',
            tipoEnergia: 'tutti',
            fornitore: ''
        });
    };

    const hasActiveFilters = searchTerm || filters.tipo !== 'tutti' || filters.consenso !== 'tutti' || 
        filters.citta || filters.provincia || filters.cap || filters.scadenza !== 'tutti' || 
        filters.tipoEnergia !== 'tutti' || filters.fornitore;
    const allSelected = clientiFiltered.length > 0 && selectedClientIds.length === clientiFiltered.length;

    return (
        <div className="space-y-4">
            {/* Header con ricerca e filtri */}
            <div className="space-y-3">
                {/* Barra ricerca */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="🔍 Cerca per nome, cognome, ragione sociale o email..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Toggle filtri + selezione massiva */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                            showFilters 
                                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <Filter size={18} />
                        Filtri {hasActiveFilters && <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">ON</span>}
                    </button>

                    <button
                        onClick={handleSelectAll}
                        disabled={clientiFiltered.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        {allSelected ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                    </button>

                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-red-300 text-red-700 hover:bg-red-50"
                        >
                            <X size={18} />
                            Reset Filtri
                        </button>
                    )}

                    <div className="ml-auto text-sm text-gray-600 font-medium">
                        {selectedClientIds.length} / {clientiFiltered.length} selezionati
                    </div>
                </div>

                {/* Pannello filtri (collassabile) */}
                {showFilters && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Cliente</label>
                                <select
                                    value={filters.tipo}
                                    onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="tutti">👥 Tutti</option>
                                    <option value="privato">🏠 Solo Privati</option>
                                    <option value="azienda">🏢 Solo Aziende</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Consenso Marketing</label>
                                <select
                                    value={filters.consenso}
                                    onChange={(e) => setFilters({ ...filters, consenso: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="tutti">✉️ Tutti</option>
                                    <option value="con_consenso">✅ Con Consenso</option>
                                    <option value="senza_consenso">❌ Senza Consenso</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Scadenza Contratto</label>
                                <select
                                    value={filters.scadenza}
                                    onChange={(e) => setFilters({ ...filters, scadenza: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="tutti">📅 Tutte</option>
                                    <option value="30gg">⚠️ Entro 30 giorni</option>
                                    <option value="60gg">📆 Entro 60 giorni</option>
                                    <option value="90gg">📊 Entro 90 giorni</option>
                                    <option value="scaduti">❌ Già scaduti</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Città</label>
                                <input
                                    type="text"
                                    value={filters.citta}
                                    onChange={(e) => setFilters({ ...filters, citta: e.target.value })}
                                    placeholder="Es: Roma, Milano..."
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Provincia</label>
                                <input
                                    type="text"
                                    value={filters.provincia}
                                    onChange={(e) => setFilters({ ...filters, provincia: e.target.value })}
                                    placeholder="Es: RM, MI, NA..."
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">CAP</label>
                                <input
                                    type="text"
                                    value={filters.cap}
                                    onChange={(e) => setFilters({ ...filters, cap: e.target.value })}
                                    placeholder="Es: 00100..."
                                    maxLength={5}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Energia</label>
                                <select
                                    value={filters.tipoEnergia}
                                    onChange={(e) => setFilters({ ...filters, tipoEnergia: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="tutti">⚡ Tutti</option>
                                    <option value="luce">💡 Solo Luce</option>
                                    <option value="gas">🔥 Solo Gas</option>
                                    <option value="entrambi">⚡🔥 Entrambi</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Fornitore Attuale</label>
                                <input
                                    type="text"
                                    value={filters.fornitore}
                                    onChange={(e) => setFilters({ ...filters, fornitore: e.target.value })}
                                    placeholder="Es: Enel, Eni, Hera..."
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-600">
                                💡 <strong>Nota:</strong> I filtri su scadenza, energia e fornitore richiedono dati contratti (prossima implementazione)
                            </p>
                            <button
                                onClick={handleClearFilters}
                                className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                🗑️ Reset Tutti
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista clienti */}
            <div 
                className="border border-gray-300 rounded-lg overflow-hidden"
                style={{ maxHeight, overflowY: 'auto' }}
            >
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : clientiFiltered.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <Users size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-600 font-medium">
                            {hasActiveFilters 
                                ? 'Nessun cliente trovato con i filtri applicati' 
                                : 'Nessun cliente disponibile'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Reset filtri
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {clientiFiltered.map((cliente) => {
                            const isSelected = selectedClientIds.includes(cliente.id);
                            const displayName = cliente.tipo === 'privato'
                                ? `${cliente.nome || ''} ${cliente.cognome || ''}`
                                : cliente.ragione_sociale || '';

                            return (
                                <label
                                    key={cliente.id}
                                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-blue-50 transition-colors ${
                                        isSelected ? 'bg-blue-100' : 'bg-white'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleCliente(cliente.id)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900 truncate">{displayName}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                cliente.tipo === 'privato' 
                                                    ? 'bg-blue-100 text-blue-700' 
                                                    : 'bg-purple-100 text-purple-700'
                                            }`}>
                                                {cliente.tipo === 'privato' ? '🏠 Privato' : '🏢 Azienda'}
                                            </span>
                                            {cliente.consenso_marketing && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                    ✅ Consenso
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                            <span>📧 {cliente.email}</span>
                                            {cliente.telefono && <span>📞 {cliente.telefono}</span>}
                                            {cliente.citta && <span>📍 {cliente.citta}</span>}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

