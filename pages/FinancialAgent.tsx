
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { CalculatorInputs, FinancialModel, CompensationResult, SavedFinancialSimulation } from '../types';
import { calculateStudioRevenue, calculateProfessionalRevenue, calculateCompensation } from '../services/calculatorService';
import { generateFinancialAnalysis } from '../services/geminiService';
import { fetchSimulations, saveSimulation, deleteSimulation } from '../services/financialService'; 
import { CalculatorForm } from '../components/calculator/CalculatorForm';
import { ResultsTable } from '../components/calculator/ResultsTable';
import { ResultsChart } from '../components/calculator/ResultsChart';
import { SavedFinancialList } from '../components/calculator/SavedFinancialList';
import { Button } from '../components/ui/Button';
import { Calculator, TrendingUp, Sparkles, Loader2, Download, Save, History, Building2, Banknote } from 'lucide-react';
import { fetchProfile } from '../services/storage';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const initialInputs: CalculatorInputs = {
    hoursPerDay: 8,
    clientsPerHour: 4,
    sessionsPerWeekPerClient: 2,
    workingDaysPerMonth: 22,
    occupancyRate: 70,
    monthlyPricePerClient: 350,
    professionalHoursPerWeek: 20,
    professionalClientsPerHour: 4,
    professionalOccupancyRate: 70,
    salaryRevenuePercentage: 30,
    baseSalary: 2000,
    useProposedSalary: true,
    issPercentage: 5,
    pjSimplesPercentage: 6,
    otherChargesPercentage: 0,
};

const initialFinancialModel: FinancialModel = {
    payroll: 40,
    operatingCosts: 30,
    reserves: 20,
    workingCapital: 10,
};

