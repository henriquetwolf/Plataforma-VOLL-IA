
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<StrategyStep>(StrategyStep.Welcome);
  const [planData, setPlanData] = useState<StrategicPlan>(initialPlanData);
  const [generatedReport, setGeneratedReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Gestão de Planos Salvos (LocalStorage)
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  // Carregar dados iniciais (Perfil do Studio e Planos Salvos)
  useEffect(() => {
    const initializeData = async () => {
      // 1. Carregar planos salvos
      try {
        const stored = localStorage.getItem('pilates_strategic_plans');
        if (stored) setSavedPlans(JSON.parse(stored));
      } catch (e) { console.error(e); }

      // 2. Preencher Nome do Studio automaticamente a partir do Perfil
      if (user?.id) {
        try {
          const profile = await fetchProfile(user.id);
          // Força a atualização se tivermos o nome do studio, mesmo que o usuário já tenha aberto o form antes
          if (profile?.studioName) {
            setPlanData(prev => ({ ...prev, studioName: profile.studioName }));
          }
        } catch (error) {
          console.error("Erro ao carregar perfil para estratégia:", error);
        }
      }
    };
    
    initializeData();
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
    // Preserva o nome do estúdio atual ao reiniciar
    const currentName = planData.studioName;
    setPlanData({ ...initialPlanData, studioName: currentName });
    
    // Recarrega do perfil para garantir
    if (user?.id) {
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

  if (showSavedList) {
    return <SavedPlansList savedPlans={savedPlans} onLoad={handleLoadPlan} onDelete={handleDeletePlan} onBack={() => setShowSavedList(false)} />;
  }

  if (currentStep === StrategyStep.Welcome) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12 animate-in fade-in zoom-in-95">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-50 rounded-full mb-6">
          <Compass className="h-10 w-10 text-brand-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">{t('strategy_agent_title')}</h1>
        <p className="text-lg text-slate-500 max-w-lg mx-auto mb-10">
          {t('strategy_agent_desc')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto">
          <button 
            onClick={() => handleNext()}
            className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-brand-100 rounded-2xl hover:border-brand-500 hover:shadow-lg transition-all"
          >
            <div className="bg-brand-500 text-white p-3 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <PlayCircle className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">{t('create_plan')}</h3>
            <p className="text-sm text-slate-400 mt-2">Iniciar o assistente passo-a-passo</p>
          </button>

          <button 
            onClick={() => setShowSavedList(true)}
            className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-100 rounded-2xl hover:border-slate-400 hover:shadow-lg transition-all"
          >
            <div className="bg-slate-100 text-slate-600 p-3 rounded-full mb-4 group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Clock className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">{t('view_history')}</h3>
            <p className="text-sm text-slate-400 mt-2">{savedPlans.length} planos salvos</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {currentStep !== StrategyStep.GeneratedPlan && (
        <div className="mb-8">
          <div className="flex justify-between text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
            <span>Início</span>
            <span>{t('vision')}</span>
            <span>{t('swot_analysis')}</span>
            <span>{t('step_goals')}</span>
            <span>{t('action_plan')}</span>
            <span>{t('review')}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-500 transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / StrategyStep.Review) * 100}%` }}
            />
          </div>
        </div>
      )}

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
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('review')}</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Nossa IA vai analisar sua Visão, SWOT e Objetivos para criar um relatório estratégico detalhado.
            </p>
            
            <div className="flex justify-center gap-4">
              <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
                {t('back')}
              </Button>
              <Button onClick={handleGenerate} disabled={isLoading} className="px-8 h-12 text-lg shadow-lg shadow-brand-200">
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" /> {t('loading')}
                  </>
                ) : (
                  <>
                    <Compass className="h-5 w-5 mr-2" /> {t('generate_report')}
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
