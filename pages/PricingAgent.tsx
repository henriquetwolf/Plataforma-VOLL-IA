import React, { useState, useMemo, ChangeEvent, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PricingInputs, CalculatedResultsPricing, SimulationResultsPricing, Competitor, SavedPricingAnalysis, PriceCompositionData } from '../types';
import { Card, InputField, SliderField, TextInputField, DaySelector } from '../components/pricing/PricingUI';
import { PricingResults } from '../components/pricing/PricingResults';
import { FixedCostsChart } from '../components/pricing/PricingCharts';
import { savePricingAnalysis, fetchPricingAnalyses, deletePricingAnalysis } from '../services/pricingService';
import { SaveAnalysisModal } from '../components/pricing/SaveAnalysisModal';
import { Button } from '../components/ui/Button';
import { Calculator, Save, RotateCcw, ChevronLeft, ChevronRight, History, Trash2, ArrowLeft } from 'lucide-react';
import { fetchProfile } from '../services/storage';

const initialInputs: PricingInputs = {
  studioInfo: {
    name: '',
    owner: '',
    date: new Date().toISOString().split('T')[0],
    address: '',
  },
  fixedCosts: {
    rent: 1500,
    utilities: 500,
    accounting: 300,
    ownerSalary: 3000,
    staffSalary: 2000,
    consumables: 200,
    marketing: 300,
    other: 0,
  },
  variableCosts: {
    creditCardFee: 5,
    taxes: 6,
    depreciation: 1,
    emergencyReserveContribution: 10,
  },
  profitMargin: 20,
  capacity: {
    clientsPerHour: 3,
    hoursPerDay: 8,
    workingDays: {
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: false,
    },
    occupancyRate: 70,
  },
  marketAnalysis: {
    competitors: Array.from({ length: 5 }, (_, i) => ({
      id: `comp-${i}`,
      name: '',
      distance: 0,
      price2x: 0,
      valuePerception: 'similar' as const,
    })),
  },
};

