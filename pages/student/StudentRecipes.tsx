import React, { useState } from 'react';
import { generateHealthyRecipe, generateRecipeFromIngredients } from '../../services/geminiService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Utensils, Sparkles, ArrowLeft, ShoppingBasket, Target, Check, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppRoute, RecipeResponse } from '../../types';

// Lista de Alimentos com Emojis
const INGREDIENTS_DB = {
  'Proteínas': [
    { name: 'Ovos', icon: '🥚' },
    { name: 'Frango', icon: '🍗' },
    { name: 'Carne', icon: '🥩' },
    { name: 'Peixe', icon: '🐟' },
    { name: 'Atum (Lata)', icon: '🥫' },
    { name: 'Tofu', icon: '🧊' },
    { name: 'Iogurte', icon: '🥣' },
    { name: 'Whey Protein', icon: '🥤' }
  ],
  'Vegetais': [
    { name: 'Tomate', icon: '🍅' },
    { name: 'Alface/Folhas', icon: '🥬' },
    { name: 'Cenoura', icon: '🥕' },
    { name: 'Brócolis', icon: '🥦' },
    { name: 'Cebola', icon: '🧅' },
    { name: 'Batata', icon: '🥔' },
    { name: 'Abobrinha', icon: '🥒' },
    { name: 'Pimentão', icon: '🫑' }
  ],
  'Carboidratos & Grãos': [
    { name: 'Arroz', icon: '🍚' },
    { name: 'Macarrão', icon: '🍝' },
    { name: 'Pão', icon: '🍞' },
    { name: 'Aveia', icon: '🌾' },
    { name: 'Feijão', icon: '🫘' },
    { name: 'Milho', icon: '🌽' },
    { name: 'Tapioca', icon: '⚪' }
  ],
  'Frutas & Outros': [
    { name: 'Banana', icon: '🍌' },
    { name: 'Maçã', icon: '🍎' },
    { name: 'Abacate', icon: '🥑' },
    { name: 'Limão', icon: '🍋' },
    { name: 'Leite', icon: '🥛' },
    { name: 'Queijo', icon: '🧀' },
    { name: 'Castanhas', icon: '🥜' }
  ]
};

export const StudentRecipes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'goal' | 'pantry'>('goal');
  
  // States for Goal Mode
  const [goal, setGoal] = useState('');
  const [restrictions, setRestrictions] = useState('');
  
  // States for Pantry Mode
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [extraPantryInfo, setExtraPantryInfo] = useState('');

  // Result States
  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleToggleIngredient = (name: string) => {
    setSelectedIngredients(prev => 
      prev.includes(name) 
        ? prev.filter(i => i !== name) 
        : [...prev, name]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setRecipe(null);
    
    try {
      let result;
      if (activeTab === 'goal') {
        if (!goal.trim()) {
           setError("Por favor, digite um objetivo.");
           setLoading(false);
           return;
        }
        result = await generateHealthyRecipe(goal, restrictions);
      } else {
        if (selectedIngredients.length === 0) {
           setError("Selecione pelo menos um ingrediente.");
           setLoading(false);
           return;
        }
        result = await generateRecipeFromIngredients(selectedIngredients, extraPantryInfo);
      }

      if (result) {
        setRecipe(result);
      } else {
        setError('Não foi possível gerar a receita. Tente novamente.');
      }
    } catch (e) {
      setError('Erro ao conectar com a IA de receitas.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4">
        <Link to={AppRoute.STUDENT_DASHBOARD} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-5 h-5"/></Link>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Utensils className="text-green-600"/> Chef Saudável IA</h1>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-lg">
        <button 
          onClick={() => { setActiveTab('goal'); setRecipe(null); setError(''); }} 
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-all ${activeTab === 'goal' ? 'bg-white shadow text-green-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Target className="w-4 h-4" /> Criar por Objetivo
        </button>
        <button 
          onClick={() => { setActiveTab('pantry'); setRecipe(null); setError(''); }} 
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-all ${activeTab === 'pantry' ? 'bg-white shadow text-green-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ShoppingBasket className="w-4 h-4" /> Tenho em Casa
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        
        {activeTab === 'goal' ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-green-50 text-green-800 p-4 rounded-lg text-sm mb-4">
              Diga o que você quer comer ou qual seu objetivo nutricional, e a IA cria uma receita perfeita.
            </div>
            <Input 
              label="Qual seu objetivo hoje? (Ex: Café da manhã proteico, Jantar low carb)" 
              value={goal} 
              onChange={e => setGoal(e.target.value)} 
              placeholder="Ex: Lanche rápido pré-treino..."
            />
            <Input 
              label="Restrições ou Preferências? (Opcional)" 
              value={restrictions} 
              onChange={e => setRestrictions(e.target.value)} 
              placeholder="Ex: Sem glúten, sem lactose, adoro abacate..."
            />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex justify-between items-center">
               <span>Selecione os ingredientes que você tem na geladeira ou despensa.</span>
               {selectedIngredients.length > 0 && (
                 <button onClick={() => setSelectedIngredients([])} className="text-xs font-bold flex items-center gap-1 hover:underline">
                    <RotateCcw className="w-3 h-3"/> Limpar
                 </button>
               )}
            </div>

            <div className="space-y-6">
              {Object.entries(INGREDIENTS_DB).map(([category, items]) => (
                <div key={category}>
                  <h3 className="font-bold text-slate-700 text-sm mb-3 uppercase tracking-wide border-b border-slate-100 pb-1">{category}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {items.map((item) => {
                      const isSelected = selectedIngredients.includes(item.name);
                      return (
                        <button
                          key={item.name}
                          onClick={() => handleToggleIngredient(item.name)}
                          className={`relative p-3 rounded-lg border text-left transition-all flex flex-col items-center justify-center gap-2 h-24 ${
                            isSelected 
                              ? 'bg-green-50 border-green-500 ring-1 ring-green-500 text-green-800' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-green-300 hover:bg-green-50/50'
                          }`}
                        >
                          {isSelected && <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5"><Check className="w-3 h-3"/></div>}
                          <span className="text-3xl filter drop-shadow-sm">{item.icon}</span>
                          <span className="text-xs font-medium text-center leading-tight">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Input 
              label="Observações extras (Opcional)" 
              value={extraPantryInfo} 
              onChange={e => setExtraPantryInfo(e.target.value)} 
              placeholder="Ex: Quero algo rápido, para o jantar..."
            />
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <Button onClick={handleGenerate} isLoading={loading} className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg shadow-lg shadow-green-200">
          <Sparkles className="w-5 h-5 mr-2"/> {activeTab === 'goal' ? 'Criar Receita' : 'Criar com meus Ingredientes'}
        </Button>
      </div>

      {recipe && (
        <div className="bg-white p-8 rounded-xl border border-green-100 shadow-xl animate-in slide-in-from-bottom-8">
          <div className="text-center mb-6">
             <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Receita Gerada</span>
             <h2 className="text-3xl font-bold text-green-800 mt-2 mb-1">{recipe.title}</h2>
             {recipe.calories && <p className="text-sm text-slate-500 font-medium">~ {recipe.calories}</p>}
          </div>

          <div className="p-4 bg-green-50 rounded-lg text-green-800 italic text-center mb-6 text-sm">
             "{recipe.benefits}"
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                <ShoppingBasket className="w-5 h-5 text-green-600"/> Ingredientes
              </h3>
              <ul className="space-y-2 text-slate-600">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"/>
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                <Utensils className="w-5 h-5 text-green-600"/> Modo de Preparo
              </h3>
              <ol className="space-y-4 text-slate-600">
                {recipe.instructions.map((inst, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-xs border border-slate-200">{i+1}</span>
                    <span className="mt-0.5">{inst}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};