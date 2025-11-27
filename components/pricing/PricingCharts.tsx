import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PricingInputs, PriceCompositionData } from '../../types';

// Cores para o gráfico de pizza
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57'];

export const FixedCostsChart: React.FC<{ data: PricingInputs['fixedCosts'] }> = ({ data }) => {
  const chartData = [
    { name: 'Aluguel', value: data.rent },
    { name: 'Contas', value: data.utilities },
    { name: 'Contabilidade', value: data.accounting },
    { name: 'Pró-labore', value: data.ownerSalary },
    { name: 'Equipe', value: data.staffSalary },
    { name: 'Materiais', value: data.consumables },
    { name: 'Marketing', value: data.marketing },
    { name: 'Outros', value: data.other },
  ].filter(item => item.value > 0);

  return (
    <div className="h-[300px] w-full mt-4">
      <h4 className="text-sm font-bold text-center text-slate-600 dark:text-slate-400 mb-2">Distribuição de Custos Fixos</h4>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => `R$ ${value.toFixed(2)}`}
            contentStyle={{ backgroundColor: 'var(--bg-paper)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const PriceCompositionChart: React.FC<{ data: PriceCompositionData }> = ({ data }) => {
  const chartData = [
    { name: 'Fixo', value: data.fixedCost },
    { name: 'Variável', value: data.variableCost },
    { name: 'Reserva', value: data.reserve },
    { name: 'Lucro', value: data.profit },
  ];

  return (
    <div className="h-[300px] w-full mt-4">
      <h4 className="text-sm font-bold text-center text-slate-600 dark:text-slate-400 mb-2">Composição do Preço da Sessão</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 12}} />
          <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
          <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};