export const PricingAgent: React.FC = () => {
  const { user } = useAuth();
  const [inputs, setInputs] = useState<PricingInputs>(initialInputs);
  const [simulatedPackages, setSimulatedPackages] = useState<CalculatedResultsPricing['packages']>({ '1x': 0, '2x': 0, '3x': 0 });
  const [simulatedOccupancyRate, setSimulatedOccupancyRate] = useState<number>(inputs.capacity.occupancyRate);
  
  // History & UI State
  const [history, setHistory] = useState<SavedPricingAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isWizardMode, setIsWizardMode] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  useEffect(() => {
    loadHistory();
    // Carregar dados do perfil para preencher o nome do estúdio
    if (user?.id) {
        fetchProfile(user.id).then(profile => {
            if (profile) {
                setInputs(prev => {
                    // Só preenche se estiver vazio para não sobrescrever o que o usuário digitou
                    if (!prev.studioInfo.name) {
                        return {
                            ...prev,
                            studioInfo: {
                                ...prev.studioInfo,
                                name: profile.studioName || prev.studioInfo.name,
                                owner: profile.ownerName || prev.studioInfo.owner,
                                address: profile.address || prev.studioInfo.address
                            }
                        };
                    }
                    return prev;
                });
            }
        });
    }
  }, [user?.id]);

  const loadHistory = async () => {
    const data = await fetchPricingAnalyses();
    setHistory(data);
  };

  const handleConfirmSave = async (name: string) => {
    if (!user?.id) return;
    const result = await savePricingAnalysis(user.id, name, inputs);
    if (result.success) {
      alert('Análise salva com sucesso!');
      loadHistory();
    } else {
      alert('Erro ao salvar.');
    }
  };

  const handleLoad = (analysis: SavedPricingAnalysis) => {
    setInputs(analysis.inputs);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza?')) {
      await deletePricingAnalysis(id);
      loadHistory();
    }
  };

  // --- Handlers ---
  const handleStudioInfoChange = (field: keyof PricingInputs['studioInfo']) => (e: ChangeEvent<HTMLInputElement>) => {
    setInputs(prev => ({ ...prev, studioInfo: { ...prev.studioInfo, [field]: e.target.value } }));
  };

  const handleInputChange = (section: 'fixedCosts' | 'capacity', field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setInputs(prev => {
      if (section === 'fixedCosts') return { ...prev, fixedCosts: { ...prev.fixedCosts, [field]: value } };
      if (section === 'capacity') return { ...prev, capacity: { ...prev.capacity, [field]: value } };
      return prev;
    });
  };

  const handleCompetitorChange = (index: number, field: keyof Competitor) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { value } = e.target;
    setInputs(prev => {
      const newCompetitors = [...prev.marketAnalysis.competitors];
      const comp = { ...newCompetitors[index] };
      if (field === 'distance' || field === 'price2x') {
        // Use as any to avoid type check issues during assignment if narrowing fails
        (comp as any)[field] = parseFloat(value) || 0;
      } else {
        (comp as any)[field] = value;
      }
      newCompetitors[index] = comp;
      return { ...prev, marketAnalysis: { ...prev.marketAnalysis, competitors: newCompetitors } };
    });
  };

  const handleDayToggle = (day: keyof PricingInputs['capacity']['workingDays']) => {
    setInputs(prev => ({
      ...prev,
      capacity: { ...prev.capacity, workingDays: { ...prev.capacity.workingDays, [day]: !prev.capacity.workingDays[day] } }
    }));
  };

  const handleSliderChange = (section: 'variableCosts' | 'capacity', field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setInputs(prev => {
      if (section === 'variableCosts') {
        const key = field as keyof typeof prev.variableCosts;
        return { ...prev, variableCosts: { ...prev.variableCosts, [key]: value } };
      }
      if (section === 'capacity') return { ...prev, capacity: { ...prev.capacity, occupancyRate: value } };
      return prev;
    });
  };

  // --- Calculations ---
  const results = useMemo<CalculatedResultsPricing>(() => {
    const totalFixedCosts: number = Object.values(inputs.fixedCosts).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    const variableCostsPercentage = (Number(inputs.variableCosts.creditCardFee) + Number(inputs.variableCosts.taxes) + Number(inputs.variableCosts.depreciation)) / 100;
    const profitPercentage = Number(inputs.profitMargin) / 100;
    const emergencyReservePercentage = Number(inputs.variableCosts.emergencyReserveContribution) / 100;

    const denominatorProfit = 1 - variableCostsPercentage - profitPercentage - emergencyReservePercentage;
    const denominatorBreakEven = 1 - variableCostsPercentage - emergencyReservePercentage;

    if (denominatorProfit <= 0 || denominatorBreakEven <= 0) {
      return { isValid: false } as any;
    }

    const targetRevenue = totalFixedCosts / denominatorProfit;
    const breakEvenRevenue = totalFixedCosts / denominatorBreakEven;
    
    const WEEKS_PER_MONTH = 4.33;
    const daysPerWeek = Object.values(inputs.capacity.workingDays).filter(Boolean).length;
    const workingDaysPerMonth = daysPerWeek * WEEKS_PER_MONTH;

    const theoreticalSessions = Number(inputs.capacity.clientsPerHour) * Number(inputs.capacity.hoursPerDay) * Number(workingDaysPerMonth);
    const realSessionsPerMonth = theoreticalSessions * (Number(inputs.capacity.occupancyRate) / 100);

    const pricePerSession = realSessionsPerMonth > 0 ? targetRevenue / realSessionsPerMonth : 0;
    const breakEvenSessions = pricePerSession > 0 ? breakEvenRevenue / pricePerSession : 0;

    return {
      totalFixedCosts,
      targetRevenue,
      realSessionsPerMonth,
      equivalentClients2x: realSessionsPerMonth > 0 ? realSessionsPerMonth / 9 : 0,
      pricePerSession,
      packages: { '1x': pricePerSession * 5, '2x': pricePerSession * 9, '3x': pricePerSession * 13 },
      financialPlanning: {
        payroll: targetRevenue * 0.40,
        operational: targetRevenue * 0.30,
        reserve: targetRevenue * 0.20,
        workingCapital: targetRevenue * 0.10,
      },
      breakEven: { sessionsPerMonth: breakEvenSessions, monthlyRevenue: breakEvenRevenue },
      emergencyReserve: {
        totalNeeded: totalFixedCosts * 6,
        monthlySaving12Months: (totalFixedCosts * 6) / 12,
        monthlySaving24Months: (totalFixedCosts * 6) / 24,
        monthsToBuildAtBreakEven: 0,
      },
      isValid: true,
    };
  }, [inputs]);

  // Sync simulation defaults
  useEffect(() => {
    if (results.isValid) setSimulatedPackages(results.packages);
  }, [results.isValid, results.packages]);

  useEffect(() => {
    setSimulatedOccupancyRate(inputs.capacity.occupancyRate);
  }, [inputs.capacity.occupancyRate]);

  // Simulation Logic
  const simulationResults = useMemo<SimulationResultsPricing>(() => {
    if (!results.isValid) return { newRevenue: 0, newProfitValue: 0, newProfitMargin: 0, isSimulating: false, simulatedSessionsPerMonth: 0 };

    const sessions = { '1x': 5, '2x': 9, '3x': 13 } as const;
    const avgSimulatedPrice = (
      (Number(simulatedPackages['1x']) / sessions['1x']) + 
      (Number(simulatedPackages['2x']) / sessions['2x']) + 
      (Number(simulatedPackages['3x']) / sessions['3x'])
    ) / 3;

    const daysPerWeek = Object.values(inputs.capacity.workingDays).filter(Boolean).length;
    const theoreticalSessions = Number(inputs.capacity.clientsPerHour) * Number(inputs.capacity.hoursPerDay) * 4.33 * daysPerWeek;
    const simulatedSessionsPerMonth = theoreticalSessions * (simulatedOccupancyRate / 100);

    const newRevenue = avgSimulatedPrice * simulatedSessionsPerMonth;
    const variableCostsPct = (Number(inputs.variableCosts.creditCardFee) + Number(inputs.variableCosts.taxes) + Number(inputs.variableCosts.depreciation)) / 100;
    const newProfitValue = newRevenue - results.totalFixedCosts - (newRevenue * variableCostsPct);
    
    return {
      newRevenue,
      newProfitValue,
      newProfitMargin: newRevenue > 0 ? (newProfitValue / newRevenue) * 100 : 0,
      isSimulating: true,
      simulatedSessionsPerMonth
    };
  }, [simulatedPackages, results, inputs.variableCosts, inputs.capacity, simulatedOccupancyRate]);

  const priceCompositionData = useMemo<PriceCompositionData>(() => {
    if (!results.isValid) return { fixedCost: 0, variableCost: 0, reserve: 0, profit: 0, total: 0 };
    const variablePct = (Number(inputs.variableCosts.creditCardFee) + Number(inputs.variableCosts.taxes) + Number(inputs.variableCosts.depreciation)) / 100;
    const profitPct = Number(inputs.profitMargin) / 100;
    const reservePct = Number(inputs.variableCosts.emergencyReserveContribution) / 100;

    return {
      fixedCost: Number(results.totalFixedCosts) / Number(results.realSessionsPerMonth),
      variableCost: Number(results.pricePerSession) * variablePct,
      reserve: Number(results.pricePerSession) * reservePct,
      profit: Number(results.pricePerSession) * profitPct,
      total: Number(results.pricePerSession)
    };
  }, [results, inputs]);

  const averageCompetitorPrice = useMemo(() => {
    const valid = inputs.marketAnalysis.competitors.filter(c => c.price2x > 0);
    return valid.length ? valid.reduce((a, b) => a + b.price2x, 0) / valid.length : 0;
  }, [inputs.marketAnalysis.competitors]);

  const formSections = [
    {
      id: 'studio', title: 'Studio',
      component: (
        <Card title="Informações do Studio">
          <TextInputField label="Nome do Studio" value={inputs.studioInfo.name} onChange={handleStudioInfoChange('name')} />
          <TextInputField label="Responsável" value={inputs.studioInfo.owner} onChange={handleStudioInfoChange('owner')} />
          <TextInputField label="Data" type="date" value={inputs.studioInfo.date} onChange={handleStudioInfoChange('date')} />
        </Card>
      )
    },
    {
      id: 'fixed', title: 'Custos Fixos',
      component: (
        <Card title="Custos Fixos Mensais">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Aluguel" isCurrency value={inputs.fixedCosts.rent} onChange={handleInputChange('fixedCosts', 'rent')} />
            <InputField label="Contas" isCurrency value={inputs.fixedCosts.utilities} onChange={handleInputChange('fixedCosts', 'utilities')} />
            <InputField label="Pró-labore" isCurrency value={inputs.fixedCosts.ownerSalary} onChange={handleInputChange('fixedCosts', 'ownerSalary')} />
            <InputField label="Equipe" isCurrency value={inputs.fixedCosts.staffSalary} onChange={handleInputChange('fixedCosts', 'staffSalary')} />
            <InputField label="Marketing" isCurrency value={inputs.fixedCosts.marketing} onChange={handleInputChange('fixedCosts', 'marketing')} />
            <InputField label="Outros" isCurrency value={inputs.fixedCosts.other} onChange={handleInputChange('fixedCosts', 'other')} />
          </div>
          <FixedCostsChart data={inputs.fixedCosts} />
        </Card>
      )
    },
    {
      id: 'variable', title: 'Variáveis & Lucro',
      component: (
        <Card title="Custos Variáveis e Lucro">
          <SliderField label="Taxas Cartão (%)" id="card" value={inputs.variableCosts.creditCardFee} onChange={handleSliderChange('variableCosts', 'creditCardFee')} max={15} />
          <SliderField label="Impostos (%)" id="taxes" value={inputs.variableCosts.taxes} onChange={handleSliderChange('variableCosts', 'taxes')} max={20} />
          <SliderField label="Margem de Lucro (%)" id="profit" value={inputs.profitMargin} onChange={(e) => setInputs(p => ({...p, profitMargin: parseInt(e.target.value)}))} max={50} />
        </Card>
      )
    },
    {
      id: 'capacity', title: 'Capacidade',
      component: (
        <Card title="Capacidade Operacional">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Alunos/Hora" value={inputs.capacity.clientsPerHour} onChange={handleInputChange('capacity', 'clientsPerHour')} />
            <InputField label="Horas/Dia" value={inputs.capacity.hoursPerDay} onChange={handleInputChange('capacity', 'hoursPerDay')} />
          </div>
          <DaySelector workingDays={inputs.capacity.workingDays} onDayToggle={handleDayToggle} />
          <SliderField label="Taxa de Ocupação (%)" id="occupancy" value={inputs.capacity.occupancyRate} onChange={handleSliderChange('capacity', 'occupancyRate')} />
        </Card>
      )
    },
    {
      id: 'market', title: 'Mercado',
      component: (
        <Card title="Análise de Mercado (Opcional)">
          {inputs.marketAnalysis.competitors.slice(0, 3).map((comp, i) => (
            <div key={comp.id} className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <TextInputField label={`Concorrente ${i+1}`} value={comp.name} onChange={handleCompetitorChange(i, 'name')} placeholder="Nome" />
              <div className="flex gap-2">
                <InputField label="Preço 2x" isCurrency value={comp.price2x} onChange={handleCompetitorChange(i, 'price2x')} />
              </div>
            </div>
          ))}
        </Card>
      )
    }
  ];

  if (showHistory) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Histórico de Precificação</h2>
          <Button variant="outline" onClick={() => setShowHistory(false)}><ArrowLeft className="w-4 h-4 mr-2"/> Voltar</Button>
        </div>
        <div className="grid gap-4">
          {history.map(h => (
            <div key={h.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border flex justify-between items-center">
              <div>
                <h3 className="font-bold">{h.name}</h3>
                <p className="text-sm text-slate-500">{new Date(h.date).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => handleLoad(h)}>Abrir</Button>
                <button onClick={() => handleDelete(h.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Calculator className="h-8 w-8 text-brand-600" /> Preço Certo Inteligente
          </h1>
          <p className="text-slate-500">Defina sua precificação com base em custos reais.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistory(true)}><History className="w-4 h-4 mr-2"/> Histórico</Button>
          <Button variant="secondary" onClick={() => setInputs(initialInputs)}><RotateCcw className="w-4 h-4 mr-2"/> Limpar</Button>
          <Button onClick={() => setIsSaveModalOpen(true)}><Save className="w-4 h-4 mr-2"/> Salvar</Button>
        </div>
      </header>

      {/* Mode Switcher */}
      <div className="flex justify-center">
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex text-sm font-medium">
          <button onClick={() => setIsWizardMode(true)} className={`px-4 py-2 rounded-md transition-all ${isWizardMode ? 'bg-white dark:bg-slate-700 shadow text-brand-600' : 'text-slate-500'}`}>Passo a Passo</button>
          <button onClick={() => setIsWizardMode(false)} className={`px-4 py-2 rounded-md transition-all ${!isWizardMode ? 'bg-white dark:bg-slate-700 shadow text-brand-600' : 'text-slate-500'}`}>Visão Completa</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="space-y-6">
          {isWizardMode ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Passo {currentStep + 1} de {formSections.length}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" disabled={currentStep === 0} onClick={() => setCurrentStep(p => p - 1)}><ChevronLeft className="w-4 h-4"/></Button>
                  <Button variant="ghost" disabled={currentStep === formSections.length - 1} onClick={() => setCurrentStep(p => p + 1)}><ChevronRight className="w-4 h-4"/></Button>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 transition-all" style={{ width: `${((currentStep + 1) / formSections.length) * 100}%` }} />
              </div>
              {formSections[currentStep].component}
            </div>
          ) : (
            <div className="space-y-8">
              {formSections.map(s => <div key={s.id}>{s.component}</div>)}
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:sticky lg:top-8 space-y-6">
          <PricingResults 
            results={results}
            simulatedPackages={simulatedPackages}
            handlePackageChange={(k, v) => setSimulatedPackages(p => ({...p, [k]: parseFloat(v)||0}))}
            simulationResults={simulationResults}
            competitorPrice={averageCompetitorPrice}
            simulatedOccupancyRate={simulatedOccupancyRate}
            handleSimulatedOccupancyChange={(e) => setSimulatedOccupancyRate(parseInt(e.target.value))}
            priceCompositionData={priceCompositionData}
            inputs={inputs}
          />
        </div>
      </div>

      <SaveAnalysisModal 
        isOpen={isSaveModalOpen} 
        onClose={() => setIsSaveModalOpen(false)} 
        onSave={handleConfirmSave} 
        suggestedName={`${inputs.studioInfo.name} - ${new Date().toLocaleDateString()}`}
      />
    </div>
  );
};
