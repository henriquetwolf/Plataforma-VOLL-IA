
import React from 'react';
import { SavedFinancialSimulation } from '../../types';
import { Button } from '../ui/Button';
import { ArrowLeft, Trash2, Calendar, FileText, ChevronRight, TrendingUp } from 'lucide-react';

interface Props {
  savedSimulations: SavedFinancialSimulation[];
  onLoad: (sim: SavedFinancialSimulation) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export const SavedFinancialList: React.FC<Props> = ({ savedSimulations, onLoad, onDelete, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-left-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Simulações Salvas</h2>
          <p className="text-slate-500 dark:text-slate-400">Histórico de análises financeiras</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      {savedSimulations.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">Nenhuma simulação salva</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gere uma análise e clique em salvar para vê-la aqui.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {savedSimulations.map((sim) => (
            <div 
              key={sim.id} 
              className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-start gap-4 cursor-pointer flex-1" onClick={() => onLoad(sim)}>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-green-600 dark:text-green-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {sim.title || 'Sem título'}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> 
                      {new Date(sim.createdAt).toLocaleDateString()}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-medium">
                      Receita: R$ {sim.metrics.professionalRevenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pl-4 border-l border-slate-100 dark:border-slate-800">
                <Button 
                  variant="ghost" 
                  onClick={() => onLoad(sim)}
                  className="hidden md:flex"
                >
                  Abrir <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <button 
                  onClick={() => onDelete(sim.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
