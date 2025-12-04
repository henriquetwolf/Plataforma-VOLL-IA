
import React, { useState } from 'react';
import { StrategicPlan } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Plus, Trash2, ArrowRight, ArrowLeft, Wand2, Lightbulb, CheckCircle2, Loader2, Sparkles, Info, Calendar } from 'lucide-react';
import { 
  generateMissionOptions, 
  generateVisionOptions, 
  generateSwotSuggestions,
  generateObjectivesSmart,
  generateActionsSmart
} from '../../services/geminiService';

interface StepProps {
  planData: StrategicPlan;
  updatePlanData: (updates: Partial<StrategicPlan>) => void;
  onNext: () => void;
  onBack: () => void;
}

// === Passo 1: Visão e Missão ===
export const VisionStep: React.FC<StepProps> = ({ planData, updatePlanData, onNext, onBack }) => {
  const [loadingField, setLoadingField] = useState<'mission' | 'vision' | null>(null);
  const [suggestions, setSuggestions] = useState<{ type: 'mission' | 'vision', items: string[] } | null>(null);

  const handleAiMission = async () => {
    if (!planData.studioName) {
      alert("Por favor, preencha o Nome do Studio primeiro.");
      return;
    }
    setLoadingField('mission');
    const options = await generateMissionOptions(planData.studioName);
    setSuggestions({ type: 'mission', items: options });
    setLoadingField(null);
  };

  const handleAiVision = async () => {
    if (!planData.studioName) {
      alert("Por favor, preencha o Nome do Studio primeiro.");
      return;
    }
    setLoadingField('vision');
    const options = await generateVisionOptions(planData.studioName, planData.planningYear || new Date().getFullYear().toString());
    setSuggestions({ type: 'vision', items: options });
    setLoadingField(null);
  };

  const selectSuggestion = (text: string) => {
    if (suggestions?.type === 'mission') updatePlanData({ mission: text });
    if (suggestions?.type === 'vision') updatePlanData({ vision: text });
    setSuggestions(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Identidade do Negócio</h2>
        <p className="text-slate-500">Defina a base do seu planejamento</p>
      </div>

      <div className="space-y-4">
        <Input 
          label="Nome do Studio" 
          value={planData.studioName} 
          onChange={(e) => updatePlanData({ studioName: e.target.value })} 
          placeholder="Ex: Pilates Zen"
        />
        <Input 
          label="Ano de Referência" 
          value={planData.planningYear} 
          onChange={(e) => updatePlanData({ planningYear: e.target.value })} 
          placeholder="Ex: 2025"
        />
        
        {/* MISSION */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700 block">Missão</label>
            <button
              type="button"
              onClick={handleAiMission}
              disabled={!!loadingField}
              className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium bg-brand-50 px-2 py-1 rounded-md transition-colors"
            >
              {loadingField === 'mission' ? (
                <span className="animate-spin h-3 w-3 border-2 border-brand-600 rounded-full border-t-transparent"></span>
              ) : (
                <Wand2 className="h-3 w-3" />
              )}
              {loadingField === 'mission' ? 'Gerando Opções...' : 'Sugerir Opções IA'}
            </button>
          </div>
          
          {suggestions?.type === 'mission' && (
            <div className="mb-3 grid gap-2">
              <p className="text-xs font-semibold text-brand-600">Selecione uma opção:</p>
              {suggestions.items.map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => selectSuggestion(opt)}
                  className="text-left text-sm p-3 bg-brand-50 border border-brand-100 rounded-lg hover:bg-brand-100 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400 mb-2">Por que seu estúdio existe? Qual impacto você quer causar?</p>
          <textarea 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
            rows={3}
            value={planData.mission}
            onChange={(e) => updatePlanData({ mission: e.target.value })}
            placeholder="Ex: Proporcionar qualidade de vida e consciência corporal através do Pilates clássico..."
          />
        </div>

        {/* VISION */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700 block">Visão</label>
            <button
              type="button"
              onClick={handleAiVision}
              disabled={!!loadingField}
              className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium bg-brand-50 px-2 py-1 rounded-md transition-colors"
            >
              {loadingField === 'vision' ? (
                <span className="animate-spin h-3 w-3 border-2 border-brand-600 rounded-full border-t-transparent"></span>
              ) : (
                <Wand2 className="h-3 w-3" />
              )}
              {loadingField === 'vision' ? 'Gerando Opções...' : 'Sugerir Opções IA'}
            </button>
          </div>

          {suggestions?.type === 'vision' && (
            <div className="mb-3 grid gap-2">
              <p className="text-xs font-semibold text-brand-600">Selecione uma opção:</p>
              {suggestions.items.map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => selectSuggestion(opt)}
                  className="text-left text-sm p-3 bg-brand-50 border border-brand-100 rounded-lg hover:bg-brand-100 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400 mb-2">Onde você quer estar no final deste ano?</p>
          <textarea 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
            rows={3}
            value={planData.vision}
            onChange={(e) => updatePlanData({ vision: e.target.value })}
            placeholder="Ex: Ser referência em reabilitação na região e atingir 100 alunos ativos."
          />
        </div>

        {/* VALUES - NEW FIELD */}
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Valores e Princípios</label>
          <p className="text-xs text-slate-400 mb-2">Quais princípios guiam seu atendimento? (Ex: Empatia, Excelência Técnica)</p>
          <textarea 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
            rows={2}
            value={planData.values || ''}
            onChange={(e) => updatePlanData({ values: e.target.value })}
            placeholder="Ex: Profissionalismo, Acolhimento, Respeito ao limite do corpo..."
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext}>Próximo <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </div>
  );
};

// === Passo 2: SWOT ===
export const SwotStep: React.FC<StepProps> = ({ planData, updatePlanData, onNext, onBack }) => {
  const [activeSuggestions, setActiveSuggestions] = useState<keyof typeof planData.swot | null>(null);
  const [suggestionList, setSuggestionList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleArrayChange = (category: keyof typeof planData.swot, index: number, value: string) => {
    const newArray = [...planData.swot[category]];
    newArray[index] = value;
    updatePlanData({ swot: { ...planData.swot, [category]: newArray } });
  };

  const addItem = (category: keyof typeof planData.swot, value: string = '') => {
    updatePlanData({ swot: { ...planData.swot, [category]: [...planData.swot[category], value] } });
  };

  const removeItem = (category: keyof typeof planData.swot, index: number) => {
    const newArray = planData.swot[category].filter((_, i) => i !== index);
    updatePlanData({ swot: { ...planData.swot, [category]: newArray } });
  };

  const openSuggestions = async (category: keyof typeof planData.swot, title: string) => {
    setActiveSuggestions(category);
    setLoading(true);
    const ideas = await generateSwotSuggestions(title);
    setSuggestionList(ideas);
    setLoading(false);
  };

  const addSuggestion = (text: string) => {
    if (activeSuggestions) {
      addItem(activeSuggestions, text);
    }
  };

  const renderSection = (title: string, category: keyof typeof planData.swot, colorClass: string) => (
    <div className={`p-4 rounded-xl border ${colorClass} bg-white relative`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <button 
          onClick={() => openSuggestions(category, title)}
          className="text-xs flex items-center gap-1 bg-white border border-slate-200 shadow-sm px-2 py-1 rounded-md text-slate-600 hover:text-brand-600 hover:border-brand-300 transition-colors"
          title="Ver sugestões"
        >
          <Lightbulb className="h-3 w-3" /> Ideias
        </button>
      </div>

      <div className="space-y-2">
        {planData.swot[category].map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              value={item}
              onChange={(e) => handleArrayChange(category, idx, e.target.value)}
              placeholder="Adicionar item..."
            />
            <button onClick={() => removeItem(category, idx)} className="text-slate-400 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button onClick={() => addItem(category)} className="text-sm text-brand-600 font-medium hover:underline flex items-center gap-1">
          <Plus className="h-3 w-3" /> Adicionar
        </button>
      </div>

      {activeSuggestions === category && (
        <div className="absolute top-10 right-0 left-0 z-10 p-4 bg-white border border-slate-200 shadow-xl rounded-xl mx-2">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-slate-700">Sugestões de {title}</h4>
            <button onClick={() => setActiveSuggestions(null)} className="text-xs text-slate-400">Fechar</button>
          </div>
          
          {loading ? (
             <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5 text-brand-500" /></div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestionList.map((idea, i) => (
                <button 
                  key={i}
                  onClick={() => addSuggestion(idea)}
                  className="text-xs bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition-colors text-left"
                >
                  + {idea}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Análise SWOT</h2>
        <p className="text-slate-500">Mapeie seu cenário atual.</p>
      </div>

      {/* SWOT Explanation Block */}
      <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-xl text-sm flex gap-3">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
            <p className="font-bold mb-1">O que é SWOT?</p>
            <ul className="list-disc pl-4 space-y-1 text-blue-700/80">
                <li><strong>Forças (Strengths):</strong> O que seu studio faz de melhor (ex: equipe, localização).</li>
                <li><strong>Fraquezas (Weaknesses):</strong> Onde precisa melhorar (ex: marketing, equipamentos).</li>
                <li><strong>Oportunidades (Opportunities):</strong> Fatores externos positivos (ex: bairro crescendo).</li>
                <li><strong>Ameaças (Threats):</strong> Fatores externos negativos (ex: novos concorrentes).</li>
            </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderSection('Forças (Interno)', 'strengths', 'border-green-200 shadow-green-50')}
        {renderSection('Fraquezas (Interno)', 'weaknesses', 'border-red-200 shadow-red-50')}
        {renderSection('Oportunidades (Externo)', 'opportunities', 'border-blue-200 shadow-blue-50')}
        {renderSection('Ameaças (Externo)', 'threats', 'border-orange-200 shadow-orange-50')}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext}>Próximo <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </div>
  );
};

// === Passo 3: Objetivos ===
export const GoalsStep: React.FC<StepProps> = ({ planData, updatePlanData, onNext, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSmartGenerate = async () => {
    setIsGenerating(true);
    // Limpa objetivos vazios iniciais se houver
    const generated = await generateObjectivesSmart(planData.swot);
    if (generated && generated.length > 0) {
      updatePlanData({ objectives: generated });
    } else {
      alert("Não foi possível gerar objetivos. Tente preencher mais sua SWOT.");
    }
    setIsGenerating(false);
  };

  const updateObjective = (index: number, field: 'title', value: string) => {
    const newObjectives = [...planData.objectives];
    newObjectives[index] = { ...newObjectives[index], [field]: value };
    updatePlanData({ objectives: newObjectives });
  };

  const updateKeyResult = (objIndex: number, krIndex: number, value: string) => {
    const newObjectives = [...planData.objectives];
    const newKRs = [...newObjectives[objIndex].keyResults];
    newKRs[krIndex] = value;
    newObjectives[objIndex] = { ...newObjectives[objIndex], keyResults: newKRs };
    updatePlanData({ objectives: newObjectives });
  };

  const addObjective = () => {
    updatePlanData({ objectives: [...planData.objectives, { title: '', keyResults: [''] }] });
  };

  const addKeyResult = (objIndex: number) => {
    const newObjectives = [...planData.objectives];
    newObjectives[objIndex].keyResults.push('');
    updatePlanData({ objectives: newObjectives });
  };

  const removeKeyResult = (objIndex: number, krIndex: number) => {
    const newObjectives = [...planData.objectives];
    newObjectives[objIndex].keyResults = newObjectives[objIndex].keyResults.filter((_, i) => i !== krIndex);
    updatePlanData({ objectives: newObjectives });
  };

  const removeObjective = (index: number) => {
    updatePlanData({ objectives: planData.objectives.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Objetivos Estratégicos</h2>
        <p className="text-slate-500">O que você quer conquistar?</p>
      </div>

      {/* OKR Explanation Block */}
      <div className="bg-brand-50 border border-brand-100 text-brand-800 p-4 rounded-xl text-sm flex gap-3">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
            <p className="font-bold mb-1">Método OKR (Objectives and Key Results)</p>
            <ul className="list-disc pl-4 space-y-1 text-brand-700/80">
                <li><strong>Objetivo:</strong> ONDE eu quero chegar? (Ex: Ser referência em reabilitação).</li>
                <li><strong>Resultados Chave (Metas):</strong> COMO eu meço se cheguei lá? Devem ser números. (Ex: Atingir 50 alunos ativos).</li>
            </ul>
        </div>
      </div>
      
      {/* Smart Generate Button */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Assistente de Estratégia</h4>
          <p className="text-xs text-slate-500">Gere objetivos automaticamente baseado na sua SWOT.</p>
        </div>
        <Button onClick={handleSmartGenerate} disabled={isGenerating} className="shadow-sm">
           {isGenerating ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Sparkles className="h-4 w-4 mr-2"/>}
           {isGenerating ? 'Analisando...' : 'Gerar com IA'}
        </Button>
      </div>

      <div className="space-y-6">
        {planData.objectives.map((obj, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group">
            <button 
              onClick={() => removeObjective(idx)}
              className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remover Objetivo"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            
            <label className="text-sm font-bold text-brand-600 mb-1 block">Objetivo {idx + 1}</label>
            <input
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none mb-4"
              value={obj.title}
              onChange={(e) => updateObjective(idx, 'title', e.target.value)}
              placeholder="Ex: Aumentar faturamento em 30%"
            />

            <div className="pl-4 border-l-2 border-brand-100 space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resultados Chave (Metas Mensuráveis)</label>
              {obj.keyResults.map((kr, krIdx) => (
                <div key={krIdx} className="flex gap-2 items-center">
                    <input
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                    value={kr}
                    onChange={(e) => updateKeyResult(idx, krIdx, e.target.value)}
                    placeholder="Ex: Matricular 15 novos alunos"
                    />
                    <button 
                        onClick={() => removeKeyResult(idx, krIdx)}
                        className="text-slate-400 hover:text-red-500 p-1 flex items-center gap-1 rounded hover:bg-red-50"
                        title="Remover Meta"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-[10px] font-bold md:hidden">Remover</span>
                    </button>
                </div>
              ))}
              <button onClick={() => addKeyResult(idx)} className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1 mt-2">
                <Plus className="h-3 w-3" /> Adicionar Meta
              </button>
            </div>
          </div>
        ))}
        
        <Button variant="outline" onClick={addObjective} className="w-full border-dashed border-2 border-slate-300 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50">
          <Plus className="h-4 w-4 mr-2" /> Novo Objetivo Manual
        </Button>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext}>Próximo <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </div>
  );
};

// === Passo 4: Ações ===
export const ActionsStep: React.FC<StepProps> = ({ planData, updatePlanData, onNext, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSmartGenerate = async () => {
    if (planData.objectives.length === 0 || planData.objectives[0].title === '') {
      alert("Defina pelo menos um objetivo antes de gerar o plano de ação.");
      return;
    }

    setIsGenerating(true);
    const generated = await generateActionsSmart(planData.objectives);
    if (generated && generated.length > 0) {
      updatePlanData({ quarterlyActions: generated });
    }
    setIsGenerating(false);
  };

  const updateQuarter = (idx: number, actionsStr: string) => {
    const newQuarters = [...planData.quarterlyActions];
    newQuarters[idx] = { ...newQuarters[idx], actions: actionsStr.split('\n') };
    updatePlanData({ quarterlyActions: newQuarters });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Plano de Ação Trimestral</h2>
        <p className="text-slate-500">Como você vai executar seus objetivos?</p>
      </div>

      {/* Smart Generate Button */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-blue-800 text-sm">Cronograma Automático</h4>
          <p className="text-xs text-blue-600">Distribua ações baseadas nos seus objetivos definidos.</p>
        </div>
        <Button onClick={handleSmartGenerate} disabled={isGenerating} className="shadow-sm bg-blue-600 hover:bg-blue-700">
           {isGenerating ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Calendar className="h-4 w-4 mr-2"/>}
           {isGenerating ? 'Planejando...' : 'Gerar Cronograma'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {planData.quarterlyActions.map((q, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-brand-700 mb-2 border-b border-slate-100 pb-2">{q.quarter}</h3>
            <textarea
              className="w-full h-32 px-3 py-2 text-sm border-0 focus:ring-0 resize-none bg-slate-50 rounded-lg"
              value={q.actions.join('\n')}
              onChange={(e) => updateQuarter(idx, e.target.value)}
              placeholder="- Ação 1&#10;- Ação 2"
            />
            <p className="text-xs text-slate-400 mt-2 text-right">Edite as ações linha por linha</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext}>Revisar <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </div>
  );
};
