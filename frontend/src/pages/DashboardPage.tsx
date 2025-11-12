/**
 * Dashboard principale con KPI e grafici
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Users, FileText, AlertCircle, TrendingUp, Mail, Zap, Euro, DollarSign } from 'lucide-react';

export default function DashboardPage() {
    const { user } = useAuthStore();
    const isOperatore = user?.ruolo === 'operatore' || user?.ruolo === 'agent';
    const [stats, setStats] = useState<any>(null);
    const [scadenze, setScadenze] = useState<any[]>([]);
    const [hotLeads, setHotLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        loadDashboardData();
    }, []);
    
    const loadDashboardData = async () => {
        try {
            const [statsRes, scadenzeRes, leadsRes] = await Promise.all([
                dashboardAPI.getStats(),
                dashboardAPI.getScadenze(),
                dashboardAPI.getHotLeads(),
            ]);
            
            setStats(statsRes.data.data);
            setScadenze(scadenzeRes.data.data);
            setHotLeads(leadsRes.data.data);
        } catch (error: any) {
            toast.error('Errore caricamento dashboard');
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }
    
    // 🔐 KPI Cards adattive per ruolo
    const kpiCards = isOperatore ? [
        {
            title: 'Miei Clienti',
            value: (stats?.totale_clienti_privati || 0) + (stats?.totale_clienti_aziende || 0),
            subtitle: `${stats?.totale_clienti_privati || 0} privati, ${stats?.totale_clienti_aziende || 0} aziende`,
            icon: Users,
            color: 'bg-blue-500',
        },
        {
            title: 'Contratti Attivi',
            value: (stats?.contratti_luce_attivi || 0) + (stats?.contratti_gas_attivi || 0),
            subtitle: `${stats?.contratti_luce_attivi || 0} luce, ${stats?.contratti_gas_attivi || 0} gas`,
            icon: FileText,
            color: 'bg-green-500',
        },
        {
            title: 'Scadenze 30gg',
            value: (stats?.scadenze_luce_30gg || 0) + (stats?.scadenze_gas_30gg || 0),
            subtitle: 'Contratti da rinnovare',
            icon: AlertCircle,
            color: 'bg-orange-500',
        },
        {
            title: 'Compenso Totale',
            value: `€${(stats?.compensi_totali || 0).toFixed(2)}`,
            subtitle: `Mese: €${(stats?.compensi_mese_corrente || 0).toFixed(2)}`,
            icon: DollarSign,
            color: 'bg-emerald-500',
        },
    ] : [
        {
            title: 'Totale Clienti',
            value: (stats?.totale_clienti_privati || 0) + (stats?.totale_clienti_aziende || 0),
            subtitle: `${stats?.totale_clienti_privati || 0} privati, ${stats?.totale_clienti_aziende || 0} aziende`,
            icon: Users,
            color: 'bg-blue-500',
        },
        {
            title: 'Contratti Attivi',
            value: (stats?.contratti_luce_attivi || 0) + (stats?.contratti_gas_attivi || 0),
            subtitle: `${stats?.contratti_luce_attivi || 0} luce, ${stats?.contratti_gas_attivi || 0} gas`,
            icon: FileText,
            color: 'bg-green-500',
        },
        {
            title: 'Scadenze 30gg',
            value: (stats?.scadenze_luce_30gg || 0) + (stats?.scadenze_gas_30gg || 0),
            subtitle: 'Contratti da rinnovare',
            icon: AlertCircle,
            color: 'bg-orange-500',
        },
        {
            title: 'Hot Leads',
            value: stats?.hot_leads || 0,
            subtitle: `+ ${stats?.warm_leads || 0} warm leads`,
            icon: TrendingUp,
            color: 'bg-red-500',
        },
    ];
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Panoramica generale del gestionale</p>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((kpi, index) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={index} className="card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{kpi.value}</p>
                                    <p className="text-xs text-gray-500 mt-1">{kpi.subtitle}</p>
                                </div>
                                <div className={`p-3 rounded-lg ${kpi.color}`}>
                                    <Icon size={24} className="text-white" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Scadenze Urgenti */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Scadenze Urgenti (30 giorni)</h2>
                    <Link to="/scadenze" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        Vedi tutte →
                    </Link>
                </div>
                
                {scadenze.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nessuna scadenza urgente</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contratto</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornitore</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadenza</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giorni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {scadenze.slice(0, 5).map((scadenza, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {scadenza.nome} {scadenza.cognome}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {scadenza.tipo_contratto.toUpperCase()} - {scadenza.numero_contratto}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{scadenza.fornitore}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {new Date(scadenza.data_scadenza).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                scadenza.giorni_a_scadenza <= 7
                                                    ? 'bg-red-100 text-red-800'
                                                    : scadenza.giorni_a_scadenza <= 15
                                                    ? 'bg-orange-100 text-orange-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {scadenza.giorni_a_scadenza} giorni
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* Hot Leads da AI */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Zap size={24} className="text-yellow-500" />
                        Hot Leads AI - Opportunità di Vendita
                    </h2>
                    <Link to="/offerte" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        Vedi tutti →
                    </Link>
                </div>
                
                {hotLeads.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nessun hot lead disponibile</p>
                ) : (
                    <div className="space-y-3">
                        {hotLeads.slice(0, 5).map((lead, index) => (
                            <div key={index} className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">
                                            {lead.nome} {lead.cognome || ''} {lead.ragione_sociale || ''}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Offerta: <span className="font-medium">{lead.nome_offerta}</span> - {lead.nuovo_fornitore}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Email: {lead.email_principale || lead.email_referente}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-green-600">
                                            €{lead.risparmio_stimato_annuo?.toFixed(2) || '0'}
                                        </p>
                                        <p className="text-xs text-gray-600">risparmio/anno</p>
                                        <span className="inline-block mt-2 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                            SCORE: {lead.score_matching}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

