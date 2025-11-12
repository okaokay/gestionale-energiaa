/**
 * Wizard interattivo per configurare il Webhook Brevo
 * Guida step-by-step per tracking real-time email
 */

import { useState } from 'react';
import { CheckCircle, Circle, ExternalLink, Copy, AlertCircle, Activity, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface WizardStep {
    id: number;
    title: string;
    description: string;
    completed: boolean;
}

interface WebhookSetupWizardProps {
    onComplete: () => void;
    onClose: () => void;
}

export default function WebhookSetupWizard({ onComplete, onClose }: WebhookSetupWizardProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [webhookUrl, setWebhookUrl] = useState('');
    
    const [steps, setSteps] = useState<WizardStep[]>([
        { id: 1, title: 'Preparazione URL Webhook', description: 'Identifica l\'URL del tuo backend', completed: false },
        { id: 2, title: 'Accedi a Brevo Webhook', description: 'Naviga alle impostazioni webhook', completed: false },
        { id: 3, title: 'Configura Webhook', description: 'Inserisci URL e seleziona eventi', completed: false },
        { id: 4, title: 'Test Webhook', description: 'Verifica la connessione', completed: false },
    ]);
    
    const markStepCompleted = (stepId: number) => {
        setSteps(steps.map(s => s.id === stepId ? { ...s, completed: true } : s));
        if (stepId < 4) {
            setCurrentStep(stepId + 1);
        } else {
            // Ultimo step completato
            setTimeout(() => {
                onComplete();
            }, 1500);
        }
    };
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copiato negli appunti!');
    };
    
    // Ottieni URL backend dalla stessa origine (evita hardcode di localhost)
    const backendUrl = window.location.origin;
    
    const fullWebhookUrl = `${webhookUrl || backendUrl}/api/emails/webhook/brevo`;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        <Activity size={28} />
                        Configurazione Webhook Brevo
                    </h2>
                    <p className="text-purple-100">Attiva il tracking real-time di aperture, click e statistiche email</p>
                </div>
                
                {/* Progress Bar */}
                <div className="px-6 py-4 bg-gray-50 border-b">
                    <div className="flex items-center justify-between mb-2">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center flex-1">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                                    step.completed 
                                        ? 'bg-green-500 border-green-500 text-white' 
                                        : step.id === currentStep
                                        ? 'bg-purple-500 border-purple-500 text-white'
                                        : 'bg-white border-gray-300 text-gray-400'
                                }`}>
                                    {step.completed ? <CheckCircle size={20} /> : step.id}
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`flex-1 h-1 mx-2 ${
                                        step.completed ? 'bg-green-500' : 'bg-gray-300'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="text-sm text-gray-600 text-center mt-2">
                        Step {currentStep} di {steps.length}: {steps[currentStep - 1].title}
                    </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                    {/* STEP 1: Preparazione URL */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">🔗 Step 1: Identifica URL del Backend</h3>
                            <p className="text-gray-600">
                                Prima di configurare il webhook su Brevo, devi avere l'URL pubblico del tuo backend.
                            </p>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-blue-900 font-medium mb-2">📌 Cosa serve:</p>
                                <ul className="text-blue-800 space-y-1 text-sm">
                                    <li>✅ Il backend deve essere <strong>pubblicamente accessibile</strong> da Internet</li>
                                    <li>✅ Dominio o IP pubblico (es. <code className="bg-blue-100 px-1 rounded">https://tuo-dominio.it</code>)</li>
                                    <li>✅ Backend in esecuzione e raggiungibile</li>
                                </ul>
                            </div>
                            
                            <div className="space-y-3">
                                <p className="font-medium text-gray-900">Seleziona il tuo scenario:</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Produzione */}
                                    <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                                        <h4 className="font-bold text-green-900 mb-2">✅ Backend in Produzione</h4>
                                        <p className="text-sm text-green-800 mb-3">
                                            Il tuo backend è già online con dominio pubblico
                                        </p>
                                        <div className="space-y-2">
                                            <label className="text-xs text-green-700 font-medium block">
                                                Inserisci URL backend:
                                            </label>
                                            <input
                                                type="url"
                                                value={webhookUrl}
                                                onChange={(e) => setWebhookUrl(e.target.value)}
                                                placeholder="https://api.tuo-dominio.it"
                                                className="input text-sm"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Sviluppo */}
                                    <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
                                        <h4 className="font-bold text-orange-900 mb-2">🧪 Test in Locale (ngrok)</h4>
                                        <p className="text-sm text-orange-800 mb-3">
                                            Backend su localhost, serve tunnel pubblico
                                        </p>
                                        <div className="bg-orange-100 rounded p-3 text-xs space-y-2">
                                            <p className="font-medium text-orange-900">Come procedere:</p>
                                            <ol className="text-orange-800 space-y-1 ml-4 list-decimal">
                                                <li>Installa ngrok: <code className="bg-white px-1 rounded">npm install -g ngrok</code></li>
                                                <li>Avvia tunnel: <code className="bg-white px-1 rounded">ngrok http 3001</code></li>
                                                <li>Copia URL pubblico (es. https://abc123.ngrok.io)</li>
                                                <li>Inseriscilo sopra nel campo URL</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                                <p className="text-purple-900 font-bold mb-2">📋 URL Webhook Completo:</p>
                                <div className="bg-white rounded p-3 border border-purple-200 flex items-center justify-between">
                                    <code className="text-sm text-purple-900 break-all">{fullWebhookUrl}</code>
                                    <button 
                                        onClick={() => copyToClipboard(fullWebhookUrl)}
                                        className="ml-2 text-purple-600 hover:text-purple-700 flex-shrink-0"
                                    >
                                        <Copy size={18} />
                                    </button>
                                </div>
                                <p className="text-xs text-purple-700 mt-2">
                                    ✅ Questo è l'URL che configurerai su Brevo nel prossimo step
                                </p>
                            </div>
                            
                            <button 
                                onClick={() => markStepCompleted(1)}
                                className="btn btn-primary w-full"
                            >
                                ✅ Ho l'URL pronto, continua
                            </button>
                        </div>
                    )}
                    
                    {/* STEP 2: Accedi a Brevo */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">🌐 Step 2: Accedi alle Impostazioni Webhook</h3>
                            <p className="text-gray-600">
                                Naviga alla sezione webhook nella dashboard Brevo.
                            </p>
                            
                            <div className="space-y-3">
                                <p className="font-medium text-gray-900">Passi da seguire:</p>
                                <ol className="space-y-3 text-gray-700">
                                    <li className="flex items-start">
                                        <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">1</span>
                                        <div>
                                            <p>Accedi a <strong>Brevo Dashboard</strong></p>
                                            <a href="https://app.brevo.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1 mt-1">
                                                https://app.brevo.com <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">2</span>
                                        <span>Clicca sul tuo nome in alto a destra → <strong>"Settings"</strong></span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">3</span>
                                        <span>Nel menu laterale, vai su <strong>"Transactional"</strong> → <strong>"Webhooks"</strong></span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">4</span>
                                        <span>Clicca sul pulsante <strong>"Add a new webhook"</strong></span>
                                    </li>
                                </ol>
                            </div>
                            
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <AlertCircle className="text-yellow-600 mr-3 mt-0.5 flex-shrink-0" size={20} />
                                    <div>
                                        <p className="text-yellow-900 font-medium">💡 Non trovi "Webhooks"?</p>
                                        <p className="text-yellow-800 text-sm mt-1">
                                            Assicurati di essere nella sezione <strong>"Transactional"</strong> (email transazionali) e non "Campaigns" (campagne marketing).
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <a 
                                href="https://app.brevo.com/settings/webhooks" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-primary w-full flex items-center justify-center gap-2"
                            >
                                <ExternalLink size={18} />
                                Apri Brevo Webhooks (nuova tab)
                            </a>
                            
                            <button 
                                onClick={() => markStepCompleted(2)}
                                className="btn btn-secondary w-full"
                            >
                                ✅ Sono nella pagina Webhooks, continua
                            </button>
                        </div>
                    )}
                    
                    {/* STEP 3: Configurazione */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">⚙️ Step 3: Configura il Webhook</h3>
                            <p className="text-gray-600">
                                Inserisci i dati del webhook nel form di Brevo.
                            </p>
                            
                            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                                <p className="text-green-900 font-bold mb-3">📋 Dati da inserire nel form Brevo:</p>
                                
                                {/* URL */}
                                <div className="space-y-2 mb-4">
                                    <label className="text-sm font-medium text-green-800">1️⃣ Webhook URL:</label>
                                    <div className="bg-white rounded p-3 border border-green-200 flex items-center justify-between">
                                        <code className="text-xs text-green-900 break-all">{fullWebhookUrl}</code>
                                        <button 
                                            onClick={() => copyToClipboard(fullWebhookUrl)}
                                            className="ml-2 text-green-600 hover:text-green-700 flex-shrink-0"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Eventi */}
                                <div className="space-y-2 mb-4">
                                    <label className="text-sm font-medium text-green-800">2️⃣ Eventi da selezionare (TUTTI):</label>
                                    <div className="bg-white rounded p-3 border border-green-200">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Check size={14} className="text-green-600" />
                                                <span>Email sent</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check size={14} className="text-green-600" />
                                                <span>Email delivered</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check size={14} className="text-green-600" />
                                                <span>Email opened</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check size={14} className="text-green-600" />
                                                <span>Email clicked</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check size={14} className="text-green-600" />
                                                <span>Soft bounce</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check size={14} className="text-green-600" />
                                                <span>Hard bounce</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check size={14} className="text-green-600" />
                                                <span>Spam</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check size={14} className="text-green-600" />
                                                <span>Blocked</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check size={14} className="text-green-600" />
                                                <span>Unsubscribe</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Altre impostazioni */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-green-800">3️⃣ Altre impostazioni:</label>
                                    <div className="bg-white rounded p-3 border border-green-200 text-xs space-y-1">
                                        <p><strong>HTTP Method:</strong> POST</p>
                                        <p><strong>Content-Type:</strong> application/json</p>
                                        <p><strong>Authentication:</strong> None (lascia vuoto)</p>
                                        <p><strong>Batch events:</strong> No (lascia disabilitato)</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                                <p className="text-blue-900 font-medium mb-2">💡 Suggerimenti:</p>
                                <ul className="text-blue-800 space-y-1">
                                    <li>• Copia l'URL con il pulsante <Copy size={12} className="inline" /> sopra</li>
                                    <li>• Seleziona <strong>TUTTI</strong> gli eventi per tracking completo</li>
                                    <li>• Non serve autenticazione, il backend accetta chiamate pubbliche</li>
                                    <li>• Dopo aver salvato, Brevo mostrerà lo stato "Active"</li>
                                </ul>
                            </div>
                            
                            <button 
                                onClick={() => markStepCompleted(3)}
                                className="btn btn-primary w-full"
                            >
                                ✅ Ho configurato il webhook su Brevo, continua
                            </button>
                        </div>
                    )}
                    
                    {/* STEP 4: Test */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">🧪 Step 4: Test Webhook</h3>
                            <p className="text-gray-600">
                                Verifica che il webhook sia configurato correttamente e funzioni.
                            </p>
                            
                            <div className="space-y-3">
                                <p className="font-medium text-gray-900">Come testare:</p>
                                <ol className="space-y-3 text-gray-700">
                                    <li className="flex items-start">
                                        <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">1</span>
                                        <span>Nella dashboard Brevo, clicca sul pulsante <strong>"Test webhook"</strong> accanto al webhook appena creato</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">2</span>
                                        <span>Brevo invierà una richiesta di test al tuo backend</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">3</span>
                                        <div>
                                            <p>Controlla che il backend risponda <strong>200 OK</strong></p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Puoi verificare nel terminale del backend, dovresti vedere:
                                            </p>
                                            <code className="block bg-gray-900 text-green-400 p-2 rounded mt-2 text-xs">
                                                📨 Webhook Brevo ricevuto: test per test@example.com
                                            </code>
                                        </div>
                                    </li>
                                </ol>
                            </div>
                            
                            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                                <p className="text-green-900 font-bold mb-2">✅ Risposta attesa da Brevo:</p>
                                <div className="bg-white rounded p-3 border border-green-200">
                                    <pre className="text-xs text-green-900">{`{
  "success": true,
  "message": "Webhook processato"
}`}</pre>
                                </div>
                                <p className="text-xs text-green-700 mt-2">
                                    Se vedi questo, il webhook è configurato correttamente! 🎉
                                </p>
                            </div>
                            
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                                <p className="text-yellow-900 font-medium mb-2">⚠️ Se il test fallisce:</p>
                                <ul className="text-yellow-800 space-y-1">
                                    <li>• Verifica che l'URL sia corretto e raggiungibile</li>
                                    <li>• Assicurati che il backend sia in esecuzione</li>
                                    <li>• Se usi ngrok, verifica che il tunnel sia attivo</li>
                                    <li>• Controlla i log del backend per eventuali errori</li>
                                </ul>
                            </div>
                            
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <p className="text-purple-900 font-medium mb-2">🎯 Test Real-World:</p>
                                <p className="text-purple-800 text-sm">
                                    Per un test completo, vai su <strong>Email Marketing → Statistiche</strong> e clicca 
                                    <strong>"Setup Brevo"</strong> per inviare un'email di test. Quando la apri, il webhook 
                                    registrerà automaticamente l'apertura! 📧
                                </p>
                            </div>
                            
                            <button 
                                onClick={() => markStepCompleted(4)}
                                className="btn btn-primary w-full flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={18} />
                                🎉 Test riuscito, completa wizard!
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                    <button onClick={onClose} className="btn btn-secondary">
                        Chiudi e Completa Dopo
                    </button>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        {steps.map((step) => (
                            <Circle 
                                key={step.id}
                                size={16} 
                                className={step.completed ? 'text-green-500 fill-green-500' : ''} 
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

