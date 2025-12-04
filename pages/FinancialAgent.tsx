
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
    
    // Brand Data for Report
    const [studioLogo, setStudioLogo] = useState<string | null>(null);
    const [studioName, setStudioName] = useState<string>('');

    // Carregar histórico e perfil
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
        
        // Temporarily hide buttons/inputs for print
        element.classList.add('printing-mode');

        try {
            const originalBg = element.style.backgroundColor;
            element.style.backgroundColor = "#ffffff"; // Force white

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            
            element.style.backgroundColor = originalBg; // Restore

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
            element.classList.remove('printing-mode');
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
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Screen Header */}
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
                     <Button variant="secondary" onClick={handleDownloadPDF} disabled={results.length === 0}>
                        <Download className="h-4 w-4 mr-2" /> {t('download_pdf')}
                     </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Inputs Column (Left) */}
                <div className="lg:col-span-1 space-y-6">
                    <CalculatorForm 
                        inputs={inputs} 
                        onInputChange={setInputs} 
                        financialModel={financialModel}
                        onModelChange={setFinancialModel}
                    />
                </div>

                {/* Report Column (Right) - This part will be printed */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-100 dark:bg-slate-950 p-4 md:p-8 rounded-xl shadow-inner flex justify-center">
                        <div 
                            id="financial-report-content" 
                            className="bg-white text-slate-800 shadow-xl box-border"
                            style={{ 
                                width: '210mm', 
                                minHeight: '297mm', 
                                paddingTop: '30mm',
                                paddingRight: '20mm',
                                paddingBottom: '20mm',
                                paddingLeft: '30mm'
                            }}
                        >
                            {/* Report Header */}
                            <div className="flex justify-between items-start border-b-4 border-brand-500 pb-4 mb-8">
                                <div>
                                    <div className="flex items-center gap-2 text-brand-600 mb-1 font-bold uppercase text-xs tracking-wider">
                                        <Banknote className="w-4 h-4" /> Análise de Viabilidade
                                    </div>
                                    <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Relatório Financeiro</h1>
                                    <h2 className="text-lg font-medium text-slate-500">{studioName || 'Seu Studio'}</h2>
                                </div>
                                <div className="text-right">
                                    {studioLogo ? (
                                        <img src={studioLogo} alt="Logo" className="h-16 w-auto max-w-[120px] object-contain mb-2" />
                                    ) : (
                                        <Building2 className="h-12 w-12 text-slate-300 mb-2 ml-auto" />
                                    )}
                                    <p className="text-xs text-slate-400">Data: {new Date().toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-lg border border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Faturamento Projetado</p>
                                    <p className="text-2xl font-bold text-slate-900">R$ {metrics.targetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Capacidade Máxima</p>
                                    <p className="text-2xl font-bold text-slate-900">{metrics.maxCapacity} alunos</p>
                                </div>
                            </div>

                            {/* Chart Section */}
                            <div className="mb-8 print:break-inside-avoid">
                                <h3 className="font-bold text-xl text-brand-700 mb-4 flex items-center gap-2 border-b border-brand-100 pb-2">
                                    <TrendingUp className="h-5 w-5 text-brand-600" /> Comparativo de Cenários
                                </h3>
                                {results.length > 0 ? (
                                    <div className="p-4 border rounded-lg bg-white h-[300px]">
                                        <ResultsChart results={results} />
                                    </div>
                                ) : (
                                    <p className="text-center text-slate-400 py-8">Aguardando dados...</p>
                                )}
                            </div>

                            {/* Table Section */}
                            <div className="mb-8 print:break-inside-avoid">
                                 <h3 className="font-bold text-xl text-brand-700 mb-4 border-b border-brand-100 pb-2">{t('cost_details')}</h3>
                                 {results.length > 0 ? (
                                    <ResultsTable results={results} />
                                 ) : (
                                    <p className="text-center text-slate-400 py-8">Aguardando dados...</p>
                                 )}
                            </div>

                            {/* AI Analysis Section */}
                            <div className="mb-6 print:break-inside-avoid">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                                    <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-purple-600" /> Parecer do Consultor IA
                                    </h3>
                                    <div className="print:hidden">
                                        <Button size="sm" onClick={handleGenerateAnalysis} disabled={isAiLoading || results.length === 0} className="bg-purple-600 hover:bg-purple-700 text-white">
                                            {isAiLoading ? <Loader2 className="animate-spin h-3 w-3"/> : 'Gerar'}
                                        </Button>
                                    </div>
                                </div>
                                
                                {aiAnalysis ? (
                                    <div 
                                        className="prose prose-slate max-w-none text-justify 
                                        prose-h2:text-xl prose-h2:font-bold prose-h2:text-brand-600 prose-h2:border-b-2 prose-h2:border-brand-100 prose-h2:pb-1 prose-h2:mt-6 prose-h2:mb-4
                                        prose-p:text-slate-700 prose-p:mb-3 prose-p:leading-relaxed
                                        prose-ul:list-disc prose-li:ml-4 prose-li:text-slate-700
                                        prose-ol:list-decimal prose-ol:ml-4
                                        prose-table:w-full prose-table:text-sm prose-table:border-collapse prose-table:my-4
                                        prose-th:bg-slate-100 prose-th:p-2 prose-th:text-left prose-th:font-bold
                                        prose-td:p-2 prose-td:border prose-td:border-slate-200"
                                        dangerouslySetInnerHTML={{ __html: aiAnalysis }}
                                    />
                                ) : (
                                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        <p>Clique em "Gerar" para receber a análise detalhada.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions (Hidden in Print) */}
                            <div className="flex justify-end gap-2 pt-4 border-t print:hidden">
                                 <Button variant="outline" onClick={handleSaveSimulation} isLoading={isSaving}>
                                    <Save className="h-4 w-4 mr-2" /> {t('save_simulation_btn')}
                                 </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
