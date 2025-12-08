
import React from 'react';
import { SavedPlan } from '../../types';
import { Button } from '../ui/Button';
import { ArrowLeft, Trash2, Calendar, FileText, ChevronRight } from 'lucide-react';

interface Props {
  savedPlans: SavedPlan[];
  onLoad: (plan: SavedPlan) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export const SavedPlansList: React.FC<Props> = ({ savedPlans, onLoad, onDelete, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-left-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Planos Salvos</h2>
          <p className="text-slate-500">Histórico de planejamentos estratégicos</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      {savedPlans.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Nenhum plano salvo</h3>
          <p className="text-slate-500 mt-1">Seus planos gerados aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {savedPlans.map((plan) => (
            <div 
              key={plan.id} 
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-start gap-4 cursor-pointer flex-1" onClick={() => onLoad(plan)}>
                <div className="bg-brand-50 p-3 rounded-lg text-brand-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-brand-700 transition-colors">
                    {plan.planData.studioName || 'Sem título'}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> 
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium">
                      Ano: {plan.planData.planningYear}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                <Button 
                  variant="ghost" 
                  onClick={() => onLoad(plan)}
                  className="hidden md:flex"
                >
                  Abrir <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <button 
                  onClick={() => onDelete(plan.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
