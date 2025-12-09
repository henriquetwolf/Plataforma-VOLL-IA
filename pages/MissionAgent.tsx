import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchProfile } from '../services/storage';
import { generateTailoredMissions } from '../services/geminiService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Target, Wand2, Copy, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';

export const MissionAgent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [studioName, setStudioName] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  
  // Parâmetros de Geração
  const [focus, setFocus] = useState<string>('Bem-estar Geral');
  const [tone, setTone] = useState<string>('Inspirador');
  
  // Resultados
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const profile = await fetchProfile(user.id);
        if (profile) {
          setStudioName(profile.studioName || '');
          setSpecialties(profile.specialties || []);
        }
      }
      setLoadingProfile(false);
    };
    loadData();
  }, [user]);

  const handleGenerate = async () => {
    if (!studioName) {
      alert("Por favor, informe o nome do seu estúdio para gerar a missão.");
      return;
    }

    setIsGenerating(true);
    setSuggestions([]); // Limpar anteriores
    const results = await generateTailoredMissions(studioName, specialties, focus, tone);
    setSuggestions(results);
    setIsGenerating(false);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const focusOptions = [
    "Reabilitação e Alívio da Dor",
    "Performance e Força",
    "Conexão Corpo e Mente",
    "Bem-estar Geral e Qualidade de Vida"
  ];

  const toneOptions = [
    "Profissional e Técnico",
    "Acolhedor e Empático",
    "Inspirador e Motivacional",
    "Minimalista e Direto"
  ];

  if (loadingProfile) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-brand-600" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(AppRoute.DASHBOARD)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-brand-600" /> Criador de Missão
          </h1>
          <p className="text-slate-500">Defina o propósito do seu estúdio com ajuda da IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Coluna de Configuração */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-brand-500" /> Personalização
            </h2>
            
            <div className="space-y-4">
              <div>
                <Input
                  label="Nome do Studio"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="Ex: Pilates Zen"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Foco Principal</label>
                <div className="space-y-2">
                  {focusOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFocus(opt)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all ${
                        focus === opt 
                          ? 'bg-brand-100 text-brand-700 font-medium border border-brand-200' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Tom de Voz</label>
                <div className="space-y-2">
                  {toneOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTone(opt)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all ${
                        tone === opt 
                          ? 'bg-purple-100 text-purple-700 font-medium border border-purple-200' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full">
                <Wand2 className="h-4 w-4 mr-2" /> Gerar Missões
              </Button>
            </div>
          </div>
        </div>

        {/* Coluna de Resultados */}
        <div className="md:col-span-2">
          {isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-brand-400" />
              <p>Analisando perfil do estúdio...</p>
              <p className="text-sm">Criando opções com tom {tone}...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Sugestões Geradas:</h3>
              {suggestions.map((mission, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md transition-all group relative">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => copyToClipboard(mission, idx)}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                      {copiedIndex === idx ? (
                        <><CheckCircle2 className="h-4 w-4 text-green-500" /> Copiado</>
                      ) : (
                        <><Copy className="h-4 w-4" /> Copiar</>
                      )}
                    </button>
                  </div>
                  
                  <div className="pr-12">
                    <p className="text-slate-700 text-lg leading-relaxed font-medium">"{mission}"</p>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {focus}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                      {tone}
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm flex items-start gap-3 mt-6">
                <Target className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Dica:</strong> Escolha a missão que mais ressoa com você. Você pode copiá-la e colar no seu Perfil do Studio ou usar no seu site e redes sociais.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Target className="h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-slate-600">Pronto para começar?</h3>
              <p className="max-w-xs text-center mt-2">Confira o nome do estúdio, selecione o foco e o tom, e clique em "Gerar Missões".</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};