import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { generateTailoredMissions } from '../services/geminiService';
import { recordGenerationUsage } from '../services/contentService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Flag, Wand2, Copy, CheckCircle } from 'lucide-react';

export const MissionAgent: React.FC = () => {
  const { user } = useAuth();
  
  const [studioName, setStudioName] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [focus, setFocus] = useState('Reabilitação e Bem-estar');
  const [tone, setTone] = useState('Inspirador');
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!studioName) {
        alert("Preencha o nome do studio.");
        return;
    }
    setIsGenerating(true);
    
    try {
        // Convert comma string to array
        const specsArray = specialties.split(',').map(s => s.trim()).filter(s => s);
        
        const results = await generateTailoredMissions(studioName, specsArray, focus, tone);
        setSuggestions(results);
        
        // LOG USAGE
        const studioId = user?.isInstructor ? user.studioId : user?.id;
        if(studioId) await recordGenerationUsage(studioId, 'mission');
        
    } catch (e) {
        console.error(e);
        alert("Erro ao gerar missões.");
    } finally {
        setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in pb-12 p-4">
        <div className="flex items-center gap-4">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full text-blue-600 dark:text-blue-400">
                <Flag className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Criador de Missão</h1>
                <p className="text-slate-500 dark:text-slate-400">Defina a identidade do seu studio com ajuda da IA.</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <Input label="Nome do Studio" value={studioName} onChange={e => setStudioName(e.target.value)} placeholder="Ex: Pilates Zen" />
            
            <Input 
                label="Especialidades (separadas por vírgula)" 
                value={specialties} 
                onChange={e => setSpecialties(e.target.value)} 
                placeholder="Ex: Clássico, Gestantes, Idosos..." 
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Foco Principal</label>
                    <select className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-700" value={focus} onChange={e => setFocus(e.target.value)}>
                        <option>Reabilitação e Bem-estar</option>
                        <option>Performance e Força</option>
                        <option>Flexibilidade e Relaxamento</option>
                        <option>Atendimento Personalizado</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tom de Voz</label>
                    <select className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-700" value={tone} onChange={e => setTone(e.target.value)}>
                        <option>Inspirador</option>
                        <option>Profissional</option>
                        <option>Acolhedor</option>
                        <option>Energético</option>
                    </select>
                </div>
            </div>

            <Button onClick={handleGenerate} isLoading={isGenerating} className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                <Wand2 className="w-4 h-4 mr-2"/> Gerar Opções
            </Button>
        </div>

        {suggestions.length > 0 && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Opções Sugeridas</h3>
                {suggestions.map((suggestion, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center group hover:border-blue-300 transition-colors">
                        <p className="text-slate-700 dark:text-slate-300 italic">"{suggestion}"</p>
                        <button 
                            onClick={() => copyToClipboard(suggestion, idx)}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Copiar"
                        >
                            {copiedIndex === idx ? <CheckCircle className="w-5 h-5 text-green-500"/> : <Copy className="w-5 h-5"/>}
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
