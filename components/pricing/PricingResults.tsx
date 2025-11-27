import React from 'react';
import { CalculatedResultsPricing, SimulationResultsPricing, PriceCompositionData, PricingInputs } from '../../types';
import { PriceCompositionChart } from './PricingCharts';
import { TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Props {
  results: CalculatedResultsPricing;
  simulatedPackages: CalculatedResultsPricing['packages'];
  handlePackageChange: (key: keyof CalculatedResultsPricing['packages'], value: string) => void;
  simulationResults: SimulationResultsPricing;
  competitorPrice: number;
  simulatedOccupancyRate: number;
  handleSimulatedOccupancyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  priceCompositionData: PriceCompositionData;
  inputs: PricingInputs;
}

export const PricingResults: React.FC<Props> = ({
  results,
  simulatedPackages,
  handlePackageChange,
  simulationResults,
  competitorPrice,
  simulatedOccupancyRate,
  handleSimulatedOccupancyChange,
  priceCompositionData,
  inputs
}) => {
  if (!results.isValid) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
        <p className="text-slate-500">Preencha os dados para ver os resultados.</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-brand-50 dark:bg-brand-900/20 p-4 rounded-xl border border-brand-100 dark:border-brand-800">
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400 uppercase tracking-wide">Preço Ideal / Sessão</p>
          <p className="text-2xl font-bold text-brand-700 dark:text-brand-300 mt-1">{formatCurrency(results.pricePerSession)}</p>
          <p className="text-xs text-brand-500/80 mt-1">Para atingir a margem de {inputs.profitMargin}%</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
          <p className="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Ponto de Equilíbrio</p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">{Math.ceil(results.breakEven.sessionsPerMonth)} aulas/mês</p>
          <p className="text-xs text-purple-500/80 mt-1">Receita mínima: {formatCurrency(results.breakEven.monthlyRevenue)}</p>
        </div>
      </div>

      {/* Sugestão de Planos */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Sugestão de Preços (Planos)</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center text-sm font-medium text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
            <span>Frequência</span>
            <span>Preço Sugerido</span>
            <span>Simulação</span>
          </div>
          
          {[
            { label: '1x por semana', key: '1x' as const },
            { label: '2x por semana', key: '2x' as const },
            { label: '3x por semana', key: '3x' as const },
          ].map((plan) => (
            <div key={plan.key} className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{plan.label}</span>
              <span className="text-sm font-bold text-brand-600 dark:text-brand-400 text-center">
                {formatCurrency(results.packages[plan.key])}
              </span>
              <input 
                type="number"
                className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={simulatedPackages[plan.key]}
                onChange={(e) => handlePackageChange(plan.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Análise de Simulação */}
        {simulationResults.isSimulating && (
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Impacto da Simulação
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Nova Receita Est.</p>
                <p className="font-bold text-slate-800 dark:text-white">{formatCurrency(simulationResults.newRevenue)}</p>
              </div>
              <div>
                <p className="text-slate-500">Nova Margem Lucro</p>
                <p className={`font-bold ${simulationResults.newProfitMargin >= inputs.profitMargin ? 'text-green-600' : 'text-red-500'}`}>
                  {simulationResults.newProfitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Composição do Preço Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <PriceCompositionChart data={priceCompositionData} />
      </div>

      {/* Comparativo Concorrência */}
      {competitorPrice > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Análise de Mercado</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Média Concorrência (2x):</span>
              <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(competitorPrice)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Seu Preço (2x):</span>
              <span className={`font-bold ${results.packages['2x'] > competitorPrice ? 'text-orange-500' : 'text-green-500'}`}>
                {formatCurrency(results.packages['2x'])}
              </span>
            </div>
            
            <div className={`text-xs p-3 rounded-lg flex items-start gap-2 ${
              results.packages['2x'] > competitorPrice * 1.2
                ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
                : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
            }`}>
              {results.packages['2x'] > competitorPrice * 1.2 ? (
                <>
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>Seu preço está 20% acima da média. Certifique-se de que sua percepção de valor (estrutura, atendimento) justifica essa diferença.</p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>Seu preço está competitivo em relação ao mercado local.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};