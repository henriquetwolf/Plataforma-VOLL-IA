import React, { useState } from 'react';
import { generateHealthyRecipe } from '../../services/geminiService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Utensils, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppRoute, RecipeResponse } from '../../types';

export const StudentRecipes: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setRecipe(null);
    try {
      const result = await generateHealthyRecipe(goal, restrictions);
      if (result) {
        setRecipe(result);
      } else {
        setError('Não foi possível gerar a receita. Tente detalhar mais o pedido.');
      }
    } catch (e) {
      setError('Erro ao conectar com a IA de receitas.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4">
        <Link to={AppRoute.STUDENT_DASHBOARD} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-5 h-5"/></Link>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Utensils className="text-green-600"/> Chef Saudável IA</h1>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <Input label="Qual seu objetivo hoje? (Ex: Café da manhã rápido, Jantar low carb)" value={goal} onChange={e => setGoal(e.target.value)} />
        <Input label="Restrições ou Preferências? (Ex: Sem glúten, Gosto de abacate)" value={restrictions} onChange={e => setRestrictions(e.target.value)} />
        
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <Button onClick={handleGenerate} isLoading={loading} className="w-full bg-green-600 hover:bg-green-700">
          <Sparkles className="w-4 h-4 mr-2"/> Gerar Receita
        </Button>
      </div>

      {recipe && (
        <div className="bg-white p-6 rounded-xl border border-green-100 shadow-md animate-in slide-in-from-bottom-4">
          <h2 className="text-2xl font-bold text-green-800 mb-2">{recipe.title}</h2>
          <p className="text-slate-500 mb-4 italic">{recipe.benefits}</p>
          
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 mb-2">Ingredientes:</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 mb-2">Modo de Preparo:</h3>
            <ol className="list-decimal pl-5 space-y-2 text-slate-600">
              {recipe.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
            </ol>
          </div>
          {recipe.calories && <div className="mt-4 text-xs font-bold text-slate-400 text-right">aprox. {recipe.calories}</div>}
        </div>
      )}
    </div>
  );
};