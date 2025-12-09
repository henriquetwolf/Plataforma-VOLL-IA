import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { CalculatorInputs, FinancialModel, CompensationResult, SavedFinancialSimulation } from '../types';
import { CalculatorForm } from '../components/calculator/CalculatorForm';
import { ResultsTable } from '../components/calculator/ResultsTable';
import { ResultsChart } from '../components/calculator/ResultsChart';
import { calculateStudioRevenue, calculateProfessionalRevenue, calculateCompensation } from '../services/calculatorService';
import { SavedFinancialList } from '../components/calculator/SavedFinancialList';
import { saveSimulation, fetchSimulations, deleteSimulation } from '../services/financialService';
import { generateFinancialAnalysis } from '../services/geminiService';
import { recordGenerationUsage } from '../services/contentService';
import { Button } from '../components/ui/Button';
import { Calculator, RotateCcw, Save, History, ArrowLeft, Wand2, Loader2, FileText, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const initialInputs: CalculatorInputs = {
    hoursPerDay: 8,
    clientsPerHour: 3,
    sessionsPerWeekPerClient: 2,
    workingDaysPerMonth: 22,
    occupancyRate: 70,
    monthlyPricePerClient: 350,
    professionalHoursPerWeek: 20,
    professionalClientsPerHour: 3,
    professionalOccupancyRate: 70,
    salaryRevenuePercentage: 40,
    baseSalary: 2000,
    useProposedSalary: true,
    issPercentage: 6,
    pjSimplesPercentage: 6,
    otherChargesPercentage: 0
};

const initialModel: FinancialModel = {
    payroll: 40,
    operatingCosts: 30,
    reserves: 20,
    workingCapital: 10
};

export const FinancialAgent: React.FC = () => {
    const { user } = useAuth();
    const { t, language } = useLanguage(); // Added language from context for analysis generation
    
    // Core State
    const [inputs, setInputs] = useState<CalculatorInputs>(initialInputs);
    const [financialModel, setFinancialModel] = useState<FinancialModel>(initialModel);
    
    // Results State
    const [results, setResults] = useState<CompensationResult[]>([]);
    const [metrics, setMetrics] = useState({
        targetRevenue: 0,
        potentialRevenue: 0,
        maxCapacity: 0,
        professionalRevenue: 0
    });

    // UI State
    const [showHistory, setShowHistory] = useState(false);
    const [savedSimulations, setSavedSimulations] = useState<SavedFinancialSimulation[]>([]);
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initial Calculation
    useEffect(() => {
        calculateAll();
    }, [inputs]);

    const calculateAll = () => {
        const studioMetrics = calculateStudioRevenue(inputs);
        const professionalRev = calculateProfessionalRevenue(inputs);
        
        const compensationResults = calculateCompensation({
            professionalRevenue: professionalRev,
            useProposedSalary: inputs.useProposedSalary,
            baseSalary: inputs.baseSalary,
            salaryRevenuePercentage: inputs.salaryRevenuePercentage,
            issPercentage: inputs.issPercentage,
            pjSimplesPercentage: inputs.pjSimplesPercentage,
            otherChargesPercentage: inputs.otherChargesPercentage,
            totalRevenue: studioMetrics.targetRevenue,
            payrollPercentage: financialModel.payroll
        });

        setMetrics({
            ...studioMetrics,
            professionalRevenue: professionalRev
        });
        setResults(compensationResults);
    };

    // History Management
    const loadHistory = async () => {
        const sims = await fetchSimulations();
        setSavedSimulations(sims);
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        const title = `Simulação - R$ ${metrics.professionalRevenue.toFixed(2)}`;
        
        const result = await saveSimulation(user.id, title, {
            inputs,
            financialModel,
            results,
            metrics,
            aiAnalysis
        });

        if (result.success) {
            alert('Simulação salva com sucesso!');
            loadHistory();
        } else {
            alert('Erro ao salvar: ' + result.error);
        }
        setIsSaving(false);
    };

    const handleLoadSimulation = (sim: SavedFinancialSimulation) => {
        setInputs(sim.inputs);
        setFinancialModel(sim.financialModel);
        setResults(sim.results);
        setMetrics(sim.metrics);
        setAiAnalysis(sim.aiAnalysis);
        setShowHistory(false);
    };

    const handleDeleteSimulation = async (id: string) => {
        if(confirm('Tem certeza?')) {
            await deleteSimulation(id);
            loadHistory();
        }
    };

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
        
        // LOG USAGE
        if (user?.id) await recordGenerationUsage(user.id, 'finance');
    };

    const handleDownloadReport = async () => {
        const element = document.getElementById('financial-report');
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save('relatorio-financeiro.pdf');
        } catch (error) {
            console.error(error);
            alert('Erro ao gerar PDF');
        }
    };

    if (showHistory) {
        return (
            <div className="max-w-6xl mx-auto p-4 animate-in fade-in">
                <SavedFinancialList 
                    savedSimulations={savedSimulations} 
                    onLoad={handleLoadSimulation} 
                    onDelete={handleDeleteSimulation}
                    onBack={() => setShowHistory(false)}
                />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Calculator className="h-8 w-8 text-brand-600" /> {t('finance_title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">{t('finance_subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setShowHistory(true); loadHistory(); }}>
                        <History className="h-4 w-4 mr-2" /> Histórico
                    </Button>
                    <Button variant="secondary" onClick={() => { setInputs(initialInputs); setAiAnalysis(''); }}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Limpar
                    </Button>
                    <Button onClick={handleSave} isLoading={isSaving}>
                        <Save className="h-4 w-4 mr-2" /> Salvar
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inputs Column */}
                <div className="space-y-6">
                    <CalculatorForm 
                        inputs={inputs} 
                        onInputChange={setInputs} 
                        financialModel={financialModel} 
                        onModelChange={setFinancialModel} 
                    />
                </div>

                {/* Results Column */}
                <div className="space-y-6" id="financial-report">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Métricas do Estúdio</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                <p className="text-slate-500 dark:text-slate-400">Receita Potencial</p>
                                <p className="font-bold text-lg text-slate-800 dark:text-white">R$ {metrics.potentialRevenue.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                <p className="text-slate-500 dark:text-slate-400">Receita Alvo (Ocupação)</p>
                                <p className="font-bold text-lg text-brand-600 dark:text-brand-400">R$ {metrics.targetRevenue.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                <p className="text-slate-500 dark:text-slate-400">Capacidade Máx.</p>
                                <p className="font-bold text-lg text-slate-800 dark:text-white">{metrics.maxCapacity} alunos</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                <p className="text-slate-500 dark:text-slate-400">Receita Vaga/Prof.</p>
                                <p className="font-bold text-lg text-blue-600 dark:text-blue-400">R$ {metrics.professionalRevenue.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Cenários de Contratação</h3>
                        <ResultsTable results={results} />
                        <div className="mt-6">
                            <ResultsChart results={results} />
                        </div>
                    </div>

                    {/* AI Analysis Section */}
                    <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-slate-900 p-6 rounded-xl border border-purple-100 dark:border-purple-800/50 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-purple-800 dark:text-purple-300 flex items-center gap-2">
                                <Wand2 className="h-5 w-5" /> Análise Inteligente
                            </h3>
                            {aiAnalysis && (
                                <Button variant="ghost" size="sm" onClick={handleDownloadReport}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        
                        {!aiAnalysis ? (
                            <div className="text-center py-8">
                                <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">
                                    A IA pode analisar esses números e sugerir a melhor estratégia de contratação.
                                </p>
                                <Button onClick={handleGenerateAnalysis} isLoading={isAiLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
                                    <Sparkles className="h-4 w-4 mr-2" /> Gerar Análise com IA
                                </Button>
                            </div>
                        ) : (
                            <div className="prose prose-sm prose-purple dark:prose-invert max-w-none animate-in fade-in">
                                <div dangerouslySetInnerHTML={{ __html: aiAnalysis }} />
                                <Button variant="outline" size="sm" onClick={() => setAiAnalysis('')} className="mt-4">
                                    Gerar Nova Análise
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
