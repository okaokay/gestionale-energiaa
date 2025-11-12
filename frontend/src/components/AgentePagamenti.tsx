import React, { useState, useEffect } from 'react';
import { CalendarIcon, DownloadIcon, EuroIcon, FilterIcon } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Pagamento {
  id: string;
  source_table: string;
  importo: number;
  stato: string;
  data_maturazione: string;
  data_pagamento?: string;
  descrizione: string;
  note?: string;
  tipo: string;
  cliente_nome?: string;
  cliente_cognome?: string;
  cliente_tipo?: string;
  contratto_id?: string;
  contratto_tipo?: string;
}

interface Statistiche {
  totale_effettuati: number;
  totale_da_effettuare: number;
  count_effettuati: number;
  count_da_effettuare: number;
  totale_generale: number;
}

interface AgentePagamentiProps {
  agenteId: string;
}

const AgentePagamenti: React.FC<AgentePagamentiProps> = ({ agenteId }) => {
  const [pagamenti, setPagamenti] = useState<Pagamento[]>([]);
  const [statistiche, setStatistiche] = useState<Statistiche | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataInizio, setDataInizio] = useState('');
  const [dataFine, setDataFine] = useState('');
  const [filtriApplicati, setFiltriApplicati] = useState(false);

  const caricaPagamenti = async (dataInizioParam?: string, dataFineParam?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dataInizioParam) params.append('data_inizio', dataInizioParam);
      if (dataFineParam) params.append('data_fine', dataFineParam);

      const response = await fetch(`/api/agenti/${agenteId}/pagamenti?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPagamenti(data.data.pagamenti);
        setStatistiche(data.data.statistiche);
        setFiltriApplicati(!!(dataInizioParam || dataFineParam));
      } else {
        console.error('Errore nel caricamento dei pagamenti');
      }
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setLoading(false);
    }
  };

  const applicaFiltri = () => {
    caricaPagamenti(dataInizio, dataFine);
  };

  const rimuoviFiltri = () => {
    setDataInizio('');
    setDataFine('');
    setFiltriApplicati(false);
    caricaPagamenti();
  };

  const esportaPagamenti = async (formato: 'csv' | 'excel' = 'csv') => {
    try {
      const params = new URLSearchParams();
      if (dataInizio) params.append('data_inizio', dataInizio);
      if (dataFine) params.append('data_fine', dataFine);
      params.append('formato', formato);

      const response = await fetch(`/api/agenti/${agenteId}/pagamenti/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
        throw new Error(errorData.message || `Errore HTTP: ${response.status}`);
      }

      if (formato === 'csv') {
        const blob = await response.blob();
        
        // Verifica che il blob non sia vuoto
        if (blob.size === 0) {
          throw new Error('Il file CSV è vuoto');
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pagamenti_agente_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Feedback positivo all'utente
        console.log('File CSV scaricato con successo');
      } else {
        // Per Excel, gestire con una libreria come xlsx
        const data = await response.json();
        console.log('Dati per Excel:', data);
        // Implementare export Excel qui se necessario
      }
    } catch (error) {
      console.error('Errore nell\'export:', error);
      // Feedback di errore all'utente
      alert(`Errore durante l'esportazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: it });
  };

  const getStatoBadge = (stato: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (stato?.toLowerCase()) {
      case 'pagato':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            Pagato
          </span>
        );
      case 'in_attesa':
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            In Attesa
          </span>
        );
      case 'scaduto':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            Scaduto
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            {stato || 'Sconosciuto'}
          </span>
        );
    }
  };

  useEffect(() => {
    caricaPagamenti();
  }, [agenteId]);

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      {statistiche && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="p-4">
              <div className="flex items-center space-x-2">
                <EuroIcon className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Pagamenti Effettuati</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(statistiche.totale_effettuati)}
                  </p>
                  <p className="text-xs text-gray-500">{statistiche.count_effettuati} pagamenti</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-4">
              <div className="flex items-center space-x-2">
                <EuroIcon className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Da Effettuare</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(statistiche.totale_da_effettuare)}
                  </p>
                  <p className="text-xs text-gray-500">{statistiche.count_da_effettuare} pagamenti</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-4">
              <div className="flex items-center space-x-2">
                <EuroIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Totale Generale</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(statistiche.totale_generale)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {statistiche.count_effettuati + statistiche.count_da_effettuare} pagamenti
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtri e Azioni */}
      <div className="card">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pagamenti Agente</h3>
            <div className="flex space-x-2">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => esportaPagamenti('csv')}
                disabled={loading}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Esporta CSV
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* Filtri Data */}
          <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filtri per Data:</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm">Dal:</label>
              <input
                type="date"
                value={dataInizio}
                onChange={(e) => setDataInizio(e.target.value)}
                className="input input-sm w-auto"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm">Al:</label>
              <input
                type="date"
                value={dataFine}
                onChange={(e) => setDataFine(e.target.value)}
                className="input input-sm w-auto"
              />
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={applicaFiltri}
              disabled={loading}
            >
              <FilterIcon className="h-4 w-4 mr-2" />
              Applica Filtri
            </button>
            {filtriApplicati && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={rimuoviFiltri}
                disabled={loading}
              >
                Rimuovi Filtri
              </button>
            )}
          </div>

          {/* Tabella Pagamenti */}
          {loading ? (
            <div className="text-center py-8">
              <p>Caricamento pagamenti...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Importo</th>
                    <th>Stato</th>
                    <th>Data Maturazione</th>
                    <th>Data Pagamento</th>
                    <th>Descrizione</th>
                    <th>Cliente</th>
                    <th>Contratto</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamenti.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-500">
                        Nessun pagamento trovato per i filtri selezionati
                      </td>
                    </tr>
                  ) : (
                    pagamenti.map((pagamento) => (
                      <tr key={`${pagamento.source_table}-${pagamento.id}`}>
                        <td className="font-mono text-xs">
                          {pagamento.id.length > 8 ? `${pagamento.id.substring(0, 8)}...` : pagamento.id}
                        </td>
                        <td>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {pagamento.tipo || 'compenso'}
                          </span>
                        </td>
                        <td className="font-semibold">
                          {formatCurrency(pagamento.importo)}
                        </td>
                        <td>
                          {getStatoBadge(pagamento.stato)}
                        </td>
                        <td>{formatDate(pagamento.data_maturazione)}</td>
                        <td>{formatDate(pagamento.data_pagamento || '')}</td>
                        <td className="max-w-xs truncate" title={pagamento.descrizione}>
                          {pagamento.descrizione}
                        </td>
                        <td>
                          {pagamento.cliente_nome ? (
                            <div className="text-sm">
                              <div className="font-medium">
                                {pagamento.cliente_nome} {pagamento.cliente_cognome}
                              </div>
                              <div className="text-gray-500 text-xs">{pagamento.cliente_tipo}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td>
                          {pagamento.contratto_id ? (
                            <div className="text-sm">
                              <div className="font-mono text-xs">
                                {pagamento.contratto_id.length > 8 
                                  ? `${pagamento.contratto_id.substring(0, 8)}...` 
                                  : pagamento.contratto_id}
                              </div>
                              <div className="text-gray-500 text-xs">{pagamento.contratto_tipo}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentePagamenti;