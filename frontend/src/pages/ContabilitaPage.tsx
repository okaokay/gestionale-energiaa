/**
 * ════════════════════════════════════════════════════════════════════════════════
 * PAGINA CONTABILITÀ - Dashboard e Gestione Movimenti Completa
 * ════════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { 
    Euro, TrendingUp, Users, DollarSign, CheckCircle, Clock, 
    Download, Filter, Search, Plus, X, Edit, Trash2, Eye,
    Calendar, CreditCard, FileText, AlertCircle, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardData {
    riepilogo: {
        compensi_da_pagare: number;
        compensi_pagati_mese: number;
        incassi_attesi: number;
        saldo: number;
    };
    compensi_per_agente: Array<{
        id: string;
        nome: string;
        cognome: string;
        email: string;
        da_pagare: number;
        pagato_mese: number;
        totale_pagato: number;
    }>;
    ultimi_movimenti: Array<any>;
}

interface Movimento {
    id: number;
    tipo: string;
    agent_id?: string;
    agent_nome?: string;
    agent_cognome?: string;
    cliente_id?: string;
    cliente_tipo?: string;
    importo: number;
    stato: string;
    data_movimento: string;
    data_pagamento?: string;
    descrizione?: string;
    note?: string;
    created_at: string;
    source_table?: string;
}

interface Agente {
    id: string;
    nome: string;
    cognome: string;
    email: string;
}

export default function ContabilitaPage() {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [movimenti, setMovimenti] = useState<Movimento[]>([]);
    const [agenti, setAgenti] = useState<Agente[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'dashboard' | 'movimenti'>('dashboard');
    
    // Filtri
    const [filters, setFilters] = useState({
        tipo: '',
        stato: '',
        agent_id: '',
        data_da: '',
        data_a: '',
        search: ''
    });
    
    // Paginazione
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    
    // Modali
    const [showPagaModal, setShowPagaModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedMovimento, setSelectedMovimento] = useState<Movimento | null>(null);
    
    // Form per nuovo movimento
    const [newMovimento, setNewMovimento] = useState({
        tipo: 'compenso',
        agent_id: '',
        importo: '',
        descrizione: '',
        data_movimento: new Date().toISOString().split('T')[0],
        note: ''
    });
    
    // Form per pagamento
    const [pagamentoData, setPagamentoData] = useState({
        data_pagamento: new Date().toISOString().split('T')[0],
        note: ''
    });

    useEffect(() => {
        loadAgenti();
        if (viewMode === 'dashboard') {
            loadDashboard();
        } else {
            loadMovimenti();
        }
    }, [viewMode]);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/contabilita/dashboard', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (data.success) {
                setDashboard(data.data);
            }
        } catch (error) {
            toast.error('Errore caricamento dashboard');
        } finally {
            setLoading(false);
        }
    };

    const loadMovimenti = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.tipo) params.append('tipo', filters.tipo);
            if (filters.stato) params.append('stato', filters.stato);
            if (filters.agent_id) params.append('agent_id', filters.agent_id);
            if (filters.data_da) params.append('data_da', filters.data_da);
            if (filters.data_a) params.append('data_a', filters.data_a);
            
            const response = await fetch(`/api/contabilita/movimenti?${params}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (data.success) {
                setMovimenti(data.data);
            }
        } catch (error) {
            toast.error('Errore caricamento movimenti');
        } finally {
            setLoading(false);
        }
    };

    const loadAgenti = async () => {
        try {
            const response = await fetch('/api/agenti', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (data.success) {
                setAgenti(data.data);
            }
        } catch (error) {
            console.error('Errore caricamento agenti:', error);
        }
    };

    const handleMarcaComePagato = async (movimentoId: number) => {
        try {
            const response = await fetch(`/api/contabilita/movimenti/${movimentoId}/paga`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    ...pagamentoData,
                    source_table: selectedMovimento?.source_table || 'contabilita_movimenti'
                })
            });
            
            const data = await response.json();
            if (data.success) {
                toast.success('Movimento marcato come pagato!');
                setShowPagaModal(false);
                loadMovimenti();
            } else {
                toast.error(data.message || 'Errore');
            }
        } catch (error) {
            toast.error('Errore durante il pagamento');
        }
    };

    const handleAddMovimento = async () => {
        try {
            const response = await fetch('/api/contabilita/movimenti', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    ...newMovimento,
                    importo: parseFloat(newMovimento.importo),
                    stato: 'da_pagare'
                })
            });
            
            const data = await response.json();
            if (data.success) {
                toast.success('Movimento aggiunto con successo!');
                setShowAddModal(false);
                setNewMovimento({
                    tipo: 'compenso',
                    agent_id: '',
                    importo: '',
                    descrizione: '',
                    data_movimento: new Date().toISOString().split('T')[0],
                    note: ''
                });
                loadMovimenti();
            } else {
                toast.error(data.message || 'Errore');
            }
        } catch (error) {
            toast.error('Errore durante l\'aggiunta');
        }
    };

    const handleDeleteMovimento = async (id: number) => {
        if (!confirm('Sei sicuro di voler eliminare questo movimento?')) return;
        
        try {
            const response = await fetch(`/api/contabilita/movimenti/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            const data = await response.json();
            if (data.success) {
                toast.success('Movimento eliminato!');
                loadMovimenti();
            } else {
                toast.error(data.message || 'Errore');
            }
        } catch (error) {
            toast.error('Errore durante l\'eliminazione');
        }
    };

    const exportToCSV = () => {
        const headers = ['Data', 'Tipo', 'Agente', 'Importo', 'Stato', 'Descrizione'];
        const rows = filteredMovimenti.map(m => [
            new Date(m.data_movimento).toLocaleDateString('it-IT'),
            m.tipo,
            m.agent_nome ? `${m.agent_nome} ${m.agent_cognome}` : '-',
            `€${m.importo.toFixed(2)}`,
            m.stato,
            m.descrizione || '-'
        ]);
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `movimenti_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        toast.success('File CSV scaricato!');
    };

    // Filtri e paginazione
    const filteredMovimenti = movimenti.filter(m => {
        const searchLower = filters.search.toLowerCase();
        return (
            (m.descrizione?.toLowerCase().includes(searchLower) ||
             m.agent_nome?.toLowerCase().includes(searchLower) ||
             m.agent_cognome?.toLowerCase().includes(searchLower) ||
             m.importo.toString().includes(searchLower))
        );
    });

    const totalPages = Math.ceil(filteredMovimenti.length / itemsPerPage);
    const paginatedMovimenti = filteredMovimenti.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Statistiche movimenti filtrati
    const stats = {
        totale: filteredMovimenti.reduce((sum, m) => sum + m.importo, 0),
        da_pagare: filteredMovimenti.filter(m => m.stato === 'da_pagare').reduce((sum, m) => sum + m.importo, 0),
        pagati: filteredMovimenti.filter(m => m.stato === 'pagato').reduce((sum, m) => sum + m.importo, 0),
        count: filteredMovimenti.length
    };

    const getStatoBadge = (stato: string) => {
        const styles = {
            'da_pagare': 'bg-red-100 text-red-800',
            'maturato': 'bg-orange-100 text-orange-800',
            'pagato': 'bg-green-100 text-green-800',
            'annullato': 'bg-gray-100 text-gray-800',
            'in_elaborazione': 'bg-yellow-100 text-yellow-800'
        };
        return styles[stato as keyof typeof styles] || 'bg-gray-100 text-gray-800';
    };

    const getTipoBadge = (tipo: string) => {
        const styles = {
            'compenso': 'bg-blue-100 text-blue-800',
            'pagamento_cliente': 'bg-green-100 text-green-800',
            'rimborso': 'bg-purple-100 text-purple-800',
            'altro': 'bg-gray-100 text-gray-800'
        };
        return styles[tipo as keyof typeof styles] || 'bg-gray-100 text-gray-800';
    };

    if (loading && !dashboard) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Caricamento...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-xl shadow-lg">
                        <Euro className="w-8 h-8 text-white" />
                    </div>
                    Contabilità
                </h1>
                <p className="text-gray-600 mt-2">Gestione compensi agenti e movimenti contabili</p>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-3 justify-between items-center">
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setViewMode('dashboard');
                            loadDashboard();
                        }}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                            viewMode === 'dashboard'
                                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                        }`}
                    >
                        <TrendingUp className="w-5 h-5" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => {
                            setViewMode('movimenti');
                            loadMovimenti();
                        }}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                            viewMode === 'movimenti'
                                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                        }`}
                    >
                        <FileText className="w-5 h-5" />
                        Movimenti
                    </button>
                </div>
                
                {/* Refresh Button */}
                <button
                    onClick={() => {
                        if (viewMode === 'dashboard') {
                            loadDashboard();
                        } else {
                            loadMovimenti();
                        }
                        toast.success('Dati aggiornati!');
                    }}
                    className="px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 rounded-xl font-semibold transition-all flex items-center gap-2"
                    title="Aggiorna dati"
                >
                    <RefreshCw className="w-4 h-4" />
                    Aggiorna
                </button>
            </div>

            {/* Dashboard View */}
            {viewMode === 'dashboard' && dashboard && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <Clock className="w-8 h-8 opacity-80" />
                                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Da Pagare</span>
                            </div>
                            <div className="text-3xl font-bold mb-1">
                                €{dashboard.riepilogo.compensi_da_pagare.toFixed(2)}
                            </div>
                            <p className="text-red-100 text-sm">Compensi agenti in sospeso</p>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <CheckCircle className="w-8 h-8 opacity-80" />
                                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Pagati Questo Mese</span>
                            </div>
                            <div className="text-3xl font-bold mb-1">
                                €{dashboard.riepilogo.compensi_pagati_mese.toFixed(2)}
                            </div>
                            <p className="text-green-100 text-sm">Compensi già liquidati</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <DollarSign className="w-8 h-8 opacity-80" />
                                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Incassi Attesi</span>
                            </div>
                            <div className="text-3xl font-bold mb-1">
                                €{dashboard.riepilogo.incassi_attesi.toFixed(2)}
                            </div>
                            <p className="text-blue-100 text-sm">Da clienti</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <Euro className="w-8 h-8 opacity-80" />
                                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Saldo Contabile</span>
                            </div>
                            <div className="text-3xl font-bold mb-1">
                                €{dashboard.riepilogo.saldo.toFixed(2)}
                            </div>
                            <p className="text-purple-100 text-sm">
                                {dashboard.riepilogo.saldo >= 0 ? 'Positivo' : 'Negativo'}
                            </p>
                        </div>
                    </div>

                    {/* Compensi per Agente */}
                    <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b-2 border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Users className="w-6 h-6 text-indigo-600" />
                                    <h2 className="text-xl font-bold text-gray-900">Compensi per Agente</h2>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Agente</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Da Pagare</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Pagato Mese</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Totale Storico</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {dashboard.compensi_per_agente.map((agente) => (
                                        <tr key={agente.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">
                                                    {agente.nome} {agente.cognome}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{agente.email}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-red-600">
                                                    €{agente.da_pagare.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-semibold text-green-600">
                                                    €{agente.pagato_mese.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-semibold text-gray-900">
                                                    €{agente.totale_pagato.toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Ultimi Movimenti */}
                    <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b-2 border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                <Calendar className="w-6 h-6 text-indigo-600" />
                                Ultimi Movimenti
                            </h2>
                        </div>
                        <div className="p-6">
                            {dashboard.ultimi_movimenti && dashboard.ultimi_movimenti.length > 0 ? (
                                <div className="space-y-3">
                                    {dashboard.ultimi_movimenti.map((mov: any) => (
                                        <div
                                            key={mov.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTipoBadge(mov.tipo)}`}>
                                                        {mov.tipo}
                                                    </span>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatoBadge(mov.stato)}`}>
                                                        {mov.stato}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-900 font-medium">{mov.descrizione}</p>
                                                {mov.agent_nome && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Agente: {mov.agent_nome} {mov.agent_cognome}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right ml-4">
                                                <div className="text-xl font-bold text-gray-900">
                                                    €{mov.importo.toFixed(2)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(mov.data_movimento).toLocaleDateString('it-IT')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p>Nessun movimento recente</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Movimenti View */}
            {viewMode === 'movimenti' && (
                <div className="space-y-6">
                    {/* Toolbar */}
                    <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-6">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Search */}
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Cerca movimenti..."
                                        value={filters.search}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Filtri */}
                            <select
                                value={filters.tipo}
                                onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Tutti i tipi</option>
                                <option value="compenso">Compenso</option>
                                <option value="pagamento_cliente">Pagamento Cliente</option>
                                <option value="rimborso">Rimborso</option>
                                <option value="altro">Altro</option>
                            </select>

                            <select
                                value={filters.stato}
                                onChange={(e) => setFilters({ ...filters, stato: e.target.value })}
                                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Tutti gli stati</option>
                                <option value="da_pagare">Da Pagare</option>
                                <option value="pagato">Pagato</option>
                                <option value="annullato">Annullato</option>
                            </select>

                            <select
                                value={filters.agent_id}
                                onChange={(e) => setFilters({ ...filters, agent_id: e.target.value })}
                                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Tutti gli agenti</option>
                                {agenti.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.nome} {a.cognome}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={filters.data_da}
                                onChange={(e) => setFilters({ ...filters, data_da: e.target.value })}
                                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                placeholder="Da"
                            />

                            <input
                                type="date"
                                value={filters.data_a}
                                onChange={(e) => setFilters({ ...filters, data_a: e.target.value })}
                                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                                placeholder="A"
                            />

                            <button
                                onClick={loadMovimenti}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold flex items-center gap-2"
                            >
                                <Filter className="w-4 h-4" />
                                Applica Filtri
                            </button>

                            <button
                                onClick={exportToCSV}
                                className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Esporta CSV
                            </button>

                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Aggiungi Movimento
                            </button>
                        </div>
                    </div>

                    {/* Statistiche Filtri */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-4 border-2 border-gray-100">
                            <div className="text-sm text-gray-600 mb-1">Movimenti Totali</div>
                            <div className="text-2xl font-bold text-gray-900">{stats.count}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border-2 border-gray-100">
                            <div className="text-sm text-gray-600 mb-1">Importo Totale</div>
                            <div className="text-2xl font-bold text-indigo-600">€{stats.totale.toFixed(2)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border-2 border-gray-100">
                            <div className="text-sm text-gray-600 mb-1">Da Pagare</div>
                            <div className="text-2xl font-bold text-red-600">€{stats.da_pagare.toFixed(2)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border-2 border-gray-100">
                            <div className="text-sm text-gray-600 mb-1">Pagati</div>
                            <div className="text-2xl font-bold text-green-600">€{stats.pagati.toFixed(2)}</div>
                        </div>
                    </div>

                    {/* Tabella Movimenti */}
                    <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Agente</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Descrizione</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Importo</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Stato</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedMovimenti.map((mov) => (
                                        <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                                {new Date(mov.data_movimento).toLocaleDateString('it-IT')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTipoBadge(mov.tipo)}`}>
                                                    {mov.tipo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {mov.agent_nome ? `${mov.agent_nome} ${mov.agent_cognome}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                {mov.descrizione || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-lg font-bold text-gray-900">
                                                €{mov.importo.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatoBadge(mov.stato)}`}>
                                                    {mov.stato}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {(mov.stato === 'da_pagare' || mov.stato === 'maturato') && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedMovimento(mov);
                                                                setShowPagaModal(true);
                                                            }}
                                                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                            title="Marca come pagato"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedMovimento(mov);
                                                            setShowDetailsModal(true);
                                                        }}
                                                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                        title="Dettagli"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMovimento(mov.id)}
                                                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                        title="Elimina"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginazione */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-100 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Pagina {currentPage} di {totalPages} ({filteredMovimenti.length} movimenti totali)
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Precedente
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        Successivo
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Paga Movimento */}
            {showPagaModal && selectedMovimento && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                Marca come Pagato
                            </h3>
                            <button
                                onClick={() => setShowPagaModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="text-sm text-gray-600 mb-1">Importo da pagare</div>
                                <div className="text-3xl font-bold text-gray-900">
                                    €{selectedMovimento.importo.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    {selectedMovimento.descrizione}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Data Pagamento
                                </label>
                                <input
                                    type="date"
                                    value={pagamentoData.data_pagamento}
                                    onChange={(e) => setPagamentoData({ ...pagamentoData, data_pagamento: e.target.value })}
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Note Pagamento (opzionale)
                                </label>
                                <textarea
                                    value={pagamentoData.note}
                                    onChange={(e) => setPagamentoData({ ...pagamentoData, note: e.target.value })}
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500"
                                    rows={3}
                                    placeholder="Es: Bonifico bancario, numero transazione..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPagaModal(false)}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => handleMarcaComePagato(selectedMovimento.id)}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                            >
                                Conferma Pagamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Aggiungi Movimento */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Plus className="w-6 h-6 text-purple-600" />
                                Aggiungi Movimento Manuale
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Tipo Movimento *
                                    </label>
                                    <select
                                        value={newMovimento.tipo}
                                        onChange={(e) => setNewMovimento({ ...newMovimento, tipo: e.target.value })}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="compenso">Compenso Agente</option>
                                        <option value="pagamento_cliente">Pagamento Cliente</option>
                                        <option value="rimborso">Rimborso</option>
                                        <option value="altro">Altro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Agente
                                    </label>
                                    <select
                                        value={newMovimento.agent_id}
                                        onChange={(e) => setNewMovimento({ ...newMovimento, agent_id: e.target.value })}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Nessuno</option>
                                        {agenti.map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.nome} {a.cognome}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Importo (€) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newMovimento.importo}
                                        onChange={(e) => setNewMovimento({ ...newMovimento, importo: e.target.value })}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Data Movimento *
                                    </label>
                                    <input
                                        type="date"
                                        value={newMovimento.data_movimento}
                                        onChange={(e) => setNewMovimento({ ...newMovimento, data_movimento: e.target.value })}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Descrizione *
                                </label>
                                <input
                                    type="text"
                                    value={newMovimento.descrizione}
                                    onChange={(e) => setNewMovimento({ ...newMovimento, descrizione: e.target.value })}
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                                    placeholder="Es: Commissione contratto luce, rimborso spese..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Note (opzionale)
                                </label>
                                <textarea
                                    value={newMovimento.note}
                                    onChange={(e) => setNewMovimento({ ...newMovimento, note: e.target.value })}
                                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                                    rows={3}
                                    placeholder="Note aggiuntive..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleAddMovimento}
                                disabled={!newMovimento.importo || !newMovimento.descrizione}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Aggiungi Movimento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Dettagli Movimento */}
            {showDetailsModal && selectedMovimento && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Eye className="w-6 h-6 text-blue-600" />
                                Dettagli Movimento
                            </h3>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="text-sm text-gray-600 mb-1">ID Movimento</div>
                                    <div className="font-mono font-bold text-gray-900">#{selectedMovimento.id}</div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="text-sm text-gray-600 mb-1">Tipo</div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTipoBadge(selectedMovimento.tipo)}`}>
                                        {selectedMovimento.tipo}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-indigo-50 rounded-xl p-6">
                                <div className="text-sm text-indigo-600 mb-1">Importo</div>
                                <div className="text-4xl font-bold text-indigo-900">
                                    €{selectedMovimento.importo.toFixed(2)}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="text-sm text-gray-600 mb-1">Stato</div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatoBadge(selectedMovimento.stato)}`}>
                                        {selectedMovimento.stato}
                                    </span>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="text-sm text-gray-600 mb-1">Data Movimento</div>
                                    <div className="font-semibold text-gray-900">
                                        {new Date(selectedMovimento.data_movimento).toLocaleDateString('it-IT')}
                                    </div>
                                </div>
                            </div>

                            {selectedMovimento.agent_nome && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="text-sm text-gray-600 mb-1">Agente</div>
                                    <div className="font-semibold text-gray-900">
                                        {selectedMovimento.agent_nome} {selectedMovimento.agent_cognome}
                                    </div>
                                </div>
                            )}

                            {selectedMovimento.descrizione && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="text-sm text-gray-600 mb-1">Descrizione</div>
                                    <div className="text-gray-900">{selectedMovimento.descrizione}</div>
                                </div>
                            )}

                            {selectedMovimento.data_pagamento && (
                                <div className="bg-green-50 rounded-xl p-4">
                                    <div className="text-sm text-green-600 mb-1">Data Pagamento</div>
                                    <div className="font-semibold text-green-900">
                                        {new Date(selectedMovimento.data_pagamento).toLocaleDateString('it-IT')}
                                    </div>
                                </div>
                            )}

                            {selectedMovimento.note && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="text-sm text-gray-600 mb-1">Note</div>
                                    <div className="text-gray-900">{selectedMovimento.note}</div>
                                </div>
                            )}

                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="text-sm text-gray-600 mb-1">Creato il</div>
                                <div className="text-xs text-gray-500">
                                    {new Date(selectedMovimento.created_at).toLocaleString('it-IT')}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
