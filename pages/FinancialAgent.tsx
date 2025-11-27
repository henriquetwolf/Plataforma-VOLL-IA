import React, { useState, useEffect } from 'react';
import { CalculatorInputs, FinancialModel, CompensationResult } from '../types';
import { calculateStudioRevenue, calculateProfessionalRevenue, calculateProposedSalary, calculateCompensation } from '../services/calculatorService';
import { generateFinancialAnalysis } from '../services/geminiService';
import { CalculatorForm } from '../components/calculator/CalculatorForm';
import { ResultsTable } from '../components/calculator/ResultsTable';
import { ResultsChart } from '../components/calculator/ResultsChart';
import { Button } from '../components/ui/Button';
import { Calculator, TrendingUp, Sparkles, Loader2 } from 'lucide-react';

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

    useEffect(() => {
        // 1. Calcular Receita do Estúdio
        const studioRev = calculateStudioRevenue(inputs);
        
        // 2. Calcular Receita do Profissional
        const profRev = calculateProfessionalRevenue(inputs);
        
        setMetrics({
            targetRevenue: studioRev.targetRevenue,
            potentialRevenue: studioRev.potentialRevenue,
            maxCapacity: studioRev.maxCapacity,
            professionalRevenue: profRev
        });

        // 3. Calcular Cenários de Contratação
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

        // Limpar análise antiga se mudar inputs
        setAiAnalysis('');
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

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calculator className="h-8 w-8 text-brand-600" /> Calculadora Financeira
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Simule custos de contratação e viabilidade econômica.</p>
                </div>
                <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-2 rounded-lg border border-brand-100 dark:border-brand-800">
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-bold uppercase">Faturamento Projetado (Estúdio)</p>
                    <p className="text-xl font-bold text-brand-700 dark:text-brand-300">R$ {metrics.targetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                            <TrendingUp className="h-5 w-5 text-brand-500" /> Comparativo de Modelos
                        </h3>
                        {results.length > 0 ? (
                            <ResultsChart results={results} />
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-slate-400">
                                Preencha os dados para ver o gráfico.
                            </div>
                        )}
                    </div>

                    {/* Tabela */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                         <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Detalhamento dos Custos</h3>
                         {results.length > 0 ? (
                            <ResultsTable results={results} />
                         ) : (
                            <p className="text-slate-500 text-center py-8">Aguardando cálculo...</p>
                         )}
                    </div>

                    {/* Análise IA */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-purple-500" /> Análise Inteligente
                            </h3>
                            <Button onClick={handleGenerateAnalysis} disabled={isAiLoading || results.length === 0} className="bg-purple-600 hover:bg-purple-700 text-white">
                                {isAiLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Sparkles className="h-4 w-4 mr-2"/>}
                                {isAiLoading ? 'Analisando...' : 'Gerar Parecer'}
                            </Button>
                        </div>
                        
                        {aiAnalysis ? (
                            <div 
                                className="prose prose-sm prose-slate dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg border border-slate-100 dark:border-slate-700"
                                dangerouslySetInnerHTML={{ __html: aiAnalysis }}
                            />
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                <p>Clique em "Gerar Parecer" para receber uma consultoria financeira da IA sobre os cenários acima.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
