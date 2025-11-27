import React from 'react';
import { CalculatorInputs, FinancialModel } from '../../types';
import { Input } from '../ui/Input';

interface Props {
    inputs: CalculatorInputs;
    onInputChange: (newInputs: CalculatorInputs) => void;
    financialModel: FinancialModel;
    onModelChange: (newModel: FinancialModel) => void;
}

export const CalculatorForm: React.FC<Props> = ({ inputs, onInputChange, financialModel, onModelChange }) => {
    
    const handleChange = (field: keyof CalculatorInputs, value: string) => {
        const numValue = parseFloat(value) || 0;
        onInputChange({ ...inputs, [field]: numValue });
    };

    const handleModelChange = (field: keyof FinancialModel, value: string) => {
        const numValue = parseFloat(value) || 0;
        onModelChange({ ...financialModel, [field]: numValue });
    };

    return (
        <div className="space-y-6">
            {/* Seção 1: Capacidade do Estúdio */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">1. Capacidade do Estúdio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                        label="Mensalidade Média (R$)" 
                        type="number" 
                        value={inputs.monthlyPricePerClient} 
                        onChange={e => handleChange('monthlyPricePerClient', e.target.value)}
                    />
                    <Input 
                        label="Taxa de Ocupação Geral (%)" 
                        type="number" 
                        value={inputs.occupancyRate} 
                        onChange={e => handleChange('occupancyRate', e.target.value)}
                    />
                    <Input 
                        label="Horas Funcionamento/Dia" 
                        type="number" 
                        value={inputs.hoursPerDay} 
                        onChange={e => handleChange('hoursPerDay', e.target.value)}
                    />
                    <Input 
                        label="Alunos por Hora (Capacidade)" 
                        type="number" 
                        value={inputs.clientsPerHour} 
                        onChange={e => handleChange('clientsPerHour', e.target.value)}
                    />
                     <Input 
                        label="Dias Úteis / Mês" 
                        type="number" 
                        value={inputs.workingDaysPerMonth} 
                        onChange={e => handleChange('workingDaysPerMonth', e.target.value)}
                    />
                    <Input 
                        label="Sessões/Semana por Aluno" 
                        type="number" 
                        value={inputs.sessionsPerWeekPerClient} 
                        onChange={e => handleChange('sessionsPerWeekPerClient', e.target.value)}
                    />
                </div>
            </div>

            {/* Seção 2: Dados do Profissional */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">2. Dados da Vaga/Profissional</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                        label="Horas Semanais do Profissional" 
                        type="number" 
                        value={inputs.professionalHoursPerWeek} 
                        onChange={e => handleChange('professionalHoursPerWeek', e.target.value)}
                    />
                    <Input 
                        label="Alunos/Hora deste Profissional" 
                        type="number" 
                        value={inputs.professionalClientsPerHour} 
                        onChange={e => handleChange('professionalClientsPerHour', e.target.value)}
                    />
                    <Input 
                        label="% Ocupação Esperada (Meta)" 
                        type="number" 
                        value={inputs.professionalOccupancyRate} 
                        onChange={e => handleChange('professionalOccupancyRate', e.target.value)}
                    />
                    <Input 
                        label="% Repasse (Comissão)" 
                        type="number" 
                        value={inputs.salaryRevenuePercentage} 
                        onChange={e => handleChange('salaryRevenuePercentage', e.target.value)}
                    />
                </div>
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={inputs.useProposedSalary}
                            onChange={(e) => onInputChange({ ...inputs, useProposedSalary: e.target.checked })}
                            className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Calcular salário baseado na % de repasse</span>
                    </label>
                    
                    {!inputs.useProposedSalary && (
                        <div className="mt-3">
                             <Input 
                                label="Salário Fixo Base (R$)" 
                                type="number" 
                                value={inputs.baseSalary} 
                                onChange={e => handleChange('baseSalary', e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Seção 3: Modelo Financeiro */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">3. Modelo Financeiro (Metas em %)</h3>
                <p className="text-sm text-slate-500 mb-4">Defina como a receita deve ser distribuída idealmente.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input 
                        label="Folha (Max)" 
                        type="number" 
                        value={financialModel.payroll} 
                        onChange={e => handleModelChange('payroll', e.target.value)}
                    />
                    <Input 
                        label="Custos Oper." 
                        type="number" 
                        value={financialModel.operatingCosts} 
                        onChange={e => handleModelChange('operatingCosts', e.target.value)}
                    />
                    <Input 
                        label="Reservas/Lucro" 
                        type="number" 
                        value={financialModel.reserves} 
                        onChange={e => handleModelChange('reserves', e.target.value)}
                    />
                     <Input 
                        label="Capital Giro" 
                        type="number" 
                        value={financialModel.workingCapital} 
                        onChange={e => handleModelChange('workingCapital', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};
