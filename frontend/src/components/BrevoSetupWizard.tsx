/**
 * Wizard interattivo per guidare il Super Admin nel setup di Brevo
 * Tutorial passo-passo con validazione credenziali
 */

import { useState } from 'react';
import { CheckCircle, Circle, ExternalLink, Copy, AlertCircle, Loader, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { emailAPI, configurazioniAPI } from '../services/api';

interface WizardStep {
    id: number;
    title: string;
    description: string;
    completed: boolean;
}

interface BrevoSetupWizardProps {
    onComplete: () => void;
    onClose: () => void;
}

export default function BrevoSetupWizard({ onComplete, onClose }: BrevoSetupWizardProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [testEmail, setTestEmail] = useState('');
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form credenziali Brevo
    const [brevoConfig, setBrevoConfig] = useState({
        smtp_host: 'smtp-relay.brevo.com',
        smtp_port: '587',
        smtp_user: '',
        smtp_pass: '',
        api_key: '',
        sender_name: 'Gestionale Energia',
        sender_email: '',
    });
    
    const [steps, setSteps] = useState<WizardStep[]>([
        { id: 1, title: 'Registrazione Account Brevo', description: 'Crea un account gratuito su Brevo', completed: false },
        { id: 2, title: 'Verifica Email', description: 'Conferma la tua email di registrazione', completed: false },
        { id: 3, title: 'Ottieni Credenziali SMTP', description: 'Copia le credenziali dalla dashboard Brevo', completed: false },
        { id: 4, title: 'Configura Sistema', description: 'Inserisci le credenziali e salva', completed: false },
        { id: 5, title: 'Test Connessione', description: 'Verifica che tutto funzioni', completed: false },
    ]);
    
    const markStepCompleted = (stepId: number) => {
        setSteps(steps.map(s => s.id === stepId ? { ...s, completed: true } : s));
        if (stepId < 5) {
            setCurrentStep(stepId + 1);
        }
    };
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copiato negli appunti!');
    };
    
    // Salva configurazioni Brevo nel database
    const handleSaveConfig = async () => {
        if (!brevoConfig.smtp_user || !brevoConfig.smtp_pass) {
            toast.error('Inserisci almeno SMTP User e SMTP Pass');
            return;
        }
        
        if (!brevoConfig.sender_email) {
            toast.error('Inserisci l\'email mittente (sender)');
            return;
        }
        
        setSaving(true);
        try {
            await configurazioniAPI.updateMany([
                { chiave: 'brevo_smtp_host', valore: brevoConfig.smtp_host },
                { chiave: 'brevo_smtp_port', valore: brevoConfig.smtp_port },
                { chiave: 'brevo_smtp_user', valore: brevoConfig.smtp_user },
                { chiave: 'brevo_smtp_pass', valore: brevoConfig.smtp_pass },
                { chiave: 'brevo_api_key', valore: brevoConfig.api_key || '' },
                { chiave: 'email_sender_name', valore: brevoConfig.sender_name },
                { chiave: 'email_sender_address', valore: brevoConfig.sender_email },
            ]);
            
            toast.success('✅ Configurazioni salvate con successo!');
            markStepCompleted(4);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore nel salvataggio delle configurazioni');
        } finally {
            setSaving(false);
        }
    };
    
    const handleTestEmail = async () => {
        if (!testEmail) {
            toast.error('Inserisci un indirizzo email valido');
            return;
        }
        
        setTesting(true);
        try {
            await emailAPI.sendTestEmail(testEmail);
            toast.success(`Email di test inviata a ${testEmail}! Controlla la tua casella.`);
            markStepCompleted(5);
            
            // Attendi 2 secondi e completa wizard
            setTimeout(() => {
                onComplete();
            }, 2000);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore invio email di test. Verifica le credenziali Brevo nel .env');
        } finally {
            setTesting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <h2 className="text-2xl font-bold mb-2">🚀 Setup Brevo Email Marketing</h2>
                    <p className="text-blue-100">Segui questa guida passo-passo per configurare l'invio email</p>
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
                                        ? 'bg-blue-500 border-blue-500 text-white'
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
                    {/* STEP 1: Registrazione */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">📝 Step 1: Registra Account Brevo</h3>
                            <p className="text-gray-600">
                                Brevo (ex Sendinblue) offre un piano <strong>GRATUITO</strong> con <strong>300 email al giorno</strong> - perfetto per iniziare!
                            </p>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-blue-900 font-medium mb-2">🎁 Cosa include il piano gratuito:</p>
                                <ul className="text-blue-800 space-y-1 text-sm">
                                    <li>✅ 300 email/giorno (9,000/mese)</li>
                                    <li>✅ Contatti illimitati</li>
                                    <li>✅ Tracking aperture e click</li>
                                    <li>✅ Template email personalizzabili</li>
                                    <li>✅ API SMTP completo</li>
                                </ul>
                            </div>
                            
                            <div className="space-y-3">
                                <p className="font-medium text-gray-900">Passi da seguire:</p>
                                <ol className="space-y-2 text-gray-700">
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
                                        <span>Vai su <strong>https://www.brevo.com</strong></span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
                                        <span>Clicca su <strong>"Registrati Gratis"</strong> in alto a destra</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
                                        <span>Compila il form con: email, password, nome azienda</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">4</span>
                                        <span>Accetta i termini di servizio e clicca <strong>"Crea Account"</strong></span>
                                    </li>
                                </ol>
                            </div>
                            
                            <a 
                                href="https://www.brevo.com/products/email-api/smtp-relay/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-primary w-full flex items-center justify-center gap-2"
                            >
                                <ExternalLink size={18} />
                                Apri Brevo.com in una nuova tab
                            </a>
                            
                            <button 
                                onClick={() => markStepCompleted(1)}
                                className="btn btn-secondary w-full"
                            >
                                ✅ Ho completato la registrazione, continua
                            </button>
                        </div>
                    )}
                    
                    {/* STEP 2: Verifica Email */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">📧 Step 2: Verifica Email</h3>
                            <p className="text-gray-600">
                                Brevo ti ha inviato un'email di conferma. Devi verificarla prima di poter usare il servizio.
                            </p>
                            
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <AlertCircle className="text-yellow-600 mr-3 mt-0.5" size={20} />
                                    <div>
                                        <p className="text-yellow-900 font-medium">⚠️ Importante</p>
                                        <p className="text-yellow-800 text-sm mt-1">
                                            Senza la verifica email, non potrai inviare messaggi. Controlla anche la cartella SPAM!
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <p className="font-medium text-gray-900">Cosa fare:</p>
                                <ol className="space-y-2 text-gray-700">
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
                                        <span>Apri la tua casella email (quella usata per registrarti)</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
                                        <span>Cerca un'email da <strong>Brevo / Sendinblue</strong></span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
                                        <span>Oggetto: <strong>"Confirm your Brevo account"</strong></span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">4</span>
                                        <span>Clicca sul link di conferma nell'email</span>
                                    </li>
                                </ol>
                            </div>
                            
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                                <p className="font-medium text-gray-900 mb-2">💡 Non hai ricevuto l'email?</p>
                                <ul className="space-y-1">
                                    <li>• Controlla la cartella SPAM/Posta Indesiderata</li>
                                    <li>• Attendi qualche minuto (può richiedere fino a 5 minuti)</li>
                                    <li>• Accedi a Brevo e vai su Settings per reinviare l'email</li>
                                </ul>
                            </div>
                            
                            <button 
                                onClick={() => markStepCompleted(2)}
                                className="btn btn-primary w-full"
                            >
                                ✅ Email verificata, continua
                            </button>
                        </div>
                    )}
                    
                    {/* STEP 3: Credenziali SMTP */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">🔑 Step 3: Ottieni Credenziali SMTP</h3>
                            <p className="text-gray-600">
                                Ora devi copiare le tue credenziali SMTP dalla dashboard Brevo.
                            </p>
                            
                            <div className="space-y-3">
                                <p className="font-medium text-gray-900">Passi da seguire nella dashboard Brevo:</p>
                                <ol className="space-y-3 text-gray-700">
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">1</span>
                                        <div>
                                            <p>Accedi a <strong>Brevo Dashboard</strong></p>
                                            <a href="https://app.brevo.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1 mt-1">
                                                https://app.brevo.com <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">2</span>
                                        <span>In alto a destra, clicca sul tuo nome → <strong>"Settings"</strong></span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">3</span>
                                        <span>Nel menu laterale sinistro, vai su <strong>"SMTP & API"</strong></span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5 flex-shrink-0">4</span>
                                        <span>Nella sezione <strong>"SMTP"</strong>, troverai le tue credenziali</span>
                                    </li>
                                </ol>
                            </div>
                            
                            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                                <p className="text-green-900 font-bold mb-3">📋 Informazioni da copiare:</p>
                                <div className="space-y-3 text-sm">
                                    <div className="bg-white rounded p-3 border border-green-200">
                                        <p className="text-gray-600 mb-1">SMTP Server:</p>
                                        <div className="flex items-center justify-between">
                                            <code className="text-gray-900 font-mono">smtp-relay.brevo.com</code>
                                            <button onClick={() => copyToClipboard('smtp-relay.brevo.com')} className="text-blue-600 hover:text-blue-700">
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded p-3 border border-green-200">
                                        <p className="text-gray-600 mb-1">Port:</p>
                                        <div className="flex items-center justify-between">
                                            <code className="text-gray-900 font-mono">587</code>
                                            <button onClick={() => copyToClipboard('587')} className="text-blue-600 hover:text-blue-700">
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded p-3 border border-green-200">
                                        <p className="text-gray-600 mb-1">Login (email Brevo):</p>
                                        <p className="text-gray-900 font-mono text-xs">la-tua-email@esempio.it</p>
                                    </div>
                                    
                                    <div className="bg-white rounded p-3 border border-green-200">
                                        <p className="text-gray-600 mb-1">Master Password / SMTP Key:</p>
                                        <p className="text-gray-900 font-mono text-xs">xsmtpsib-xxxxxxxxxxxx...</p>
                                        <p className="text-orange-600 text-xs mt-1">⚠️ Copia questa chiave! Non potrai rivederla dopo</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                                <p className="text-purple-900 font-bold mb-3">📧 Verifica anche l'Email Mittente (Sender):</p>
                                <ol className="space-y-2 text-sm text-purple-800">
                                    <li className="flex items-start">
                                        <span className="bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">1</span>
                                        <span>Sempre nelle Settings, vai su <strong>"Senders, domains & dedicated IPs"</strong></span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">2</span>
                                        <span>Verifica quale email è <strong>verificata</strong> (ha una spunta verde ✅)</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">3</span>
                                        <span>Usa QUELLA email come "Email Mittente" nel prossimo step!</span>
                                    </li>
                                </ol>
                                <div className="mt-3 p-2 bg-white rounded border border-purple-200">
                                    <p className="text-xs text-purple-700">
                                        ⚠️ <strong>IMPORTANTE:</strong> Puoi inviare email SOLO da indirizzi verificati su Brevo!
                                    </p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => markStepCompleted(3)}
                                className="btn btn-primary w-full"
                            >
                                ✅ Ho copiato le credenziali e verificato il sender, continua
                            </button>
                        </div>
                    )}
                    
                    {/* STEP 4: Configurazione Backend */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">⚙️ Step 4: Configura Sistema</h3>
                            <p className="text-gray-600">
                                Incolla le credenziali Brevo ottenute nello step precedente e salvale nel sistema.
                            </p>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <AlertCircle className="text-blue-600 mr-3 mt-0.5 flex-shrink-0" size={20} />
                                    <div>
                                        <p className="text-blue-900 font-medium">✅ Configurazione Automatica</p>
                                        <p className="text-blue-800 text-sm mt-1">
                                            Le credenziali vengono salvate direttamente nel database. Non serve modificare file .env!
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        SMTP Host
                                    </label>
                                    <input
                                        type="text"
                                        value={brevoConfig.smtp_host}
                                        onChange={(e) => setBrevoConfig({ ...brevoConfig, smtp_host: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="smtp-relay.brevo.com"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        SMTP Port
                                    </label>
                                    <input
                                        type="text"
                                        value={brevoConfig.smtp_port}
                                        onChange={(e) => setBrevoConfig({ ...brevoConfig, smtp_port: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="587"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        SMTP User (Email Login) *
                                    </label>
                                    <input
                                        type="email"
                                        value={brevoConfig.smtp_user}
                                        onChange={(e) => setBrevoConfig({ ...brevoConfig, smtp_user: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="tua-email@esempio.it"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        SMTP Password (SMTP Key) *
                                    </label>
                                    <input
                                        type="password"
                                        value={brevoConfig.smtp_pass}
                                        onChange={(e) => setBrevoConfig({ ...brevoConfig, smtp_pass: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="xsmtpsib-xxxxxxxxxxxxxxxxxxxx"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        API Key (opzionale, per tracking avanzato)
                                    </label>
                                    <input
                                        type="password"
                                        value={brevoConfig.api_key}
                                        onChange={(e) => setBrevoConfig({ ...brevoConfig, api_key: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxx"
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                                <h4 className="font-semibold text-purple-900 mb-3">📧 Configurazione Email Mittente</h4>
                                <p className="text-sm text-purple-700 mb-4">
                                    Queste informazioni appariranno come mittente nelle email inviate. Usa l'email verificata su Brevo!
                                </p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nome Mittente *
                                        </label>
                                        <input
                                            type="text"
                                            value={brevoConfig.sender_name}
                                            onChange={(e) => setBrevoConfig({ ...brevoConfig, sender_name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            placeholder="Gestionale Energia"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Mittente (Sender) *
                                        </label>
                                        <input
                                            type="email"
                                            value={brevoConfig.sender_email}
                                            onChange={(e) => setBrevoConfig({ ...brevoConfig, sender_email: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            placeholder="okaokay73@gmail.com"
                                            required
                                        />
                                        <p className="text-xs text-purple-600 mt-1">
                                            ⚠️ Deve essere un'email verificata su Brevo!
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleSaveConfig}
                                disabled={saving || !brevoConfig.smtp_user || !brevoConfig.smtp_pass || !brevoConfig.sender_email}
                                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {saving ? (
                                    <>
                                        <Loader className="animate-spin mr-2" size={20} />
                                        Salvataggio...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2" size={20} />
                                        Salva Configurazioni
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                    
                    {/* STEP 5: Test Connessione */}
                    {currentStep === 5 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">🧪 Step 5: Test Connessione</h3>
                            <p className="text-gray-600">
                                Ultimo step! Verifichiamo che tutto funzioni inviando un'email di test.
                            </p>
                            
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-green-900 font-medium mb-2">🎉 Quasi fatto!</p>
                                <p className="text-green-800 text-sm">
                                    Inserisci il tuo indirizzo email personale per ricevere un messaggio di test dal sistema.
                                </p>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="block">
                                    <span className="text-gray-700 font-medium">📧 Tuo indirizzo email:</span>
                                    <input
                                        type="email"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        placeholder="mario.rossi@gmail.com"
                                        className="input mt-2"
                                        disabled={testing}
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Usa la tua email personale per verificare che arrivi il messaggio
                                    </p>
                                </label>
                                
                                <button 
                                    onClick={handleTestEmail}
                                    disabled={testing || !testEmail}
                                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    {testing ? (
                                        <>
                                            <Loader className="animate-spin" size={18} />
                                            Invio in corso...
                                        </>
                                    ) : (
                                        <>
                                            📤 Invia Email di Test
                                        </>
                                    )}
                                </button>
                            </div>
                            
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                                <p className="text-yellow-900 font-medium mb-2">⏱️ Cosa succede dopo il click:</p>
                                <ol className="text-yellow-800 space-y-1">
                                    <li>1. Il backend proverà a inviare l'email tramite Brevo</li>
                                    <li>2. Se le credenziali sono corrette, riceverai l'email in pochi secondi</li>
                                    <li>3. Controlla anche la cartella SPAM se non vedi nulla</li>
                                    <li>4. Se ricevi l'email, il setup è completato! 🎉</li>
                                </ol>
                            </div>
                            
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                                <p className="text-red-900 font-medium mb-2">❌ Se l'email NON arriva:</p>
                                <ul className="text-red-800 space-y-1">
                                    <li>• Verifica che le credenziali nel .env siano corrette</li>
                                    <li>• Assicurati di aver riavviato il backend dopo aver modificato il .env</li>
                                    <li>• Controlla i log del backend per eventuali errori</li>
                                    <li>• Verifica che il tuo account Brevo sia stato confermato via email</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                    <button onClick={onClose} className="btn btn-secondary">
                        Chiudi e Completa Dopo
                    </button>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Circle size={16} className={steps[0].completed ? 'text-green-500 fill-green-500' : ''} />
                        <Circle size={16} className={steps[1].completed ? 'text-green-500 fill-green-500' : ''} />
                        <Circle size={16} className={steps[2].completed ? 'text-green-500 fill-green-500' : ''} />
                        <Circle size={16} className={steps[3].completed ? 'text-green-500 fill-green-500' : ''} />
                        <Circle size={16} className={steps[4].completed ? 'text-green-500 fill-green-500' : ''} />
                    </div>
                </div>
            </div>
        </div>
    );
}

