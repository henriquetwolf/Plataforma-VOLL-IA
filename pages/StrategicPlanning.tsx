
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchProfile } from '../services/storage';
import { generateFullReport } from '../services/geminiService';
import { saveStrategicPlan, fetchStrategicPlans, deleteStrategicPlan } from '../services/strategyService';
import { StrategicPlan, SavedPlan, StrategyStep } from '../types';
import { VisionStep, SwotStep, GoalsStep, ActionsStep } from '../components/strategy/StrategyForms';
import { GeneratedPlan } from '../components/strategy/GeneratedPlan';
import { SavedPlansList } from '../components/strategy/SavedPlansList';
import { Button } from '../components/ui/Button';
import { Compass, Clock, PlayCircle, Loader2, Target, BarChart2, ListTodo, Flag } from 'lucide-react';

const initialPlanData: StrategicPlan = {
  studioName: '',
  planningYear: new Date().getFullYear().toString(),
  vision: '',
  mission: '',
  values: '',
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
  const [isSaving, setIsSaving] = useState(false);
  
  // Gestão de Planos Salvos
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    const initializeData = async () => {
      if (!user?.id) return;

      // 1. Carregar planos salvos do Supabase
      try {
        const dbPlans = await fetchStrategicPlans(user.id);
        setSavedPlans(dbPlans);
      } catch (e) { 
        console.error("Erro ao carregar planos:", e); 
      }

      // 2. Preencher Nome do Studio
      try {
        const profile = await fetchProfile(user.id);
        if (profile?.studioName) {
          setPlanData(prev => ({ ...prev, studioName: profile.studioName }));
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }
    };
    
    initializeData();
  }, [user]);

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

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    const newPlan: SavedPlan = {
      id: currentPlanId || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      planData,
      report: generatedReport
    };

    const result = await saveStrategicPlan(user.id, newPlan);
    
    if (result.success) {
        alert("Planejamento salvo no banco de dados!");
        // Refresh List
        const updatedPlans = await fetchStrategicPlans(user.id);
        setSavedPlans(updatedPlans);
        setCurrentPlanId(newPlan.id);
    } else {
        alert("Erro ao salvar: " + result.error);
    }
    setIsSaving(false);
  };

  const handleLoadPlan = (plan: SavedPlan) => {
    setPlanData(plan.planData);
    setGeneratedReport(plan.report);
    setCurrentPlanId(plan.id);
    setShowSavedList(false);
    setCurrentStep(StrategyStep.GeneratedPlan);
  };

  const handleDeletePlan = async (id: string) => {
    if (!user?.id) return;
    if (confirm('Tem certeza que deseja apagar este plano?')) {
      const result = await deleteStrategicPlan(id, user.id);
      if (result.success) {
          const updated = await fetchStrategicPlans(user.id);
          setSavedPlans(updated);
      } else {
          alert("Erro ao deletar: " + result.error);
      }
    }
  };

  const handleStartOver = () => {
    const currentName = planData.studioName;
    setPlanData({ ...initialPlanData, studioName: currentName });
    
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
      <div className="max-w-4xl mx-auto text-center py-12 animate-in fade-in zoom-in-95">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-50 rounded-full mb-6">
          <Compass className="h-10 w-10 text-brand-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Planejamento Estratégico</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10">
          Defina o futuro do seu studio com a ajuda da Inteligência Artificial. Crie um plano de ação claro, defina sua identidade e estabeleça metas alcançáveis.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto text-left">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Flag className="w-5 h-5"/></div>
                    <h3 className="font-bold text-slate-800">1. Identidade</h3>
                </div>
                <p className="text-sm text-slate-500">Missão, Visão e Valores para alinhar a cultura do estúdio.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><BarChart2 className="w-5 h-5"/></div>
                    <h3 className="font-bold text-slate-800">2. Análise SWOT</h3>
                </div>
                <p className="text-sm text-slate-500">Mapeamento de forças, fraquezas, oportunidades e ameaças.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Target className="w-5 h-5"/></div>
                    <h3 className="font-bold text-slate-800">3. Objetivos</h3>
                </div>
                <p className="text-sm text-slate-500">Definição de metas claras e resultados chave (OKRs).</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><ListTodo className="w-5 h-5"/></div>
                    <h3 className="font-bold text-slate-800">4. Plano de Ação</h3>
                </div>
                <p className="text-sm text-slate-500">Cronograma trimestral prático para execução.</p>
            </div>
        </div>

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
      {currentStep !== StrategyStep.GeneratedPlan && (
        <div className="mb-8">
          <div className="flex justify-between text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
            <span>Início</span>
            <span>Visão</span>
            <span>SWOT</span>
            <span>Objetivos</span>
            <span>Plano de Ação</span>
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
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Revisão Final</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Nossa IA vai analisar sua Visão, SWOT e Objetivos para criar um relatório estratégico detalhado e personalizado para seu Studio.
            </p>
            
            <div className="flex justify-center gap-4">
              <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
                Voltar
              </Button>
              <Button onClick={handleGenerate} disabled={isLoading} className="px-8 h-12 text-lg shadow-lg shadow-brand-200">
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Gerando Relatório...
                  </>
                ) : (
                  <>
                    <Compass className="h-5 w-5 mr-2" /> Gerar Plano Completo
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
            isSaved={!!currentPlanId || isSaving}
          />
        )}
      </div>
    </div>
  );
};