export const FinancialAgent: React.FC = () => {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    
    // State
    const [inputs, setInputs] = useState<CalculatorInputs>(initialInputs);
    const [financialModel, setFinancialModel] = useState<FinancialModel>(initialFinancialModel);
    const [results, setResults] = useState<CompensationResult[]>([]);
    
    const [metrics, setMetrics] = useState({
        targetRevenue: 0,
        potentialRevenue: 0,
        maxCapacity: 0,
        professionalRevenue: 0
    });

    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [savedSimulations, setSavedSimulations] = useState<SavedFinancialSimulation[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [studioLogo, setStudioLogo] = useState<string | null>(null);
    const [studioName, setStudioName] = useState<string>('');

    useEffect(() => {
        loadHistory();
        if (user?.id) {
            fetchProfile(user.id).then(p => {
                if (p) {
                    setStudioName(p.studioName);
                    setStudioLogo(p.logoUrl || null);
                }
            });
        }
    }, [user]);

    const loadHistory = async () => {
        const data = await fetchSimulations();
        setSavedSimulations(data);
    };

    useEffect(() => {
        const studioRev = calculateStudioRevenue(inputs);
        const profRev = calculateProfessionalRevenue(inputs);
        
        setMetrics({
            targetRevenue: studioRev.targetRevenue,
            potentialRevenue: studioRev.potentialRevenue,
            maxCapacity: studioRev.maxCapacity,
            professionalRevenue: profRev
        });

        if (profRev > 0) {
            const calculatedResults = calculateCompensation({
                professionalRevenue: profRev,
                useProposedSalary: inputs.useProposedSalary,
                baseSalary: inputs.baseSalary,
                salaryRevenuePercentage: inputs.salaryRevenuePercentage,
                issPercentage: inputs.issPercentage,
                pjSimplesPercentage: inputs.pjSimplesPercentage,
                otherChargesPercentage: inputs.otherChargesPercentage,
                totalRevenue: studioRev.targetRevenue,
                payrollPercentage: financialModel.payroll,
            });
            setResults(calculatedResults);
        } else {
            setResults([]);
        }
    }, [inputs, financialModel]);

    const handleGenerateAnalysis = async () => {
        setIsAiLoading(true);
        const analysis = await generateFinancialAnalysis(
            inputs,
            financialModel,
            results,
            metrics.targetRevenue,
            metrics.potentialRevenue,
            metrics.maxCapacity,
            metrics.professionalRevenue,
            language 
        );
        setAiAnalysis(analysis);
        setIsAiLoading(false);
    };

    const handleSaveSimulation = async () => {
        if (!user?.id) return;
        const title = prompt(t('save') + "...", `Simulação ${new Date().toLocaleDateString()}`);
        if (!title) return;

        setIsSaving(true);
        const simulationData = { inputs, financialModel, results, metrics, aiAnalysis };
        const result = await saveSimulation(user.id, title, simulationData);

        if (result.success) {
            alert(t('save') + " ok!");
            loadHistory();
        } else {
            alert("Erro: " + result.error);
        }
        setIsSaving(false);
    };

    const handleLoadSimulation = (sim: SavedFinancialSimulation) => {
        setInputs(sim.inputs);
        setFinancialModel(sim.financialModel);
        setAiAnalysis(sim.aiAnalysis || '');
        setShowHistory(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteSimulation = async (id: string) => {
        if (confirm(t('delete') + "?")) {
            await deleteSimulation(id);
            loadHistory();
        }
    };

    if (showHistory) {
        return (
            <SavedFinancialList 
                savedSimulations={savedSimulations}
                onLoad={handleLoadSimulation}
                onDelete={handleDeleteSimulation}
                onBack={() => setShowHistory(false)}
            />
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calculator className="h-8 w-8 text-brand-600" /> {t('finance_title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t('finance_subtitle')}</p>
                </div>
                <div className="flex gap-2">
                     <Button variant="outline" onClick={() => setShowHistory(true)}>
                        <History className="h-4 w-4 mr-2" /> {t('history')}
                     </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    {/* CUSTOM RENDER OF CALCULATOR FORM TO APPLY TRANSLATION */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">{t('calc_studio_capacity')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1 mb-4">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lbl_monthly_price')}</label>
                                    <input className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" type="number" value={inputs.monthlyPricePerClient} onChange={e => setInputs({...inputs, monthlyPricePerClient: parseFloat(e.target.value)||0})}/>
                                </div>
                                <div className="flex flex-col gap-1 mb-4">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lbl_occupancy')}</label>
                                    <input className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" type="number" value={inputs.occupancyRate} onChange={e => setInputs({...inputs, occupancyRate: parseFloat(e.target.value)||0})}/>
                                </div>
                                <div className="flex flex-col gap-1 mb-4">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lbl_hours_day')}</label>
                                    <input className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" type="number" value={inputs.hoursPerDay} onChange={e => setInputs({...inputs, hoursPerDay: parseFloat(e.target.value)||0})}/>
                                </div>
                                <div className="flex flex-col gap-1 mb-4">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lbl_clients_hour')}</label>
                                    <input className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" type="number" value={inputs.clientsPerHour} onChange={e => setInputs({...inputs, clientsPerHour: parseFloat(e.target.value)||0})}/>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">{t('calc_professional_data')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1 mb-4">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lbl_prof_hours')}</label>
                                    <input className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" type="number" value={inputs.professionalHoursPerWeek} onChange={e => setInputs({...inputs, professionalHoursPerWeek: parseFloat(e.target.value)||0})}/>
                                </div>
                                <div className="flex flex-col gap-1 mb-4">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lbl_commission')}</label>
                                    <input className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" type="number" value={inputs.salaryRevenuePercentage} onChange={e => setInputs({...inputs, salaryRevenuePercentage: parseFloat(e.target.value)||0})}/>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">{t('calc_financial_model')}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1 mb-4">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lbl_payroll')}</label>
                                    <input className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" type="number" value={financialModel.payroll} onChange={e => setFinancialModel({...financialModel, payroll: parseFloat(e.target.value)||0})}/>
                                </div>
                                <div className="flex flex-col gap-1 mb-4">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lbl_operating')}</label>
                                    <input className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" type="number" value={financialModel.operatingCosts} onChange={e => setFinancialModel({...financialModel, operatingCosts: parseFloat(e.target.value)||0})}/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-slate-100 dark:bg-slate-950 p-4 md:p-8 rounded-xl shadow-inner flex justify-center">
                        <div className="bg-white text-slate-800 shadow-xl p-8 w-full max-w-[210mm] min-h-[297mm]">
                            {/* Report Header */}
                            <div className="flex justify-between items-start border-b-4 border-brand-500 pb-4 mb-8">
                                <div>
                                    <h1 className="text-2xl font-extrabold text-slate-900">{t('finance_title')}</h1>
                                    <h2 className="text-lg font-medium text-slate-500">{studioName || 'Studio'}</h2>
                                </div>
                                <div className="text-right">
                                    <Building2 className="h-8 w-8 text-slate-300 mb-1 ml-auto" />
                                    <p className="text-xs text-slate-400">{new Date().toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-lg">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Faturamento Projetado</p>
                                    <p className="text-xl font-bold text-slate-900">R$ {metrics.targetRevenue.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Capacidade</p>
                                    <p className="text-xl font-bold text-slate-900">{metrics.maxCapacity}</p>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h3 className="font-bold text-xl text-brand-700 mb-4 border-b pb-2">{t('actions')}</h3>
                                {results.length > 0 ? <ResultsTable results={results} /> : <p className="text-slate-400">Dados insuficientes.</p>}
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                                    <h3 className="font-bold text-xl flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-purple-600" /> {t('analysis_result')}
                                    </h3>
                                    <Button size="sm" onClick={handleGenerateAnalysis} disabled={isAiLoading || results.length === 0} className="bg-purple-600 hover:bg-purple-700 text-white">
                                        {isAiLoading ? <Loader2 className="animate-spin h-3 w-3"/> : t('generate_analysis')}
                                    </Button>
                                </div>
                                
                                {aiAnalysis ? (
                                    <div className="prose prose-slate max-w-none text-sm text-justify" dangerouslySetInnerHTML={{ __html: aiAnalysis }} />
                                ) : (
                                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg">
                                        <p>Clique para gerar análise.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                 <Button variant="outline" onClick={handleSaveSimulation} isLoading={isSaving}>
                                    <Save className="h-4 w-4 mr-2" /> {t('save')}
                                 </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
