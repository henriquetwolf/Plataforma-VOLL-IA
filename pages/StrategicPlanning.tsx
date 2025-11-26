import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchProfile } from '../services/storage';
import { generateFullReport } from '../services/geminiService';
import { StrategicPlan, SavedPlan, StrategyStep } from '../types';
import { VisionStep, SwotStep, GoalsStep, ActionsStep } from '../components/strategy/StrategyForms';
import { GeneratedPlan } from '../components/strategy/GeneratedPlan';
import { SavedPlansList } from '../components/strategy/SavedPlansList';
import { Button } from '../components/ui/Button';
import { Compass, Clock, PlayCircle, Loader2 } from 'lucide-react';

const initialPlanData: StrategicPlan = {
  studioName: '',
  planningYear: new Date().getFullYear().toString(),
  vision: '',
  mission: '',
  swot: {
    strengths: [''],
    weaknesses: [''],
    opportunities: [''],
    threats: [''],
  },
  objectives: [{ title: '', keyResults: [''] }],
  quarterlyActions: [
    { quarter: '1º Trimestre', actions: [''] },
    { quarter: '2º Trimestre', actions: [''] },
    { quarter: '3º Trimestre', actions: [''] },
    { quarter: '4º Trimestre', actions: [''] },
  ],
};

export const StrategicPlanning: React.FC = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<StrategyStep>(StrategyStep.Welcome);
  const [planData, setPlanData] = useState<StrategicPlan>(initialPlanData);
  const [generatedReport, setGeneratedReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Gestão de Planos Salvos (LocalStorage)
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  // Carregar dados iniciais (Perfil do Studio)
  useEffect(() => {
    const loadStudioData = async () => {
      if (user?.id) {
        try {
          // Busca o perfil no Supabase
          const profile = await fetchProfile(user.id);
          
          if (profile?.studioName) {
            // Atualiza o planData com o nome do studio se ele estiver vazio
            setPlanData(prev => {
              if (!prev.studioName || prev.studioName.trim() === '') {
                return { ...prev, studioName: profile.studioName };
              }
              return prev;
            });
          }
        } catch (error) {
          console.error("Erro ao carregar perfil para estratégia:", error);
        }
      }
    };

    loadStudioData();

    // Carregar planos salvos do LocalStorage
    try {
      const stored = localStorage.getItem('pilates_strategic_plans');
      if (stored) setSavedPlans(JSON.parse(stored));
    } catch (e) {
      console.error('Failed to load plans');
    }
  }, [user]);

  const updateLocalStorage = (plans: SavedPlan[]) => {
    localStorage.setItem('pilates_strategic_plans', JSON.stringify(plans));
    setSavedPlans(plans);
  };

  const updatePlanData = (updates: Partial<StrategicPlan>) => {
    setPlanData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < StrategyStep.GeneratedPlan) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > StrategyStep.Welcome) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    const report = await generateFullReport(planData);
    setGeneratedReport(report);
    setIsLoading(false);
    setCurrentStep(StrategyStep.GeneratedPlan);
  };

  const handleSave = () => {
    const newPlan: SavedPlan = {
      id: currentPlanId || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      planData,
      report: generatedReport
    };

    const existingIndex = savedPlans.findIndex(p => p.id === newPlan.id);
    let updatedList;
    
    if (existingIndex > -1) {
      updatedList = [...savedPlans];
      updatedList[existingIndex] = newPlan;
    } else {
      updatedList = [newPlan, ...savedPlans];
    }
    
    updateLocalStorage(updatedList);
    setCurrentPlanId(newPlan.id);
  };

  const handleLoadPlan = (plan: SavedPlan) => {
    setPlanData(plan.planData);
    setGeneratedReport(plan.report);
    setCurrentPlanId(plan.id);
    setShowSavedList(false);
    setCurrentStep(StrategyStep.GeneratedPlan);
  };

  const handleDeletePlan = (id: string) => {
    if (confirm('Tem certeza?')) {
      const updated = savedPlans.filter(p => p.id !== id);
      updateLocalStorage(updated);
    }
  };

  const handleStartOver = () => {
    // Reseta, mas tenta manter o nome do studio se disponível
    const currentName = planData.studioName;
    setPlanData({ ...initialPlanData, studioName: currentName });
    
    // Se por acaso estava vazio, tenta buscar de novo do perfil
    if (!currentName && user?.id) {
       fetchProfile(user.id).then(profile => {
        if (profile?.studioName) {
          setPlanData(prev => ({ ...prev, studioName: profile.studioName }));
        }
      });
    }

    setGeneratedReport('');
    setCurrentPlanId(null);
    setCurrentStep(StrategyStep.Welcome);
  };

  // Renderização Condicional dos Passos
  if (showSavedList) {
    return <SavedPlansList savedPlans={savedPlans} onLoad={handleLoadPlan} onDelete={handleDeletePlan} onBack={() => setShowSavedList(false)} />;
  }

  // Tela de Boas-Vindas
  if (currentStep === StrategyStep.Welcome) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12 animate-in fade-in zoom-in-95">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-50 rounded-full mb-6">
          <Compass className="h-10 w-10 text-brand-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Planejador Estratégico AI</h1>
        <p className="text-lg text-slate-500 max-w-lg mx-auto mb-10">
          Transforme seus objetivos em um plano de ação claro e prático. Nossa IA atua como sua consultora de negócios sênior.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto">
          <button 
            onClick={() => handleNext()}
            className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-brand-100 rounded-2xl hover:border-brand-500 hover:shadow-lg transition-all"
          >
            <div className="bg-brand-500 text-white p-3 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <PlayCircle className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Criar Novo Plano</h3>
            <p className="text-sm text-slate-400 mt-2">Iniciar o assistente passo-a-passo</p>
          </button>

          <button 
            onClick={() => setShowSavedList(true)}
            className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-100 rounded-2xl hover:border-slate-400 hover:shadow-lg transition-all"
          >
            <div className="bg-slate-100 text-slate-600 p-3 rounded-full mb-4 group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Clock className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Ver Histórico</h3>
            <p className="text-sm text-slate-400 mt-2">{savedPlans.length} planos salvos</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      {currentStep !== StrategyStep.GeneratedPlan && (
        <div className="mb-8">
          <div className="flex justify-between text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
            <span>Início</span>
            <span>Visão</span>
            <span>SWOT</span>
            <span>Metas</span>
            <span>Ações</span>
            <span>Revisão</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-500 transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / StrategyStep.Review) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps Rendering */}
      <div className="min-h-[400px]">
        {currentStep === StrategyStep.Vision && (
          <VisionStep planData={planData} updatePlanData={updatePlanData} onNext={handleNext} onBack={handleBack} />
        )}
        
        {currentStep === StrategyStep.SWOT && (
          <SwotStep planData={planData} updatePlanData={updatePlanData} onNext={handleNext} onBack={handleBack} />
        )}
        
        {currentStep === StrategyStep.Goals && (
          <GoalsStep planData={planData} updatePlanData={updatePlanData} onNext={handleNext} onBack={handleBack} />
        )}
        
        {currentStep === StrategyStep.Actions && (
          <ActionsStep planData={planData} updatePlanData={updatePlanData} onNext={handleNext} onBack={handleBack} />
        )}

        {currentStep === StrategyStep.Review && (
          <div className="text-center py-12 animate-in fade-in">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Tudo pronto!</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Nossa IA vai analisar sua Visão, SWOT e Objetivos para criar um relatório estratégico detalhado.
            </p>
            
            <div className="flex justify-center gap-4">
              <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
                Voltar e Editar
              </Button>
              <Button onClick={handleGenerate} disabled={isLoading} className="px-8 h-12 text-lg shadow-lg shadow-brand-200">
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Gerando Plano...
                  </>
                ) : (
                  <>
                    <Compass className="h-5 w-5 mr-2" /> Gerar Plano Estratégico
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {currentStep === StrategyStep.GeneratedPlan && (
          <GeneratedPlan 
            planData={planData} 
            report={generatedReport} 
            onStartOver={handleStartOver}
            onSave={handleSave}
            isSaved={!!currentPlanId}
          />
        )}
      </div>
    </div>
  );
};