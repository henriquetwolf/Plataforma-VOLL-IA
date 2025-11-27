import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CompensationResult } from '../../types';

interface Props {
    results: CompensationResult[];
}

export const ResultsChart: React.FC<Props> = ({ results }) => {
    const data = results.map(r => ({
        name: r.scenarioName.split(' ')[0], // Pega só o primeiro nome (CLT, PJ, RPA)
        custoEstudio: r.costToStudio,
        liquidoProfissional: r.netForProfessional
    }));

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="custoEstudio" name="Custo Estúdio" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="liquidoProfissional" name="Líquido Prof." fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
