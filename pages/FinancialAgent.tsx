
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { CalculatorInputs, FinancialModel, CompensationResult, SavedFinancialSimulation } from '../types';
import { calculateStudioRevenue, calculateProfessionalRevenue, calculateCompensation } from '../services/calculatorService';
import { generateFinancialAnalysis } from '../services/geminiService';
import { fetchSimulations, saveSimulation, deleteSimulation } from '../services/financialService'; // Novo serviço
import { CalculatorForm } from '../components/calculator/CalculatorForm';
import { ResultsTable } from '../components/calculator/ResultsTable';
import { ResultsChart } from '../components/calculator/ResultsChart';
import { SavedFinancialList } from '../components/calculator/SavedFinancialList';
import { Button } from '../components/ui/Button';
import { Calculator, TrendingUp, Sparkles, Loader2, Download, Save, History } from 'lucide-react';
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
    const { t } = useLanguage();
    
    // Estado Principal
    const [inputs, setInputs] = useState<CalculatorInputs>(initialInputs);
    const [financialModel, setFinancialModel] = useState<FinancialModel>(initialFinancialModel);
    const [results, setResults] = useState<CompensationResult[]>([]);
    
    // Métricas calculadas
    const [metrics, setMetrics] = useState({
        targetRevenue: 0,
        potentialRevenue: 0,
        maxCapacity: 0,
        professionalRevenue: 0
    });

    // IA
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Histórico e UI
    const [savedSimulations, setSavedSimulations] = useState<SavedFinancialSimulation[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Carregar histórico do Supabase ao iniciar
    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const data = await fetchSimulations();
        setSavedSimulations(data);
    };

    // Recalcular quando inputs mudam
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
            metrics.professionalRevenue
        );
        setAiAnalysis(analysis);
        setIsAiLoading(false);
    };

    const handleSaveSimulation = async () => {
        if (!user?.id) return;
        
        const title = prompt("Dê um nome para esta simulação (ex: Contratação Manhã):", `Simulação ${new Date().toLocaleDateString()}`);
        if (!title) return;

        setIsSaving(true);
        
        const simulationData = {
            inputs,
            financialModel,
            results,
            metrics,
            aiAnalysis
        };

        const result = await saveSimulation(user.id, title, simulationData);

        if (result.success) {
            alert(t('save') + " com sucesso!");
            loadHistory(); // Recarrega a lista
        } else {
            alert(`Erro ao salvar: ${result.error}`);
        }
        setIsSaving(false);
    };

    const handleLoadSimulation = (sim: SavedFinancialSimulation) => {
        setInputs(sim.inputs);
        setFinancialModel(sim.financialModel);
        setAiAnalysis(sim.aiAnalysis || '');
        setShowHistory(false);
        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteSimulation = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta simulação?")) {
            const result = await deleteSimulation(id);
            if (result.success) {
                loadHistory();
            } else {
                alert("Erro ao excluir simulação.");
            }
        }
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById('financial-report-content');
        if (!element) return;
        
        // Esconder botões temporariamente
        element.classList.add('printing-pdf');

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error(error);
            alert("Erro ao gerar PDF");
        } finally {
            element.classList.remove('printing-pdf');
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
        <div id="financial-report-content" className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 bg-slate-50 dark:bg-slate-950 p-2 md:p-6">
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
                    <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-2 rounded-lg border border-brand-100 dark:border-brand-800">
                        <p className="text-xs text-brand-600 dark:text-brand-400 font-bold uppercase">{t('projected_revenue')}</p>
                        <p className="text-xl font-bold text-brand-700 dark:text-brand-300">R$ {metrics.targetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Esquerda: Inputs */}
                <div className="lg:col-span-1 space-y-6">
                    <CalculatorForm 
                        inputs={inputs} 
                        onInputChange={setInputs} 
                        financialModel={financialModel}
                        onModelChange={setFinancialModel}
                    />
                </div>

                {/* Coluna Direita: Resultados */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Gráfico */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-brand-500" /> {t('compare_models')}
                        </h3>
                        {results.length > 0 ? (
                            <ResultsChart results={results} />
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-slate-400">
                                {t('loading')}...
                            </div>
                        )}
                    </div>

                    {/* Tabela */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                         <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">{t('cost_details')}</h3>
                         {results.length > 0 ? (
                            <ResultsTable results={results} />
                         ) : (
                            <p className="text-slate-500 text-center py-8">{t('loading')}...</p>
                         )}
                    </div>

                    {/* Análise IA */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-purple-500">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-purple-500" /> {t('ai_analysis')}
                            </h3>
                            <Button onClick={handleGenerateAnalysis} disabled={isAiLoading || results.length === 0} className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto">
                                {isAiLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Sparkles className="h-4 w-4 mr-2"/>}
                                {isAiLoading ? t('loading') : t('generate_analysis_btn')}
                            </Button>
                        </div>
                        
                        {aiAnalysis ? (
                            <div className="space-y-4">
                                <div 
                                    className="prose prose-sm prose-slate dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg border border-slate-100 dark:border-slate-700"
                                    dangerouslySetInnerHTML={{ __html: aiAnalysis }}
                                />
                                <div className="flex gap-2 pt-2 justify-end print:hidden">
                                     <Button variant="outline" onClick={handleSaveSimulation} isLoading={isSaving}>
                                        <Save className="h-4 w-4 mr-2" /> {t('save_simulation_btn')}
                                     </Button>
                                     <Button variant="secondary" onClick={handleDownloadPDF}>
                                        <Download className="h-4 w-4 mr-2" /> {t('download_pdf')}
                                     </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                <p>Clique em "{t('generate_analysis_btn')}" para receber uma consultoria financeira da IA sobre os cenários acima.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
