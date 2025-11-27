import { CalculatorInputs, CompensationResult } from '../types';

export const calculateStudioRevenue = (inputs: CalculatorInputs) => {
    const maxSessionsPerDay = inputs.hoursPerDay * inputs.clientsPerHour;
    const maxSessionsPerMonth = maxSessionsPerDay * inputs.workingDaysPerMonth;
    
    // Capacidade máxima de alunos (considerando sessões por semana)
    // Ex: 100 sessões mensais / (2 sessões/semana * 4.5 semanas)
    const avgSessionsPerMonthPerClient = inputs.sessionsPerWeekPerClient * 4.33; // 52 semanas / 12 meses
    const maxCapacityClients = Math.floor(maxSessionsPerMonth / avgSessionsPerMonthPerClient);
    
    const potentialRevenue = maxCapacityClients * inputs.monthlyPricePerClient;
    const targetRevenue = potentialRevenue * (inputs.occupancyRate / 100);

    return {
        maxCapacity: maxCapacityClients,
        potentialRevenue,
        targetRevenue
    };
};

export const calculateProfessionalRevenue = (inputs: CalculatorInputs) => {
    // Quantas aulas o profissional dá no mês
    const weeklySlots = inputs.professionalHoursPerWeek * inputs.professionalClientsPerHour;
    const monthlySlots = weeklySlots * 4.33;
    
    // Quantos alunos ele atende considerando ocupação
    const occupiedSlots = monthlySlots * (inputs.professionalOccupancyRate / 100);
    
    // Receita gerada pelo profissional = Slots Ocupados * (Preço Médio por Aula)
    // Preço Médio por Aula = Mensalidade / (Sessões/Semana * 4.33)
    const pricePerSession = inputs.monthlyPricePerClient / (inputs.sessionsPerWeekPerClient * 4.33);
    
    return occupiedSlots * pricePerSession;
};

export const calculateProposedSalary = (professionalRevenue: number, percentage: number) => {
    return professionalRevenue * (percentage / 100);
};

export const calculateCompensation = (params: {
    professionalRevenue: number;
    useProposedSalary: boolean;
    baseSalary: number;
    salaryRevenuePercentage: number;
    issPercentage: number;
    pjSimplesPercentage: number;
    otherChargesPercentage: number;
    totalRevenue: number;
    payrollPercentage: number;
}): CompensationResult[] => {
    const {
        professionalRevenue,
        useProposedSalary,
        baseSalary,
        salaryRevenuePercentage,
        issPercentage,
        pjSimplesPercentage,
        otherChargesPercentage,
        totalRevenue,
        payrollPercentage
    } = params;

    // 1. Definição do Salário Base de Cálculo
    let salaryToUse = 0;
    if (useProposedSalary) {
        salaryToUse = professionalRevenue * (salaryRevenuePercentage / 100);
    } else {
        salaryToUse = baseSalary;
    }

    const results: CompensationResult[] = [];

    // --- CENÁRIO 1: CLT ---
    // Custo Empresa: Salário + Encargos (~70% sobre salário) + VT/VR (estimado)
    // Vamos usar o otherChargesPercentage como base para encargos extras além do padrão
    // CLT Padrão Brasil: FGTS (8%) + INSS Patronal (20% se não for Simples) + Férias + 13º
    // Simplificação para estimativa: Salário * 1.6 a 1.8
    const cltCharges = 0.7; // 70% de encargos sobre o salário
    const costCLT = salaryToUse * (1 + cltCharges);
    
    // O que o prof recebe (Líquido estimado - INSS - IRPF)
    // Simplificação: Desconto médio de 15% a 20%
    const netCLT = salaryToUse * 0.85;

    results.push({
        scenarioName: 'CLT (Carteira Assinada)',
        grossRevenue: professionalRevenue,
        taxDeduction: professionalRevenue * (issPercentage / 100), // Imposto sobre a nota do estúdio
        netRevenue: professionalRevenue * (1 - issPercentage / 100),
        professionalCost: costCLT,
        grossForProfessional: salaryToUse,
        taxesProfessional: salaryToUse - netCLT, // Retido na fonte
        netForProfessional: netCLT,
        costToStudio: costCLT,
        contributionMargin: professionalRevenue - (professionalRevenue * (issPercentage / 100)) - costCLT,
        isViable: costCLT < (totalRevenue * (payrollPercentage / 100)) // Verifica se cabe no budget de folha
    });

    // --- CENÁRIO 2: PJ (Prestador de Serviço) ---
    // Estúdio paga o valor cheio. Profissional paga seu Simples Nacional (anexo III ou V)
    const costPJ = salaryToUse; // Custo para o estúdio é o valor da nota
    const netPJ = salaryToUse * (1 - pjSimplesPercentage / 100);

    results.push({
        scenarioName: 'PJ (Prestador de Serviço)',
        grossRevenue: professionalRevenue,
        taxDeduction: professionalRevenue * (issPercentage / 100),
        netRevenue: professionalRevenue * (1 - issPercentage / 100),
        professionalCost: costPJ,
        grossForProfessional: salaryToUse,
        taxesProfessional: salaryToUse * (pjSimplesPercentage / 100),
        netForProfessional: netPJ,
        costToStudio: costPJ,
        contributionMargin: professionalRevenue - (professionalRevenue * (issPercentage / 100)) - costPJ,
        isViable: true
    });

    // --- CENÁRIO 3: Autônomo (RPA) ---
    // Custo alto de INSS Patronal (20%) para o estúdio + Retenção de INSS (11%) e IRRF do profissional
    const inssPatronal = 0.20;
    const costRPA = salaryToUse * (1 + inssPatronal);
    
    // Descontos no recibo (INSS teto + IRRF tabela progressiva) -> Est. 25%
    const netRPA = salaryToUse * 0.75; 

    results.push({
        scenarioName: 'Autônomo (RPA)',
        grossRevenue: professionalRevenue,
        taxDeduction: professionalRevenue * (issPercentage / 100),
        netRevenue: professionalRevenue * (1 - issPercentage / 100),
        professionalCost: costRPA,
        grossForProfessional: salaryToUse,
        taxesProfessional: salaryToUse - netRPA,
        netForProfessional: netRPA,
        costToStudio: costRPA,
        contributionMargin: professionalRevenue - (professionalRevenue * (issPercentage / 100)) - costRPA,
        isViable: costRPA < (totalRevenue * (payrollPercentage / 100))
    });

    return results;
};
