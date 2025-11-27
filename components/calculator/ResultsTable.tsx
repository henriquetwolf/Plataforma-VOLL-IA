import React from 'react';
import { CompensationResult } from '../../types';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
    results: CompensationResult[];
}

export const ResultsTable: React.FC<Props> = ({ results }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase text-xs">
                    <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Modelo</th>
                        <th className="px-4 py-3">Custo Total (Estúdio)</th>
                        <th className="px-4 py-3">Líquido (Profissional)</th>
                        <th className="px-4 py-3">Margem Contrib.</th>
                        <th className="px-4 py-3 rounded-tr-lg text-center">Viabilidade</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {results.map((res, idx) => (
                        <tr key={idx} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                                {res.scenarioName}
                            </td>
                            <td className="px-4 py-3 text-red-600 font-medium">
                                R$ {res.costToStudio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-green-600 font-medium">
                                R$ {res.netForProfessional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                R$ {res.contributionMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-center">
                                {res.isViable ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        <CheckCircle className="w-3 h-3 mr-1" /> Viável
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        <AlertTriangle className="w-3 h-3 mr-1" /> Risco
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
