
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStudents } from '../services/studentService';
import { fetchInstructors } from '../services/instructorService';
import { saveAssessment, fetchAssessments, deleteAssessment, saveAssessmentTemplate, fetchAssessmentTemplates, deleteAssessmentTemplate } from '../services/assessmentService';
import { Student, Instructor, StudentAssessment, AssessmentTemplate } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ClipboardList, Plus, History, Search, Trash2, Eye, FileText, Printer, Save, Layout, ArrowRight, X, ArrowLeft, CheckCircle, Activity, Accessibility, AlignJustify, UserCheck, Footprints, Filter, Calendar } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- SIMPLE EVALUATION TYPES ---
interface SimpleFormState {
  studentId: string;
  studentName: string;
  studentAge: string;
  studentSex: string;
  evaluatorId: string;
  evaluatorName: string;
  date: string;
  
  // 1. Queixa
  complaint: string;
  hasPain: boolean;
  painLocation: string;
  painDuration: string;
  painIntensity: number; // 0-10
  worsensWith: string;
  improvesWith: string;

  // 2. Histórico
  historyInjuries: boolean;
  historyInjuriesDesc: string;
  historySurgeries: boolean;
  historySurgeriesDesc: string;
  historyChronicPain: boolean;
  historyChronicPainDesc: string;

  // 3. Clínico
  clinicalConditions: string[];
  clinicalOther: string;

  // 4. Hábitos
  activityLevel: string;
  sports: string[];
  workSitting: string;
  workStanding: string;
  repetitiveMotion: boolean;
  repetitiveMotionDesc: string;
  sleepQuality: string;
  sleepHours: string;
  stressLevel: string;

  // 5-9 Campos Abertos
  postureObs: string;
  mobilityFlexibility: string;
  mobilityObs: string;
  strengthGlobal: string;
  strengthObs: string;
  studentGoals: string;
  instructorOpinion: string;
  
  // 10. Certeza
  confidenceLevel: string;

  // 11. Extra
  additionalInfo: string;
}

const INITIAL_SIMPLE_FORM: SimpleFormState = {
  studentId: '', studentName: '', studentAge: '', studentSex: '', evaluatorId: '', evaluatorName: '', date: new Date().toISOString().split('T')[0],
  complaint: '', hasPain: false, painLocation: '', painDuration: 'Semanas', painIntensity: 0, worsensWith: '', improvesWith: '',
  historyInjuries: false, historyInjuriesDesc: '', historySurgeries: false, historySurgeriesDesc: '', historyChronicPain: false, historyChronicPainDesc: '',
  clinicalConditions: [], clinicalOther: '',
  activityLevel: 'Sedentário', sports: [], workSitting: '', workStanding: '', repetitiveMotion: false, repetitiveMotionDesc: '', sleepQuality: 'Regular', sleepHours: '', stressLevel: 'Moderado',
  postureObs: '', mobilityFlexibility: 'Moderada', mobilityObs: '', strengthGlobal: '3', strengthObs: '',
  studentGoals: '', instructorOpinion: '', confidenceLevel: 'Acho que acertei a maioria', additionalInfo: ''
};

// --- CUSTOM BUILDER TYPES ---
interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'long_text' | 'radio' | 'checkbox' | 'select';
  options?: string[]; // Comma separated for builder
  value: any;
}

// --- SPECIALIZED KNEE TEMPLATE ---
const KNEE_TEMPLATE_FIELDS: CustomField[] = [
    // 1. Inspeção
    { id: 'k1', label: '--- 1. INSPEÇÃO / OBSERVAÇÃO ---', type: 'text', value: 'Seção', options: [] }, // Header simulado
    { id: 'k_align', label: 'Alinhamento dos joelhos (vista anterior)', type: 'radio', options: ['Neutro', 'Valgo', 'Varo'], value: '' },
    { id: 'k_lat', label: 'Vista lateral', type: 'radio', options: ['Normal', 'Recurvado', 'Flexo (não estende totalmente)'], value: '' },
    { id: 'k_rot', label: 'Rotação dos membros inferiores', type: 'radio', options: ['Neutra', 'Rotação interna', 'Rotação externa'], value: '' },
    { id: 'k_pat', label: 'Patela (Achados)', type: 'checkbox', options: ['Alinhamento normal', 'Patela alta', 'Patela lateralizada', 'Sinal do "J" positivo', 'Crepitação'], value: [] },
    { id: 'k_gait', label: 'Marcha', type: 'checkbox', options: ['Normal', 'Rotação externa excessiva', 'Rotação interna', 'Desvio lateral / instabilidade'], value: [] },
    { id: 'k_obs1', label: 'Observações Inspeção', type: 'text', value: '' },

    // 2. Palpação
    { id: 'k2', label: '--- 2. PALPAÇÃO (Locais de Dor) ---', type: 'text', value: 'Seção', options: [] },
    { id: 'k_palp', label: 'Marcar locais de dor', type: 'checkbox', options: ['Interlinha medial', 'Interlinha lateral', 'Tendão patelar', 'Polegar superior da patela', 'Pata de ganso', 'Trato iliotibial', 'Cabeça da fíbula', 'Região poplítea', 'Tuberosidade anterior da tíbia'], value: [] },

    // 3. ADM
    { id: 'k3', label: '--- 3. AMPLITUDE DE MOVIMENTO (ADM) ---', type: 'text', value: 'Seção', options: [] },
    { id: 'k_flex', label: 'Flexão', type: 'radio', options: ['Normal', 'Reduzida'], value: '' },
    { id: 'k_flex_deg', label: 'Graus Flexão (Opcional)', type: 'text', value: '' },
    { id: 'k_ext', label: 'Extensão', type: 'radio', options: ['Normal', 'Recurvado', 'Limitação em extensão'], value: '' },
    { id: 'k_ext_deg', label: 'Graus Extensão (Opcional)', type: 'text', value: '' },
    { id: 'k_tib_rot', label: 'Rotação da tíbia', type: 'radio', options: ['Normal', 'Dolorosa', 'Limitada'], value: '' },

    // 4. Testes Funcionais
    { id: 'k4', label: '--- 4. TESTES FUNCIONAIS (PILATES) ---', type: 'text', value: 'Seção', options: [] },
    { id: 'k_squat', label: '4.1 Agachamento Funcional', type: 'checkbox', options: ['Execução adequada', 'Valgo dinâmico', 'Dor', 'Instabilidade'], value: [] },
    { id: 'k_step', label: '4.2 Step Down', type: 'checkbox', options: ['Controle adequado', 'Queda de pelve', 'Valgo dinâmico', 'Dor anterior de joelho'], value: [] },
    { id: 'k_sls', label: '4.3 Single Leg Stance (Equilíbrio)', type: 'radio', options: ['Estável', 'Instável', 'Dor'], value: '' },
    { id: 'k_sls_time', label: 'Tempo SLS (segundos)', type: 'text', value: '' },
    { id: 'k_stairs', label: '4.4 Subida/Descida de degrau', type: 'radio', options: ['Sem dor', 'Dor anterior', 'Dor medial', 'Crepitação'], value: '' },

    // 5. Testes Específicos
    { id: 'k5', label: '--- 5. TESTES ESPECÍFICOS (Ortopédicos) ---', type: 'text', value: 'Seção', options: [] },
    
    // Menisco
    { id: 'k_men_mc', label: '5.1 Menisco: McMurray', type: 'radio', options: ['Negativo', 'Positivo (Medial)', 'Positivo (Lateral)'], value: '' },
    { id: 'k_men_ap', label: '5.1 Menisco: Apley Compressão', type: 'radio', options: ['Negativo', 'Dor', 'Estalido'], value: '' },
    { id: 'k_men_th', label: '5.1 Menisco: Thessaly', type: 'radio', options: ['Negativo', 'Dor', 'Instabilidade'], value: '' },

    // LCA
    { id: 'k_lca_la', label: '5.2 LCA: Lachman (Principal)', type: 'radio', options: ['Negativo', 'Positivo Leve', 'Positivo Moderado', 'Positivo Grave'], value: '' },
    { id: 'k_lca_ga', label: '5.2 LCA: Gaveta Anterior', type: 'radio', options: ['Negativo', 'Positivo'], value: '' },
    
    // LCP
    { id: 'k_lcp_gp', label: '5.3 LCP: Gaveta Posterior', type: 'radio', options: ['Negativo', 'Positivo'], value: '' },
    
    // Patelares
    { id: 'k_pat_comp', label: '5.5 Patela: Compressão Patelar', type: 'radio', options: ['Negativo', 'Dor', 'Crepitação'], value: '' },
    { id: 'k_pat_appr', label: '5.5 Patela: Apreensão (Smillie)', type: 'radio', options: ['Negativo', 'Positivo (sensação de deslocamento)'], value: '' },

    // 6. Conclusão
    { id: 'k6', label: '--- 6. CONCLUSÃO FUNCIONAL ---', type: 'text', value: 'Seção', options: [] },
    { id: 'k_conc_stab', label: 'Estabilidade', type: 'radio', options: ['Boa', 'Moderada', 'Instável'], value: '' },
    { id: 'k_conc_mob', label: 'Mobilidade', type: 'radio', options: ['Boa', 'Reduzida', 'Assimétrica'], value: '' },
    { id: 'k_conc_str', label: 'Força (Percepção Funcional)', type: 'radio', options: ['Boa', 'Moderada', 'Fraca'], value: '' },
    { id: 'k_conc_rec', label: 'Recomendação Inicial para Pilates', type: 'checkbox', options: ['Foco em mobilidade', 'Foco em estabilidade', 'Foco em fortalecimento', 'Foco em controle motor', 'Evitar sobrecarga em flexão profunda'], value: [] },
    { id: 'k_final_obs', label: 'Observações Finais', type: 'long_text', value: '' }
];

// --- SPECIALIZED HIP TEMPLATE ---
const HIP_TEMPLATE_FIELDS: CustomField[] = [
  // 1. Queixa
  { id: 'h1', label: '--- 1. QUEIXA RELACIONADA AO QUADRIL ---', type: 'text', value: 'Seção', options: [] },
  { id: 'h_side', label: 'Lado acometido', type: 'radio', options: ['Direito', 'Esquerdo', 'Bilateral', 'Sem queixa no quadril'], value: '' },
  { id: 'h_loc', label: 'Região predominante da dor', type: 'radio', options: ['Anterior / virilha (intra-articular)', 'Lateral / região do trocânter maior', 'Posterior / glútea', 'Lombar com irradiação', 'Sem dor'], value: '' },
  { id: 'h_pain_type', label: 'Tipo de dor (se houver)', type: 'text', value: '' },
  { id: 'h_pain_int', label: 'Intensidade da dor (0-10)', type: 'select', options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], value: '' },

  // 2. Inspeção
  { id: 'h2', label: '--- 2. INSPEÇÃO / MARCHA / CONTROLE PÉLVICO ---', type: 'text', value: 'Seção', options: [] },
  { id: 'h_gait', label: 'Marcha', type: 'radio', options: ['Normal', 'Antálgica (manquejando)', 'Claudicante', 'Compensações visíveis'], value: '' },
  { id: 'h_gait_obs', label: 'Observações Marcha', type: 'text', value: '' },
  { id: 'h_pelvis', label: 'Comportamento da pelve ao caminhar / ficar em pé', type: 'radio', options: ['Estável', 'Queda pélvica contra-lateral', 'Inclinação exagerada de tronco'], value: '' },

  // 3. Trendelenburg
  { id: 'h3', label: '--- 3. TESTE DE TRENDELENBURG ---', type: 'text', value: 'Seção', options: [] },
  { id: 'h_trend_r', label: 'Quadril DIREITO em apoio', type: 'radio', options: ['Negativo (pelve estável)', 'Positivo (queda pelve esq / compensação)'], value: '' },
  { id: 'h_trend_l', label: 'Quadril ESQUERDO em apoio', type: 'radio', options: ['Negativo (pelve estável)', 'Positivo (queda pelve dir / compensação)'], value: '' },

  // 4. ADM
  { id: 'h4', label: '--- 4. AMPLITUDE DE MOVIMENTO (ADM) ---', type: 'text', value: 'Seção', options: [] },
  { id: 'h_rom_flex_r', label: 'Flexão Direito', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_flex_l', label: 'Flexão Esquerdo', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_ext_r', label: 'Extensão Direito', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_ext_l', label: 'Extensão Esquerdo', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_abd_r', label: 'Abdução Direito', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_abd_l', label: 'Abdução Esquerdo', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_add_r', label: 'Adução Direito', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_add_l', label: 'Adução Esquerdo', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_rot_int_r', label: 'Rot. Interna Direito', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_rot_int_l', label: 'Rot. Interna Esquerdo', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_rot_ext_r', label: 'Rot. Externa Direito', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_rot_ext_l', label: 'Rot. Externa Esquerdo', type: 'radio', options: ['Normal', 'Reduzida', 'Dolorosa'], value: '' },
  { id: 'h_rom_obs', label: 'Observações ADM', type: 'long_text', value: '' },

  // 5. Encurtamento
  { id: 'h5', label: '--- 5. TESTES DE ENCURTAMENTO ---', type: 'text', value: 'Seção', options: [] },
  { id: 'h_thomas_r', label: 'Thomas (Flexores) - Direito', type: 'radio', options: ['Normal', 'Encurtado', 'Dor'], value: '' },
  { id: 'h_thomas_l', label: 'Thomas (Flexores) - Esquerdo', type: 'radio', options: ['Normal', 'Encurtado', 'Dor'], value: '' },
  { id: 'h_ely_r', label: 'Ely (Reto Femoral) - Direito', type: 'radio', options: ['Normal', 'Encurtado', 'Dor'], value: '' },
  { id: 'h_ely_l', label: 'Ely (Reto Femoral) - Esquerdo', type: 'radio', options: ['Normal', 'Encurtado', 'Dor'], value: '' },
  { id: 'h_ober_r', label: 'Ober (Trato Iliotibial) - Direito', type: 'radio', options: ['Negativo (cede)', 'Positivo (alto/encurtado)'], value: '' },
  { id: 'h_ober_l', label: 'Ober (Trato Iliotibial) - Esquerdo', type: 'radio', options: ['Negativo (cede)', 'Positivo (alto/encurtado)'], value: '' },

  // 6. Trocantérica
  { id: 'h6', label: '--- 6. REGIÃO TROCANTÉRICA ---', type: 'text', value: 'Seção', options: [] },
  { id: 'h_palp_r', label: 'Palpação Trocânter - Direito', type: 'radio', options: ['Sem dor', 'Dor localizada', 'Hipersensível'], value: '' },
  { id: 'h_palp_l', label: 'Palpação Trocânter - Esquerdo', type: 'radio', options: ['Sem dor', 'Dor localizada', 'Hipersensível'], value: '' },
  { id: 'h_derot_r', label: 'Derotation Test - Direito', type: 'radio', options: ['Não realizado', 'Negativo', 'Positivo (dor lateral)'], value: '' },
  { id: 'h_derot_l', label: 'Derotation Test - Esquerdo', type: 'radio', options: ['Não realizado', 'Negativo', 'Positivo (dor lateral)'], value: '' },

  // 7. Adutores
  { id: 'h7', label: '--- 7. ADUTORES / PÚBIS ---', type: 'text', value: 'Seção', options: [] },
  { id: 'h_squeeze', label: 'Squeeze Test (Contração resistida)', type: 'radio', options: ['Não realizado', 'Negativo (sem dor)', 'Positivo (Dor virilha)', 'Positivo (Dor adutores)', 'Positivo (Dor sínfise)'], value: '' },

  // 8. Intra-articular
  { id: 'h8', label: '--- 8. TESTES INTRA-ARTICULARES ---', type: 'text', value: 'Seção', options: [] },
  { id: 'h_faber_mob', label: 'FABER - Mobilidade', type: 'radio', options: ['Simétrica', 'Assimétrica / Joelho alto'], value: '' },
  { id: 'h_faber_pain', label: 'FABER - Dor', type: 'radio', options: ['Sem dor', 'Dor na virilha (intra)', 'Dor sacroilíaca (post)'], value: '' },
  { id: 'h_fadir', label: 'FADIR (Impacto Femoroacetabular)', type: 'radio', options: ['Não realizado', 'Negativo', 'Positivo (dor na virilha)'], value: '' },
  { id: 'h_drehmann', label: 'Sinal de Drehmann', type: 'radio', options: ['Não observado', 'Positivo (rot. ext. precoce na flexão)'], value: '' },

  // 9. Piriforme
  { id: 'h9', label: '--- 9. PIRIFORME / DOR GLÚTEA ---', type: 'text', value: 'Seção', options: [] },
  { id: 'h_piri', label: 'Teste ativo de piriforme', type: 'radio', options: ['Não realizado', 'Negativo', 'Positivo (Dor glútea)', 'Positivo (Dor irradiada/ciático)'], value: '' },

  // 10. Sacro-ilíaca
  { id: 'h10', label: '--- 10. SACRO-ILÍACA (OPCIONAL) ---', type: 'text', value: 'Seção', options: [] },
  { id: 'h_sij_palp', label: 'Palpação SIJ', type: 'radio', options: ['Sem dor', 'Dor unilat. dir', 'Dor unilat. esq', 'Dor bilateral'], value: '' },
  { id: 'h_gaenslen', label: 'Gaenslen', type: 'radio', options: ['Não realizado', 'Negativo', 'Positivo (dor sacroilíaca)'], value: '' },

  // 11. Conclusão
  { id: 'h11', label: '--- 11. SÍNTESE FUNCIONAL ---', type: 'text', value: 'Seção', options: [] },
  { id: 'h_conc_stab', label: 'Estabilidade', type: 'radio', options: ['Boa', 'Moderada', 'Instável'], value: '' },
  { id: 'h_conc_mob', label: 'Mobilidade', type: 'radio', options: ['Boa', 'Reduzida', 'Assimétrica'], value: '' },
  { id: 'h_conc_str', label: 'Força percebida', type: 'radio', options: ['Boa', 'Moderada', 'Fraca'], value: '' },
  { id: 'h_conc_pain', label: 'Dor ao movimento funcional (agachar, subir degrau)', type: 'radio', options: ['Não', 'Sim'], value: '' },
  { id: 'h_conc_rec', label: 'Recomendação para Pilates', type: 'checkbox', options: ['Mobilidade de quadril', 'Estabilização pélvica/abdutores', 'Foco em flexores', 'Foco em adutores/pubalgia', 'Evitar amplitudes extremas'], value: [] },
  { id: 'h_final_obs', label: 'Observações Finais', type: 'long_text', value: '' }
];

// --- SPECIALIZED SPINE TEMPLATE ---
const SPINE_TEMPLATE_FIELDS: CustomField[] = [
  // 1. Região
  { id: 's1', label: '--- 1. REGIÃO AVALIADA ---', type: 'text', value: 'Seção', options: [] },
  { id: 's_region', label: 'Região Principal', type: 'checkbox', options: ['Cervical', 'Torácica', 'Lombar', 'Sacroilíaca', 'Múltiplas'], value: [] },

  // 2. Dor
  { id: 's2', label: '--- 2. LOCALIZAÇÃO E DOR ---', type: 'text', value: 'Seção', options: [] },
  { id: 's_pain_loc', label: 'Localização Específica', type: 'checkbox', options: ['Cervical Anterior', 'Cervical Posterior', 'Trapézio/Ombro', 'Torácica', 'Lombar Central', 'Lombar Direita', 'Lombar Esquerda'], value: [] },
  { id: 's_pain_irr', label: 'Irradiação', type: 'radio', options: ['Não', 'MMSS (Braços)', 'MMII (Pernas) - Direita', 'MMII (Pernas) - Esquerda', 'MMII - Bilateral'], value: '' },
  { id: 's_irr_area', label: 'Região de Irradiação', type: 'checkbox', options: ['Glútea', 'Posterior Coxa', 'Lateral Coxa', 'Panturrilha', 'Pé/Dedos'], value: [] },
  { id: 's_pain_scale', label: 'Escala de Dor (0-10)', type: 'select', options: ['0','1','2','3','4','5','6','7','8','9','10'], value: '' },

  // 3. Fatores
  { id: 's3', label: '--- 3. FATORES AGRAVANTES / ALIVIANTES ---', type: 'text', value: 'Seção', options: [] },
  { id: 's_worse', label: 'Piora com', type: 'checkbox', options: ['Flexão', 'Extensão', 'Rotação', 'Sentado', 'Em pé', 'Caminhada', 'Impacto', 'Ao acordar'], value: [] },
  { id: 's_better', label: 'Melhora com', type: 'checkbox', options: ['Repouso', 'Calor', 'Movimento leve', 'Alongamento', 'Analgesia', 'Deitado'], value: '' },

  // 4. Testes Funcionais
  { id: 's4', label: '--- 4. TESTES FUNCIONAIS / ORTOPÉDICOS ---', type: 'text', value: 'Seção', options: [] },
  
  // Lombar
  { id: 's_test_lasegue', label: 'Lasegue (Lombar/Ciático)', type: 'radio', options: ['Negativo', 'Positivo (30-70 graus)'], value: '' },
  { id: 's_test_bragard', label: 'Bragard (Confirmação Lasegue)', type: 'radio', options: ['Negativo', 'Positivo'], value: '' },
  { id: 's_test_slump', label: 'Slump Test (Tensão Neural)', type: 'radio', options: ['Negativo', 'Positivo'], value: '' },
  { id: 's_test_instab', label: 'Instabilidade Segmentar (Prone)', type: 'radio', options: ['Negativo', 'Positivo (dor some com ativação)'], value: '' },
  { id: 's_test_valsalva', label: 'Valsalva (Aumento pressão)', type: 'radio', options: ['Negativo', 'Positivo (dor/irradiação)'], value: '' },

  // Torácica
  { id: 's_thor_mob', label: 'Mobilidade Torácica', type: 'radio', options: ['Normal', 'Rígida/Bloco', 'Dor ao movimento'], value: '' },
  { id: 's_test_adams', label: 'Adams (Escoliose)', type: 'radio', options: ['Sem gibosidade', 'Gibosidade Direita', 'Gibosidade Esquerda'], value: '' },

  // Cervical
  { id: 's_test_spurling', label: 'Spurling (Compressão Foraminal)', type: 'radio', options: ['Negativo', 'Positivo (Irradiação)'], value: '' },
  { id: 's_test_distrac', label: 'Distração Cervical', type: 'radio', options: ['Sem alteração', 'Alívio da dor (Positivo)', 'Piora'], value: '' },
  { id: 's_test_tos', label: 'Desfiladeiro Torácico (Adson/Roos)', type: 'radio', options: ['Negativo', 'Positivo'], value: '' },

  // 5. Mobilidade
  { id: 's5', label: '--- 5. ANÁLISE DE MOBILIDADE ATIVA ---', type: 'text', value: 'Seção', options: [] },
  { id: 's_mob_flex', label: 'Flexão Lombar (Dedos ao chão)', type: 'radio', options: ['Toca o chão', 'Tornozelos', 'Joelhos', 'Limitado (Coxa)'], value: '' },
  { id: 's_mob_ext', label: 'Extensão Global', type: 'radio', options: ['Normal', 'Limitada', 'Dolorosa'], value: '' },
  { id: 's_mob_rot', label: 'Rotação de Tronco', type: 'radio', options: ['Simétrica', 'Limitada Dir', 'Limitada Esq'], value: '' },
  { id: 's_mob_cerv', label: 'Mobilidade Cervical', type: 'checkbox', options: ['Livre', 'Limitada Flex/Ext', 'Limitada Rotação', 'Dor final de ADM'], value: [] },

  // 6. Força
  { id: 's6', label: '--- 6. CONTROLE MOTOR / FORÇA (0-5) ---', type: 'text', value: 'Seção', options: [] },
  { id: 's_str_core', label: 'Estabilidade Core/Abdominal', type: 'text', value: '' },
  { id: 's_str_ext', label: 'Extensores da Coluna', type: 'text', value: '' },
  { id: 's_str_glute', label: 'Glúteos', type: 'text', value: '' },
  
  // 7. Conclusão
  { id: 's7', label: '--- 7. CONCLUSÃO E PLANO ---', type: 'text', value: 'Seção', options: [] },
  { id: 's_goals_student', label: 'Objetivos do Aluno', type: 'long_text', value: '' },
  { id: 's_goals_instructor', label: 'Objetivos do Instrutor (Plano)', type: 'long_text', value: '' },
  { id: 's_certainty', label: 'Grau de Certeza', type: 'radio', options: ['100% Seguro', 'Acho que acertei', 'Inseguro'], value: '' },
  { id: 's_obs', label: 'Observações Finais', type: 'long_text', value: '' }
];

// --- SPECIALIZED SHOULDER TEMPLATE ---
const SHOULDER_TEMPLATE_FIELDS: CustomField[] = [
  // 1. Inspeção
  { id: 'sh1', label: '--- 1. INSPEÇÃO (Estática e Dinâmica) ---', type: 'text', value: 'Seção', options: [] },
  { id: 'sh_static', label: 'Inspeção Estática (Simetria, Atrofias, Cicatrizes)', type: 'long_text', value: '' },
  { id: 'sh_dyn_elev', label: 'Elevação do Braço (ADM)', type: 'radio', options: ['Completa (180°)', 'Limitada (90-160°)', 'Muito Limitada (<90°)', 'Arco doloroso'], value: '' },
  { id: 'sh_scap_rhythm', label: 'Ritmo Escápulo-Umeral', type: 'radio', options: ['Normal', 'Discinesia (borda medial)', 'Discinesia (ângulo inferior)', 'Hiking (elevação trapézio)'], value: '' },

  // 2. Palpação
  { id: 'sh2', label: '--- 2. PALPAÇÃO (Pontos Dolorosos) ---', type: 'text', value: 'Seção', options: [] },
  { id: 'sh_palp_bone', label: 'Estruturas Ósseas/Articulares', type: 'checkbox', options: ['AC (Acrômio-Clavicular)', 'Esterno-Clavicular', 'Acrômio', 'Tubérculo Maior', 'Processo Coracoide', 'Espinha da Escápula'], value: [] },
  { id: 'sh_palp_musc', label: 'Musculatura / Tendões', type: 'checkbox', options: ['Trapézio Superior', 'Levantador da Escápula', 'Supraespinhal', 'Infraespinhal', 'Bíceps (Sulco)', 'Peitoral Menor', 'Romboides'], value: [] },

  // 3. ADM Funcional
  { id: 'sh3', label: '--- 3. ADM E FUNÇÃO (Mão nas Costas/Nuca) ---', type: 'text', value: 'Seção', options: [] },
  { id: 'sh_apple_nuca', label: 'Mão na Nuca (Abd + Rot Ext)', type: 'radio', options: ['Normal', 'Limitado', 'Dor'], value: '' },
  { id: 'sh_apple_costas', label: 'Mão nas Costas (Add + Rot Int)', type: 'radio', options: ['T12-L1 (Normal)', 'L2-L5', 'Glúteo', 'Dor'], value: '' },
  { id: 'sh_reach', label: 'Alcance Funcional', type: 'checkbox', options: ['Alcança objeto alto', 'Penteia cabelo', 'Coloca sutiã/carteira', 'Dorme sobre o ombro'], value: [] },

  // 4. Testes Especiais
  { id: 'sh4', label: '--- 4. TESTES ESPECIAIS (Ortopédicos) ---', type: 'text', value: 'Seção', options: [] },
  
  // Impacto
  { id: 'sh_imp_neer', label: 'Neer (Impacto)', type: 'radio', options: ['Negativo', 'Positivo (Dor anterior)'], value: '' },
  { id: 'sh_imp_hawkins', label: 'Hawkins-Kennedy (Impacto)', type: 'radio', options: ['Negativo', 'Positivo'], value: '' },
  { id: 'sh_imp_yocum', label: 'Yocum', type: 'radio', options: ['Negativo', 'Positivo'], value: '' },

  // Manguito
  { id: 'sh_rc_jobe', label: 'Jobe / Empty Can (Supraespinhal)', type: 'radio', options: ['Forte/Sem dor', 'Dor', 'Fraqueza (Queda do braço)'], value: '' },
  { id: 'sh_rc_patte', label: 'Patte / Rot. Ext (Infraespinhal)', type: 'radio', options: ['Forte', 'Fraco/Dor'], value: '' },
  { id: 'sh_rc_gerber', label: 'Gerber / Lift-off (Subescapular)', type: 'radio', options: ['Consegue afastar', 'Não consegue/Dor'], value: '' },
  { id: 'sh_rc_drop', label: 'Drop Arm (Rotura Massiva)', type: 'radio', options: ['Negativo', 'Positivo (Braço cai)'], value: '' },

  // Bíceps
  { id: 'sh_bic_speed', label: 'Speed Test (Bíceps)', type: 'radio', options: ['Negativo', 'Positivo (Dor sulco)'], value: '' },
  { id: 'sh_bic_yerg', label: 'Yergason (Bíceps/Instab)', type: 'radio', options: ['Negativo', 'Positivo'], value: '' },

  // AC e Instabilidade
  { id: 'sh_ac_cross', label: 'Cross-body (Acrômio-Clavicular)', type: 'radio', options: ['Negativo', 'Positivo (Dor no topo)'], value: '' },
  { id: 'sh_inst_appr', label: 'Apreensão (Instabilidade Ant)', type: 'radio', options: ['Negativo', 'Positivo (Medo/Dor)'], value: '' },

  // 5. Força
  { id: 'sh5', label: '--- 5. FORÇA MUSCULAR (0-5) ---', type: 'text', value: 'Seção', options: [] },
  { id: 'sh_str_delt', label: 'Deltóide', type: 'text', value: '' },
  { id: 'sh_str_serr', label: 'Serrátil Anterior', type: 'text', value: '' },
  { id: 'sh_str_trap', label: 'Trapézio (Inf/Médio)', type: 'text', value: '' },
  { id: 'sh_str_rot', label: 'Manguito Global', type: 'text', value: '' },

  // 6. Conclusão
  { id: 'sh6', label: '--- 6. ANÁLISE FINAL ---', type: 'text', value: 'Seção', options: [] },
  { id: 'sh_hyp', label: 'Hipótese Principal', type: 'checkbox', options: ['Síndrome do Impacto', 'Tendinopatia Manguito', 'Bursite', 'Capsulite Adesiva', 'Instabilidade', 'Discinesia Escapular', 'Disfunção Cervical Associada'], value: [] },
  { id: 'sh_plan', label: 'Plano de Ação', type: 'long_text', value: '' }
];

// --- SPECIALIZED FOOT AND ANKLE TEMPLATE ---
const FOOT_TEMPLATE_FIELDS: CustomField[] = [
  // 1. Dados Iniciais
  { id: 'f1', label: '--- 1. DADOS INICIAIS ---', type: 'text', value: 'Seção', options: [] },
  { id: 'f_side', label: 'Lado avaliado', type: 'radio', options: ['Direito', 'Esquerdo', 'Ambos'], value: '' },
  { id: 'f_complaint', label: 'Queixa principal', type: 'long_text', value: '' },
  { id: 'f_pain_loc', label: 'Localização da dor', type: 'text', value: '' },
  { id: 'f_radiation', label: 'Irradiação', type: 'text', value: '' },
  { id: 'f_intensity', label: 'Intensidade (0-10)', type: 'select', options: ['0','1','2','3','4','5','6','7','8','9','10'], value: '' },
  { id: 'f_worse', label: 'Piora com', type: 'text', value: '' },
  { id: 'f_better', label: 'Melhora com', type: 'text', value: '' },
  { id: 'f_onset', label: 'Início da dor', type: 'text', value: '' },

  // 2. Inspeção
  { id: 'f2', label: '--- 2. INSPEÇÃO EM PÉ (ESTÁTICO) ---', type: 'text', value: 'Seção', options: [] },
  { id: 'f_arch', label: 'Arco longitudinal medial', type: 'radio', options: ['Normal', 'Abaixado / Pé plano', 'Aumentado / Pé cavo'], value: '' },
  { id: 'f_rear', label: 'Alinhamento do retropé', type: 'radio', options: ['Valgo', 'Varo', 'Neutro'], value: '' },
  { id: 'f_fore', label: 'Antepé', type: 'radio', options: ['Abduzido', 'Aduzido', 'Neutro'], value: '' },
  { id: 'f_bony', label: 'Proeminências ósseas', type: 'checkbox', options: ['Navicular', '5º metatarso', 'Calosidades'], value: [] },
  { id: 'f_edema', label: 'Edema', type: 'checkbox', options: ['Ausente', 'Lateral inframaleolar', 'Medial', 'Dorsal', 'Difuso'], value: [] },
  { id: 'f_circ', label: 'Circunferência (cm)', type: 'text', value: '' },

  // 3. Palpação
  { id: 'f3', label: '--- 3. PALPAÇÃO ESPECÍFICA (DOR) ---', type: 'text', value: 'Seção', options: [] },
  { id: 'f_palp_lat', label: 'Lateral', type: 'checkbox', options: ['Maléolo lateral', 'Lig. Talofibular Ant. (TFA)', 'Lig. Calcâneo-fibular (CFL)', 'Lig. Talofibular Post. (TFP)', 'Fibulares (curto/longo)'], value: [] },
  { id: 'f_palp_med', label: 'Medial', type: 'checkbox', options: ['Maléolo medial', 'Lig. Deltoide', 'Tibial posterior / Navicular', 'Túnel do Tarso'], value: [] },
  { id: 'f_palp_other', label: 'Outros', type: 'checkbox', options: ['Sindesmose (Tib-Fib)', 'Tendão Calcâneo', 'Fáscia Plantar', 'Calcâneo', 'Cabeça Metatarsos', 'Seio do Tarso'], value: [] },
  { id: 'f_palp_obs', label: 'Observações Palpação', type: 'long_text', value: '' },

  // 4. Mobilidade (ADM)
  { id: 'f4', label: '--- 4. MOBILIDADE (ADM) ---', type: 'text', value: 'Seção', options: [] },
  { id: 'f_rom_dorsi', label: 'Dorsiflexão (°)', type: 'text', value: '' },
  { id: 'f_rom_plant', label: 'Flexão Plantar (°)', type: 'text', value: '' },
  { id: 'f_rom_inv', label: 'Inversão (°)', type: 'text', value: '' },
  { id: 'f_rom_ever', label: 'Eversão (°)', type: 'text', value: '' },
  { id: 'f_lunge', label: 'Lunge Test (Cadeia Fechada) - Distância/Angulação', type: 'text', value: '' },
  { id: 'f_sym', label: 'Simetria entre os lados?', type: 'radio', options: ['Sim', 'Não'], value: '' },

  // 5. Testes Especiais
  { id: 'f5', label: '--- 5. TESTES ESPECIAIS ---', type: 'text', value: 'Seção', options: [] },
  { id: 'f_draw', label: 'Gaveta Anterior (Instabilidade)', type: 'radio', options: ['Negativo', 'Positivo'], value: '' },
  { id: 'f_tilt', label: 'Inclinação Talar (Talar Tilt)', type: 'checkbox', options: ['Positivo TFA', 'Positivo CFL', 'Positivo TFP', 'Negativo'], value: [] },
  { id: 'f_squeeze', label: 'Squeeze Test (Sindesmose)', type: 'radio', options: ['Negativo', 'Positivo (Dor alta)'], value: '' },
  { id: 'f_tinel', label: 'Tinel (Túnel do Tarso)', type: 'radio', options: ['Negativo', 'Positivo (Choque/Parestesia)'], value: '' },
  { id: 'f_thompson', label: 'Thompson (Ruptura Aquiles)', type: 'radio', options: ['Negativo (Faz flexão plantar)', 'Positivo (Sem movimento)'], value: '' },
  { id: 'f_windlass', label: 'Windlass Test (Fáscia/Arco)', type: 'radio', options: ['Normal (Arco sobe)', 'Reduzido', 'Ausente/Dor'], value: '' },
  { id: 'f_nav_drop', label: 'Navicular Drop (Queda do Navicular)', type: 'text', value: '' },

  // 6. Força
  { id: 'f6', label: '--- 6. FORÇA MUSCULAR (0-5) ---', type: 'text', value: 'Seção', options: [] },
  { id: 'f_str_dorsi', label: 'Dorsiflexão (Tibial Ant)', type: 'text', value: '' },
  { id: 'f_str_plant', label: 'Flexão Plantar (Tríceps Sural)', type: 'text', value: '' },
  { id: 'f_str_inv', label: 'Inversão (Tibial Post)', type: 'text', value: '' },
  { id: 'f_str_ever', label: 'Eversão (Fibulares)', type: 'text', value: '' },
  { id: 'f_str_toes', label: 'Flexores dos Dedos', type: 'text', value: '' },
  { id: 'f_calf_raise', label: 'Resistência Panturrilha (Reps D/E)', type: 'text', value: '' },

  // 7. Funcional
  { id: 'f7', label: '--- 7. TESTES FUNCIONAIS ---', type: 'text', value: 'Seção', options: [] },
  { id: 'f_step_down', label: 'Step Down', type: 'checkbox', options: ['Sem compensações', 'Valgo dinâmico', 'Rotações excessivas', 'Dor'], value: [] },
  { id: 'f_sls', label: 'Apoio Unipodal (Equilíbrio)', type: 'radio', options: ['Estável', 'Instável', 'Dor'], value: '' },
  { id: 'f_sls_time', label: 'Tempo Unipodal (segundos)', type: 'text', value: '' },
  { id: 'f_jumps', label: 'Saltos (Bi/Unipodal)', type: 'checkbox', options: ['Normal', 'Dor', 'Instabilidade', 'Compensações'], value: [] },

  // 8. Marcha
  { id: 'f8', label: '--- 8. ANÁLISE DE MARCHA ---', type: 'text', value: 'Seção', options: [] },
  { id: 'f_gait_init', label: 'Fase Inicial', type: 'checkbox', options: ['Contato adequado', 'Dorsiflexão limitada', 'Pronação abrupta'], value: [] },
  { id: 'f_gait_mid', label: 'Apoio Médio', type: 'radio', options: ['Estável', 'Colapso medial (pronação excessiva)'], value: '' },
  { id: 'f_gait_prop', label: 'Propulsão', type: 'checkbox', options: ['Adequada', 'Sem mola (rígido)', 'Dor ao impulsionar'], value: [] },

  // 9. Diagnóstico
  { id: 'f9', label: '--- 9. HIPÓTESES DIAGNÓSTICAS ---', type: 'text', value: 'Seção', options: [] },
  { id: 'f_diag', label: 'Hipóteses', type: 'checkbox', options: ['Entorse lateral', 'Entorse alta/sindesmose', 'Tendinopatia fibulares', 'Tendinopatia calcâneo', 'Disfunção Tibial Post', 'Fasciopatia plantar', 'Pé plano', 'Pé cavo'], value: [] },
  { id: 'f_diag_other', label: 'Outros', type: 'text', value: '' },

  // 10. Objetivos
  { id: 'f10', label: '--- 10. OBJETIVOS E PLANO ---', type: 'text', value: 'Seção', options: [] },
  { id: 'f_goals_student', label: 'Objetivos do Aluno', type: 'long_text', value: '' },
  { id: 'f_goals_pro', label: 'Objetivos do Profissional', type: 'checkbox', options: ['Mobilidade', 'Força', 'Estabilidade', 'Redução da dor', 'Reeducação da marcha', 'Retorno ao esporte'], value: [] },
  { id: 'f_certainty', label: 'Grau de Certeza', type: 'radio', options: ['100% seguro', 'Acertei a maioria', 'Ainda inseguro'], value: '' },

  // 11. Obs
  { id: 'f11', label: '--- 11. OBSERVAÇÕES FINAIS ---', type: 'text', value: 'Seção', options: [] },
  { id: 'f_final_obs', label: 'Observações Finais', type: 'long_text', value: '' }
];

// --- COMPONENTS DEFINED OUTSIDE TO PREVENT RE-RENDER FOCUS LOSS ---

const SectionHeader = ({ title, icon: Icon }: any) => (
  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex items-center gap-2 border border-slate-200 dark:border-slate-700 mt-6 mb-4">
      {Icon && <Icon className="w-5 h-5 text-brand-600" />}
      <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm tracking-wide">{title}</h3>
  </div>
);

interface FieldBuilderProps {
    label: string;
    setLabel: (val: string) => void;
    type: CustomField['type'];
    setType: (val: CustomField['type']) => void;
    options: string;
    setOptions: (val: string) => void;
    onAdd: () => void;
}

const FieldBuilder: React.FC<FieldBuilderProps> = ({ label, setLabel, type, setType, options, setOptions, onAdd }) => (
  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-lg mb-4 grid gap-4 animate-in fade-in">
      <Input label="Pergunta / Rótulo" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Qual seu objetivo?" autoFocus />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Tipo de Campo</label>
              <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-brand-500" value={type} onChange={e => setType(e.target.value as any)}>
                  <option value="text">Texto Curto</option>
                  <option value="long_text">Texto Longo</option>
                  <option value="radio">Múltipla Escolha</option>
                  <option value="checkbox">Caixas de Seleção</option>
                  <option value="select">Lista Suspensa</option>
              </select>
          </div>
          {['radio', 'checkbox', 'select'].includes(type) && (
              <Input label="Opções (separar por vírgula)" value={options} onChange={e => setOptions(e.target.value)} placeholder="Sim, Não, Talvez" />
          )}
      </div>
      <Button onClick={onAdd} size="sm" variant="secondary" className="self-end" disabled={!label}>
          <Plus className="w-4 h-4 mr-2"/> Adicionar Campo
      </Button>
  </div>
);

export const StudentAssessmentPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'new' | 'templates' | 'history'>('new');
  
  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [assessments, setAssessments] = useState<StudentAssessment[]>([]);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // --- NEW EVALUATION FLOW STATE ---
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [formMode, setFormMode] = useState<'none' | 'simple' | 'custom'>('none');
  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState('');

  // Forms Data
  const [simpleForm, setSimpleForm] = useState<SimpleFormState>(INITIAL_SIMPLE_FORM);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  
  // --- TEMPLATE MANAGER STATE ---
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateFields, setTemplateFields] = useState<CustomField[]>([]);
  
  // Field Builder (Shared)
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomField['type']>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // History View
  const [viewAssessment, setViewAssessment] = useState<StudentAssessment | null>(null);
  
  // Filters State
  const [filterModel, setFilterModel] = useState('');
  const [filterEvaluator, setFilterEvaluator] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    const targetId = user?.isInstructor ? user.studioId : user?.id;
    if (targetId) {
        const [s, i, a, t] = await Promise.all([
            fetchStudents(targetId),
            fetchInstructors(targetId),
            fetchAssessments(targetId),
            fetchAssessmentTemplates(targetId)
        ]);
        setStudents(s);
        setInstructors(i);
        setAssessments(a);
        setTemplates(t);
        
        // Auto-set evaluator if current user is instructor
        if (user?.isInstructor) {
            setSimpleForm(prev => ({ ...prev, evaluatorId: user.dbId || user.id, evaluatorName: user.name }));
        } else if (user?.isOwner) {
            setSimpleForm(prev => ({ ...prev, evaluatorId: user.id, evaluatorName: user.name }));
        }
    }
    setLoading(false);
  };

  // --- HELPERS ---
  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return '';
    const diff = Date.now() - new Date(birthDate).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
  };

  const initSimpleForm = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    setSimpleForm({
        ...INITIAL_SIMPLE_FORM,
        studentId: student.id,
        studentName: student.name,
        studentAge: calculateAge(student.birthDate),
        // If instructor, force their ID. If Owner, set them as default but allow change in UI
        evaluatorId: user?.isInstructor ? (user.dbId || user.id) : (user?.id || ''),
        evaluatorName: user?.name || ''
    });
  };

  const initCustomForm = (studentId: string, title: string, fields: any[]) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    // Initialize fields with empty values based on template structure
    const initializedFields = fields.map((f: any) => ({
        ...f,
        value: f.type === 'checkbox' ? [] : ''
    }));

    setCustomFields(initializedFields);
    setSelectedTemplateTitle(title);
    
    // We reuse simpleForm for header data (Evaluator, Date, Student Info)
    setSimpleForm(prev => ({
        ...prev,
        studentId: student.id,
        studentName: student.name,
        studentAge: calculateAge(student.birthDate),
        evaluatorId: user?.isInstructor ? (user.dbId || user.id) : (user?.id || ''),
        evaluatorName: user?.name || ''
    }));
  };

  const handleSaveSimple = async () => {
    if (!user) return;
    const targetId = user.isInstructor ? user.studioId : user.id;
    if (!targetId || !simpleForm.studentId) return;

    // Se o usuário logado é Dono (não instrutor), e o ID do avaliador selecionado
    // é igual ao ID do Dono, enviamos instructorId como null ou undefined, pois o dono não está na tabela instructors
    // Se o ID for de um instrutor, enviamos
    let instrId = undefined;
    
    // Verifica se o ID selecionado pertence a um instrutor da lista
    const selectedInstructor = instructors.find(i => i.id === simpleForm.evaluatorId);
    if (selectedInstructor) {
        instrId = selectedInstructor.id;
    }

    const result = await saveAssessment(targetId, {
        studioId: targetId,
        studentId: simpleForm.studentId,
        instructorId: instrId, // Send undefined if Owner is the evaluator
        studentName: simpleForm.studentName,
        instructorName: simpleForm.evaluatorName,
        type: 'simple',
        title: 'Avaliação Padrão VOLL',
        content: simpleForm
    });

    if (result.success) {
        alert("Avaliação salva!");
        loadData();
        setFormMode('none');
        setSelectedStudent('');
        setActiveTab('history');
    } else {
        alert("Erro: " + result.error);
    }
  };

  const handleSaveCustomAssessment = async () => {
    if (!user || !selectedTemplateTitle) return;
    const targetId = user.isInstructor ? user.studioId : user.id;
    
    let instrId = undefined;
    const selectedInstructor = instructors.find(i => i.id === simpleForm.evaluatorId);
    if (selectedInstructor) {
        instrId = selectedInstructor.id;
    }

    const result = await saveAssessment(targetId!, {
        studioId: targetId!,
        studentId: simpleForm.studentId,
        instructorId: instrId,
        studentName: simpleForm.studentName,
        instructorName: simpleForm.evaluatorName,
        type: 'custom',
        title: selectedTemplateTitle,
        content: {
            ...simpleForm, // Header data
            fields: customFields
        }
    });

    if (result.success) {
        alert("Avaliação salva!");
        loadData();
        setFormMode('none');
        setSelectedStudent('');
        setCustomFields([]);
        setActiveTab('history');
    } else {
        alert("Erro: " + result.error);
    }
  };

  // --- TEMPLATE BUILDER ---
  const addFieldToTemplate = () => {
    if (!newFieldLabel) return;
    const options = ['radio', 'checkbox', 'select'].includes(newFieldType) 
        ? newFieldOptions.split(',').map(s => s.trim()) 
        : undefined;
    
    setTemplateFields([...templateFields, {
        id: crypto.randomUUID(),
        label: newFieldLabel,
        type: newFieldType,
        options,
        value: '' // Placeholder
    }]);
    setNewFieldLabel('');
    setNewFieldOptions('');
  };

  const saveNewTemplate = async () => {
      if (!user || !templateTitle) return;
      const targetId = user.isInstructor ? user.studioId : user.id;
      
      const result = await saveAssessmentTemplate(targetId!, templateTitle, templateFields);
      if (result.success) {
          alert("Modelo criado!");
          loadData();
          setIsCreatingTemplate(false);
          setTemplateFields([]);
          setTemplateTitle('');
      } else {
          alert("Erro: " + result.error);
      }
  };

  const handleDeleteTemplate = async (id: string) => {
      if (confirm("Excluir este modelo?")) {
          await deleteAssessmentTemplate(id);
          loadData();
      }
  };

  // --- PRINT ---
  const handlePrint = () => {
    const input = document.getElementById('printable-assessment');
    if (input) {
      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
        pdf.save('avaliacao.pdf');
      });
    }
  };

  // --- FILTERED ASSESSMENTS ---
  const filteredAssessments = assessments.filter(a => {
    const matchesModel = !filterModel || a.title === filterModel;
    const matchesEvaluator = !filterEvaluator || (a.instructorName || 'Desconhecido') === filterEvaluator;
    const matchesStudent = !filterStudent || a.studentName === filterStudent;
    
    let matchesDate = true;
    if (filterStartDate) {
        matchesDate = matchesDate && new Date(a.createdAt) >= new Date(filterStartDate);
    }
    if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(a.createdAt) <= end;
    }

    return matchesModel && matchesEvaluator && matchesStudent && matchesDate;
  });

  const uniqueModels = Array.from(new Set(assessments.map(a => a.title))).sort();
  const uniqueEvaluators = Array.from(new Set(assessments.map(a => a.instructorName || 'Desconhecido'))).sort();
  const uniqueStudentsHistory = Array.from(new Set(assessments.map(a => a.studentName))).sort();

  const clearFilters = () => {
      setFilterModel('');
      setFilterEvaluator('');
      setFilterStudent('');
      setFilterStartDate('');
      setFilterEndDate('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-12">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <ClipboardList className="text-brand-600"/> Avaliação Física
            </h1>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto">
                <button onClick={() => { setActiveTab('new'); setSelectedStudent(''); setFormMode('none'); }} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'new' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Nova Avaliação</button>
                <button onClick={() => setActiveTab('templates')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'templates' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Gerenciar Modelos</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-white' : 'text-slate-500'}`}>Histórico</button>
            </div>
        </div>

        {/* --- TAB: NEW ASSESSMENT FLOW --- */}
        {activeTab === 'new' && (
            <div className="space-y-8 mt-4">
                
                {/* STEP 1: SELECT STUDENT */}
                {formMode === 'none' && !selectedStudent && (
                    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center animate-in zoom-in-95">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">1. Selecione o Aluno</h2>
                        <div className="relative">
                            <select 
                                className="w-full p-4 text-lg border-2 border-brand-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:border-brand-500 outline-none transition-colors cursor-pointer"
                                value={selectedStudent}
                                onChange={e => setSelectedStudent(e.target.value)}
                            >
                                <option value="">-- Escolha um Aluno da Lista --</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {/* STEP 2: SELECT MODEL */}
                {formMode === 'none' && selectedStudent && (
                    <div className="animate-in slide-in-from-right-4">
                        <div className="flex items-center gap-4 mb-6">
                            <Button variant="ghost" onClick={() => setSelectedStudent('')}><ArrowLeft className="w-4 h-4 mr-2"/> Voltar</Button>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Escolha o Modelo de Avaliação</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Standard Model Card */}
                            <button 
                                onClick={() => { initSimpleForm(selectedStudent); setFormMode('simple'); }}
                                className="relative bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-brand-100 dark:border-brand-900/30 hover:border-brand-500 hover:shadow-lg transition-all text-left group flex flex-col items-center justify-center min-h-[200px]"
                            >
                                <div className="absolute top-4 right-4 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="w-5 h-5"/></div>
                                <div className="bg-brand-50 dark:bg-brand-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <FileText className="w-8 h-8 text-brand-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Modelo Padrão VOLL</h3>
                                <p className="text-sm text-slate-500 text-center">Avaliação completa com anamnese, dor, postura e testes físicos.</p>
                            </button>

                            {/* SPINE SPECIALIZED MODEL (NEW) */}
                            <button 
                                onClick={() => { 
                                    initCustomForm(selectedStudent, 'Avaliação da Coluna', SPINE_TEMPLATE_FIELDS); 
                                    setFormMode('custom'); 
                                }}
                                className="relative bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-purple-100 dark:border-purple-900/30 hover:border-purple-500 hover:shadow-lg transition-all text-left group flex flex-col items-center justify-center min-h-[200px]"
                            >
                                <div className="absolute top-4 right-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="w-5 h-5"/></div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <AlignJustify className="w-8 h-8 text-purple-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Modelo Coluna (Especializado)</h3>
                                <p className="text-sm text-slate-500 text-center">Foco em Cervical, Torácica e Lombar com testes neurais e ortopédicos.</p>
                            </button>

                            {/* SHOULDER SPECIALIZED MODEL (NEW) */}
                            <button 
                                onClick={() => { 
                                    initCustomForm(selectedStudent, 'Avaliação do Ombro', SHOULDER_TEMPLATE_FIELDS); 
                                    setFormMode('custom'); 
                                }}
                                className="relative bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-cyan-100 dark:border-cyan-900/30 hover:border-cyan-500 hover:shadow-lg transition-all text-left group flex flex-col items-center justify-center min-h-[200px]"
                            >
                                <div className="absolute top-4 right-4 text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="w-5 h-5"/></div>
                                <div className="bg-cyan-50 dark:bg-cyan-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <UserCheck className="w-8 h-8 text-cyan-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Modelo Ombro (Especializado)</h3>
                                <p className="text-sm text-slate-500 text-center">Foco em manguito, impacto, instabilidade e ritmo escapular.</p>
                            </button>

                            {/* KNEE SPECIALIZED MODEL (HARDCODED) */}
                            <button 
                                onClick={() => { 
                                    initCustomForm(selectedStudent, 'Avaliação de Joelho', KNEE_TEMPLATE_FIELDS); 
                                    setFormMode('custom'); 
                                }}
                                className="relative bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-blue-100 dark:border-blue-900/30 hover:border-blue-500 hover:shadow-lg transition-all text-left group flex flex-col items-center justify-center min-h-[200px]"
                            >
                                <div className="absolute top-4 right-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="w-5 h-5"/></div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Activity className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Modelo Joelho (Especializado)</h3>
                                <p className="text-sm text-slate-500 text-center">Protocolo completo para joelho: menisco, ligamentos e funcional.</p>
                            </button>

                            {/* HIP SPECIALIZED MODEL (HARDCODED) */}
                            <button 
                                onClick={() => { 
                                    initCustomForm(selectedStudent, 'Avaliação de Quadril', HIP_TEMPLATE_FIELDS); 
                                    setFormMode('custom'); 
                                }}
                                className="relative bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-orange-100 dark:border-orange-900/30 hover:border-orange-500 hover:shadow-lg transition-all text-left group flex flex-col items-center justify-center min-h-[200px]"
                            >
                                <div className="absolute top-4 right-4 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="w-5 h-5"/></div>
                                <div className="bg-orange-50 dark:bg-orange-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Accessibility className="w-8 h-8 text-orange-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Modelo Quadril (Especializado)</h3>
                                <p className="text-sm text-slate-500 text-center">Avaliação completa para quadril: queixas, testes ortopédicos e função.</p>
                            </button>

                            {/* FOOT AND ANKLE SPECIALIZED MODEL (HARDCODED) */}
                            <button 
                                onClick={() => { 
                                    initCustomForm(selectedStudent, 'Avaliação Pé e Tornozelo', FOOT_TEMPLATE_FIELDS); 
                                    setFormMode('custom'); 
                                }}
                                className="relative bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-500 hover:shadow-lg transition-all text-left group flex flex-col items-center justify-center min-h-[200px]"
                            >
                                <div className="absolute top-4 right-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="w-5 h-5"/></div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Footprints className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Modelo Pé e Tornozelo</h3>
                                <p className="text-sm text-slate-500 text-center">Avaliação completa para pé e tornozelo: inspeção, ADM e testes.</p>
                            </button>

                            {/* Custom Templates Cards */}
                            {templates.map(tpl => (
                                <button 
                                    key={tpl.id}
                                    onClick={() => { initCustomForm(selectedStudent, tpl.title, tpl.fields); setFormMode('custom'); }}
                                    className="relative bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-gray-500 hover:shadow-lg transition-all text-left group flex flex-col items-center justify-center min-h-[200px]"
                                >
                                    <div className="absolute top-4 right-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="w-5 h-5"/></div>
                                    <div className="bg-gray-50 dark:bg-gray-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Layout className="w-8 h-8 text-gray-600" />
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 text-center">{tpl.title}</h3>
                                    <p className="text-sm text-slate-500 text-center">{tpl.fields.length} campos personalizados.</p>
                                </button>
                            ))}

                            {/* Create New Shortcut */}
                            <button 
                                onClick={() => setActiveTab('templates')}
                                className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all text-left flex flex-col items-center justify-center min-h-[200px] text-slate-400 group"
                            >
                                <Plus className="w-8 h-8 mb-2 group-hover:text-slate-600 dark:group-hover:text-slate-300"/>
                                <span className="font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300">Criar Novo Modelo</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: FILL FORM (Simple or Custom) */}
                {(formMode === 'simple' || formMode === 'custom') && (
                    <div className="animate-in slide-in-from-bottom-8">
                        <div className="flex items-center justify-between mb-6">
                            <Button variant="ghost" onClick={() => setFormMode('none')}><ArrowLeft className="w-4 h-4 mr-2"/> Trocar Modelo</Button>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {formMode === 'simple' ? 'Avaliação Padrão VOLL' : selectedTemplateTitle}
                            </h2>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            {/* Standard Header Data (Common to both) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg mb-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Aluno</label>
                                    <Input value={simpleForm.studentName} readOnly className="bg-white dark:bg-slate-900" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
                                    <Input type="date" value={simpleForm.date} onChange={e => setSimpleForm({...simpleForm, date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Avaliador Responsável</label>
                                    {user?.isInstructor ? (
                                        <Input value={simpleForm.evaluatorName} readOnly className="bg-slate-200 dark:bg-slate-800 cursor-not-allowed" />
                                    ) : (
                                        <select 
                                            className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                            value={simpleForm.evaluatorId}
                                            onChange={(e) => {
                                                const selectedId = e.target.value;
                                                // Se selecionou o próprio Dono
                                                if (selectedId === user?.id) {
                                                    setSimpleForm(prev => ({ ...prev, evaluatorId: user.id, evaluatorName: user.name }));
                                                } else {
                                                    // Se selecionou um Instrutor
                                                    const inst = instructors.find(i => i.id === selectedId);
                                                    if (inst) {
                                                        setSimpleForm(prev => ({ ...prev, evaluatorId: inst.id, evaluatorName: inst.name }));
                                                    }
                                                }
                                            }}
                                        >
                                            <option value={user?.id}>{user?.name} (Eu / Dono)</option>
                                            {instructors.map(inst => (
                                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* Render Specific Form Content */}
                            {formMode === 'simple' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Idade</label><Input value={simpleForm.studentAge} readOnly className="bg-slate-100 dark:bg-slate-800" /></div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase">Sexo</label>
                                            <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.studentSex} onChange={e => setSimpleForm({...simpleForm, studentSex: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                <option>Feminino</option>
                                                <option>Masculino</option>
                                                <option>Outro</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* 1. Queixa */}
                                    <SectionHeader title="1. Queixa Principal" />
                                    <Input label="Qual a queixa principal?" value={simpleForm.complaint} onChange={e => setSimpleForm({...simpleForm, complaint: e.target.value})} />
                                    
                                    <div className="flex gap-6 items-center my-4">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Sente dor?</span>
                                        <label className="flex gap-2"><input type="radio" checked={simpleForm.hasPain} onChange={() => setSimpleForm({...simpleForm, hasPain: true})} /> Sim</label>
                                        <label className="flex gap-2"><input type="radio" checked={!simpleForm.hasPain} onChange={() => setSimpleForm({...simpleForm, hasPain: false})} /> Não</label>
                                    </div>

                                    {simpleForm.hasPain && (
                                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900">
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <Input label="Local da dor" value={simpleForm.painLocation} onChange={e => setSimpleForm({...simpleForm, painLocation: e.target.value})} />
                                                <div>
                                                    <label className="block text-sm font-medium mb-1 dark:text-red-200">Desde quando?</label>
                                                    <select className="w-full p-2 border rounded dark:bg-slate-900 dark:text-white" value={simpleForm.painDuration} onChange={e => setSimpleForm({...simpleForm, painDuration: e.target.value})}>
                                                        <option>Dias</option>
                                                        <option>Semanas</option>
                                                        <option>Meses</option>
                                                        <option>Anos</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="my-4">
                                                <label className="block text-sm font-medium mb-2 dark:text-red-200">Intensidade (0-10): <span className="font-bold text-red-600">{simpleForm.painIntensity}</span></label>
                                                <input type="range" min="0" max="10" className="w-full" value={simpleForm.painIntensity} onChange={e => setSimpleForm({...simpleForm, painIntensity: parseInt(e.target.value)})} />
                                                <div className="flex justify-between text-xs text-slate-400"><span>0 (Sem dor)</span><span>10 (Insuportável)</span></div>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <Input label="O que piora?" value={simpleForm.worsensWith} onChange={e => setSimpleForm({...simpleForm, worsensWith: e.target.value})} />
                                                <Input label="O que melhora?" value={simpleForm.improvesWith} onChange={e => setSimpleForm({...simpleForm, improvesWith: e.target.value})} />
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. Histórico */}
                                    <SectionHeader title="2. Histórico de Lesões" />
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" checked={simpleForm.historyInjuries} onChange={e => setSimpleForm({...simpleForm, historyInjuries: e.target.checked})} /> Lesões Prévias</label>
                                            {simpleForm.historyInjuries && <Input placeholder="Quais?" value={simpleForm.historyInjuriesDesc} onChange={e => setSimpleForm({...simpleForm, historyInjuriesDesc: e.target.value})} />}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" checked={simpleForm.historySurgeries} onChange={e => setSimpleForm({...simpleForm, historySurgeries: e.target.checked})} /> Cirurgias</label>
                                            {simpleForm.historySurgeries && <Input placeholder="Quais?" value={simpleForm.historySurgeriesDesc} onChange={e => setSimpleForm({...simpleForm, historySurgeriesDesc: e.target.value})} />}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" checked={simpleForm.historyChronicPain} onChange={e => setSimpleForm({...simpleForm, historyChronicPain: e.target.checked})} /> Episódios de Dor Crônica</label>
                                            {simpleForm.historyChronicPain && <Input placeholder="Descrição" value={simpleForm.historyChronicPainDesc} onChange={e => setSimpleForm({...simpleForm, historyChronicPainDesc: e.target.value})} />}
                                        </div>
                                    </div>

                                    {/* 3. Clínico */}
                                    <SectionHeader title="3. Condições Clínicas" />
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {['Hipertensão', 'Diabetes', 'Cardiopatias', 'Artrose/Artrite', 'LER/DORT', 'Hernia de Disco', 'Gestante', 'Pós-parto'].map(cond => (
                                            <label key={cond} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer hover:border-brand-300">
                                                <input 
                                                    type="checkbox" 
                                                    checked={simpleForm.clinicalConditions.includes(cond)}
                                                    onChange={e => {
                                                        if (e.target.checked) setSimpleForm(prev => ({...prev, clinicalConditions: [...prev.clinicalConditions, cond]}));
                                                        else setSimpleForm(prev => ({...prev, clinicalConditions: prev.clinicalConditions.filter(c => c !== cond)}));
                                                    }}
                                                /> {cond}
                                            </label>
                                        ))}
                                    </div>
                                    <Input label="Outras (Descreva)" value={simpleForm.clinicalOther} onChange={e => setSimpleForm({...simpleForm, clinicalOther: e.target.value})} className="mt-2" />

                                    {/* 4. Hábitos */}
                                    <SectionHeader title="4. Hábitos e Rotina" />
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Atividade Física</label>
                                            <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.activityLevel} onChange={e => setSimpleForm({...simpleForm, activityLevel: e.target.value})}>
                                                <option>Sedentário</option>
                                                <option>1-2x/semana</option>
                                                <option>3-4x/semana</option>
                                                <option>5+ vezes/semana</option>
                                            </select>
                                        </div>
                                        <Input label="Esportes (separar por vírgula)" value={simpleForm.sports.join(', ')} onChange={e => setSimpleForm({...simpleForm, sports: e.target.value.split(',')})} />
                                        
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Trabalho Sentado (h)</label>
                                            <input type="number" className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.workSitting} onChange={e => setSimpleForm({...simpleForm, workSitting: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Trabalho em Pé (h)</label>
                                            <input type="number" className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.workStanding} onChange={e => setSimpleForm({...simpleForm, workStanding: e.target.value})} />
                                        </div>
                                        
                                        <div className="md:col-span-2">
                                            <label className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-300"><input type="checkbox" checked={simpleForm.repetitiveMotion} onChange={e => setSimpleForm({...simpleForm, repetitiveMotion: e.target.checked})} /> Movimentos Repetitivos?</label>
                                            {simpleForm.repetitiveMotion && <Input placeholder="Quais?" value={simpleForm.repetitiveMotionDesc} onChange={e => setSimpleForm({...simpleForm, repetitiveMotionDesc: e.target.value})} />}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Sono (Qualidade)</label>
                                            <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.sleepQuality} onChange={e => setSimpleForm({...simpleForm, sleepQuality: e.target.value})}>
                                                <option>Ótimo</option>
                                                <option>Bom</option>
                                                <option>Regular</option>
                                                <option>Ruim</option>
                                            </select>
                                        </div>
                                        <Input label="Horas por noite" value={simpleForm.sleepHours} onChange={e => setSimpleForm({...simpleForm, sleepHours: e.target.value})} />
                                        
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Estresse</label>
                                            <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.stressLevel} onChange={e => setSimpleForm({...simpleForm, stressLevel: e.target.value})}>
                                                <option>Baixo</option>
                                                <option>Moderado</option>
                                                <option>Alto</option>
                                                <option>Muito Alto</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* 5. Postura */}
                                    <SectionHeader title="5. Observações Posturais" />
                                    <textarea 
                                        className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 h-24" 
                                        placeholder="Ex: Cabeça protraída, hiperlordose..." 
                                        value={simpleForm.postureObs} 
                                        onChange={e => setSimpleForm({...simpleForm, postureObs: e.target.value})}
                                    />

                                    {/* 6. Mobilidade */}
                                    <SectionHeader title="6. Mobilidade e Flexibilidade" />
                                    <div className="mb-2">
                                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Nível Geral</label>
                                        <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.mobilityFlexibility} onChange={e => setSimpleForm({...simpleForm, mobilityFlexibility: e.target.value})}>
                                            <option>Excelente</option>
                                            <option>Boa</option>
                                            <option>Moderada</option>
                                            <option>Reduzida</option>
                                            <option>Muito Reduzida</option>
                                        </select>
                                    </div>
                                    <textarea className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 h-20" placeholder="Obs específicas..." value={simpleForm.mobilityObs} onChange={e => setSimpleForm({...simpleForm, mobilityObs: e.target.value})} />

                                    {/* 7. Força */}
                                    <SectionHeader title="7. Força Muscular" />
                                    <div className="mb-2">
                                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Força Global (0-5)</label>
                                        <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.strengthGlobal} onChange={e => setSimpleForm({...simpleForm, strengthGlobal: e.target.value})}>
                                            <option value="5">5 - Excelente</option>
                                            <option value="4">4 - Boa Resistência</option>
                                            <option value="3">3 - Com compensações</option>
                                            <option value="2">2 - Fraca</option>
                                            <option value="1">1 - Muito Fraca</option>
                                            <option value="0">0 - Incapaz</option>
                                        </select>
                                    </div>
                                    <textarea className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 h-20" placeholder="Obs..." value={simpleForm.strengthObs} onChange={e => setSimpleForm({...simpleForm, strengthObs: e.target.value})} />

                                    {/* 8-11 Conclusão */}
                                    <SectionHeader title="Conclusão" />
                                    <Input label="8. Objetivos do Aluno" value={simpleForm.studentGoals} onChange={e => setSimpleForm({...simpleForm, studentGoals: e.target.value})} />
                                    <Input label="9. Opinião do Instrutor (Objetivos propostos)" value={simpleForm.instructorOpinion} onChange={e => setSimpleForm({...simpleForm, instructorOpinion: e.target.value})} />
                                    
                                    <div className="my-4">
                                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">10. Grau de Certeza</label>
                                        <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={simpleForm.confidenceLevel} onChange={e => setSimpleForm({...simpleForm, confidenceLevel: e.target.value})}>
                                            <option>100% seguro</option>
                                            <option>Acho que acertei a maioria</option>
                                            <option>Estou inseguro</option>
                                        </select>
                                    </div>

                                    <div className="my-4">
                                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">11. Informações Adicionais / Testes</label>
                                        <textarea className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 h-32" value={simpleForm.additionalInfo} onChange={e => setSimpleForm({...simpleForm, additionalInfo: e.target.value})} />
                                    </div>

                                    <Button onClick={handleSaveSimple} className="w-full text-lg py-4 shadow-lg shadow-brand-200">Salvar Avaliação Padrão</Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {customFields.map((field) => (
                                        <div key={field.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                                            {/* Render "Fake Header" fields differently */}
                                            {field.value === 'Seção' ? (
                                                <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm tracking-wide bg-slate-100 dark:bg-slate-800 p-2 rounded">{field.label}</h3>
                                            ) : (
                                                <>
                                                    <label className="block font-medium mb-2 text-slate-800 dark:text-white">{field.label}</label>
                                                    
                                                    {field.type === 'text' && (
                                                        <input className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={field.value} onChange={e => {
                                                            setCustomFields(customFields.map(f => f.id === field.id ? {...f, value: e.target.value} : f));
                                                        }} />
                                                    )}
                                                    
                                                    {field.type === 'long_text' && (
                                                        <textarea className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg h-24 bg-white dark:bg-slate-950" value={field.value} onChange={e => {
                                                            setCustomFields(customFields.map(f => f.id === field.id ? {...f, value: e.target.value} : f));
                                                        }} />
                                                    )}
                                                    
                                                    {field.type === 'select' && (
                                                        <select className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950" value={field.value} onChange={e => {
                                                            setCustomFields(customFields.map(f => f.id === field.id ? {...f, value: e.target.value} : f));
                                                        }}>
                                                            <option value="">Selecione...</option>
                                                            {field.options?.map(opt => <option key={opt}>{opt}</option>)}
                                                        </select>
                                                    )}

                                                    {field.type === 'radio' && (
                                                        <div className="space-y-2">
                                                            {field.options?.map(opt => (
                                                                <label key={opt} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                                    <input 
                                                                        type="radio" 
                                                                        name={field.id} 
                                                                        checked={field.value === opt}
                                                                        onChange={() => setCustomFields(customFields.map(f => f.id === field.id ? {...f, value: opt} : f))}
                                                                    />
                                                                    {opt}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {field.type === 'checkbox' && (
                                                        <div className="space-y-2">
                                                            {field.options?.map(opt => (
                                                                <label key={opt} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={(field.value as string[]).includes(opt)}
                                                                        onChange={e => {
                                                                            const current = field.value as string[];
                                                                            const newVal = e.target.checked 
                                                                                ? [...current, opt]
                                                                                : current.filter(x => x !== opt);
                                                                            setCustomFields(customFields.map(f => f.id === field.id ? {...f, value: newVal} : f));
                                                                        }}
                                                                    />
                                                                    {opt}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    
                                    <Button onClick={handleSaveCustomAssessment} className="w-full mt-8 py-4 shadow-lg shadow-purple-200">Salvar Avaliação Personalizada</Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TAB: TEMPLATES --- */}
        {activeTab === 'templates' && (
            <div className="space-y-6">
                {!isCreatingTemplate ? (
                    <>
                        <div className="flex justify-end">
                            <Button onClick={() => setIsCreatingTemplate(true)}>
                                <Plus className="w-4 h-4 mr-2"/> Criar Novo Modelo
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {templates.map(tpl => (
                                <div key={tpl.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-brand-300 transition-colors">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{tpl.title}</h3>
                                        <p className="text-sm text-slate-500">{tpl.fields.length} campos configurados.</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                        <button onClick={() => handleDeleteTemplate(tpl.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <div className="col-span-3 text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                    Nenhum modelo criado.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl mx-auto animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Criar Modelo de Avaliação</h2>
                            <Button variant="ghost" onClick={() => { setIsCreatingTemplate(false); setTemplateFields([]); }}>Cancelar</Button>
                        </div>
                        
                        <div className="space-y-6">
                            <Input label="Título do Modelo" value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} placeholder="Ex: Avaliação Postural Simplificada" />
                            
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                <h3 className="font-bold mb-4 text-slate-800 dark:text-white">Adicionar Campos</h3>
                                
                                <FieldBuilder 
                                    label={newFieldLabel} 
                                    setLabel={setNewFieldLabel} 
                                    type={newFieldType} 
                                    setType={setNewFieldType} 
                                    options={newFieldOptions} 
                                    setOptions={setNewFieldOptions} 
                                    onAdd={addFieldToTemplate} 
                                />
                                
                                <div className="space-y-2 mt-4">
                                    {templateFields.map((field, idx) => (
                                        <div key={field.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                                            <div>
                                                <span className="font-bold text-sm mr-2 text-slate-500">{idx+1}.</span>
                                                <span className="text-sm font-medium text-slate-800 dark:text-white">{field.label}</span>
                                                <span className="text-xs text-slate-500 ml-2 uppercase">({field.type})</span>
                                            </div>
                                            <button onClick={() => setTemplateFields(templateFields.filter(f => f.id !== field.id))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                    {templateFields.length === 0 && <p className="text-slate-400 text-sm italic text-center">Nenhum campo adicionado.</p>}
                                </div>
                            </div>

                            <Button onClick={saveNewTemplate} className="w-full mt-4" disabled={templateFields.length === 0}>Salvar Modelo</Button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TAB: HISTORY VIEW (WITH FILTERS) --- */}
        {activeTab === 'history' && !viewAssessment && (
            <div className="space-y-4 animate-in fade-in">
                {/* Advanced Filters */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase">
                        <Filter className="w-4 h-4" /> Filtros Avançados
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Modelo / Título</label>
                            <select className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={filterModel} onChange={e => setFilterModel(e.target.value)}>
                                <option value="">Todos</option>
                                {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Avaliador</label>
                            <select className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={filterEvaluator} onChange={e => setFilterEvaluator(e.target.value)}>
                                <option value="">Todos</option>
                                {uniqueEvaluators.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Aluno</label>
                            <select className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-sm" value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
                                <option value="">Todos</option>
                                {uniqueStudentsHistory.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Período</label>
                            <div className="flex gap-1">
                                <input type="date" className="w-1/2 p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-xs" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                                <input type="date" className="w-1/2 p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 text-xs" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    {(filterModel || filterEvaluator || filterStudent || filterStartDate || filterEndDate) && (
                        <div className="flex justify-end">
                            <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                                <X className="w-3 h-3" /> Limpar Filtros
                            </button>
                        </div>
                    )}
                </div>

                {/* Results List */}
                <div className="bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg text-xs text-slate-500 mb-2">
                    Exibindo {filteredAssessments.length} avaliações.
                </div>

                {filteredAssessments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                        <p>Nenhuma avaliação encontrada com os filtros atuais.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {filteredAssessments.map(a => (
                            <div key={a.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center hover:border-brand-300 transition-colors gap-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                        {a.studentName}
                                        <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                            {a.type === 'simple' ? 'Padrão' : 'Personalizada'}
                                        </span>
                                    </h3>
                                    <div className="text-sm text-slate-500 mt-1 space-y-1">
                                        <p className="flex items-center gap-2"><FileText className="w-3 h-3"/> {a.title}</p>
                                        <p className="flex items-center gap-2"><UserCheck className="w-3 h-3"/> Avaliador: {a.instructorName || 'Não informado'}</p>
                                        <p className="flex items-center gap-2"><Calendar className="w-3 h-3"/> {new Date(a.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button variant="outline" size="sm" onClick={() => setViewAssessment(a)} className="flex-1 md:flex-none"><Eye className="w-4 h-4 mr-2"/> Ver Detalhes</Button>
                                    <button onClick={async () => { if(confirm("Deletar permanentemente?")) { await deleteAssessment(a.id); loadData(); } }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-slate-200 dark:border-slate-700"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* --- VIEW / PRINT MODAL --- */}
        {viewAssessment && (
            <div className="fixed inset-0 bg-black/60 z-50 flex justify-center overflow-y-auto py-10 animate-in fade-in">
                <div className="bg-white w-full max-w-4xl min-h-[297mm] shadow-2xl relative p-8 md:p-16">
                    <button onClick={() => setViewAssessment(null)} className="absolute top-4 right-4 bg-slate-100 p-2 rounded-full hover:bg-slate-200 print:hidden"><X className="w-6 h-6"/></button>
                    
                    <div className="print:hidden flex justify-end mb-8">
                        <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2"/> Imprimir / PDF</Button>
                    </div>

                    <div id="printable-assessment">
                        <div className="text-center border-b-2 border-slate-800 pb-4 mb-8">
                            <h1 className="text-3xl font-bold uppercase tracking-widest">{viewAssessment.title}</h1>
                            <p className="text-slate-500">Avaliação Física & Anamnese</p>
                        </div>

                        {/* Standard Header Display */}
                        <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 border rounded">
                            <p><strong>Aluno:</strong> {viewAssessment.content.studentName}</p>
                            <p><strong>Data:</strong> {new Date(viewAssessment.createdAt).toLocaleDateString()}</p>
                            <p><strong>Idade:</strong> {viewAssessment.content.studentAge}</p>
                            <p><strong>Avaliador:</strong> {viewAssessment.content.evaluatorName}</p>
                        </div>

                        {/* Content Rendering Logic */}
                        {viewAssessment.type === 'simple' ? (
                            <div className="space-y-6 text-sm">
                                <section>
                                    <h3 className="font-bold bg-slate-200 p-1 mb-2">1. Queixa Principal</h3>
                                    <p>{viewAssessment.content.complaint}</p>
                                    {viewAssessment.content.hasPain && (
                                        <div className="ml-4 mt-2">
                                            <p><strong>Dor:</strong> Sim - {viewAssessment.content.painLocation}</p>
                                            <p><strong>Intensidade:</strong> {viewAssessment.content.painIntensity}/10</p>
                                            <p><strong>Piora:</strong> {viewAssessment.content.worsensWith} | <strong>Melhora:</strong> {viewAssessment.content.improvesWith}</p>
                                        </div>
                                    )}
                                </section>
                                
                                <section>
                                    <h3 className="font-bold bg-slate-200 p-1 mb-2">2. Histórico & Clínico</h3>
                                    <ul className="list-disc pl-5">
                                        {viewAssessment.content.historyInjuries && <li>Lesões: {viewAssessment.content.historyInjuriesDesc}</li>}
                                        {viewAssessment.content.historySurgeries && <li>Cirurgias: {viewAssessment.content.historySurgeriesDesc}</li>}
                                        {viewAssessment.content.clinicalConditions?.map((c:string) => <li key={c}>{c}</li>)}
                                        {viewAssessment.content.clinicalOther && <li>Outros: {viewAssessment.content.clinicalOther}</li>}
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="font-bold bg-slate-200 p-1 mb-2">3. Análise Física</h3>
                                    <p><strong>Postura:</strong> {viewAssessment.content.postureObs}</p>
                                    <p><strong>Mobilidade:</strong> {viewAssessment.content.mobilityFlexibility} - {viewAssessment.content.mobilityObs}</p>
                                    <p><strong>Força:</strong> {viewAssessment.content.strengthGlobal}/5 - {viewAssessment.content.strengthObs}</p>
                                </section>

                                <section>
                                    <h3 className="font-bold bg-slate-200 p-1 mb-2">4. Conclusão</h3>
                                    <p><strong>Objetivos Aluno:</strong> {viewAssessment.content.studentGoals}</p>
                                    <p><strong>Parecer Instrutor:</strong> {viewAssessment.content.instructorOpinion}</p>
                                    <p><strong>Info Adicional:</strong> {viewAssessment.content.additionalInfo}</p>
                                </section>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {viewAssessment.content.fields?.map((field: any) => (
                                    <div key={field.id} className="border-b pb-2">
                                        {field.value === 'Seção' ? (
                                            <h3 className="font-bold bg-slate-200 p-1 mt-4 mb-2">{field.label}</h3>
                                        ) : (
                                            <>
                                                <p className="font-bold text-sm text-slate-600 mb-1">{field.label}</p>
                                                <p className="text-slate-900">
                                                    {Array.isArray(field.value) ? field.value.join(', ') : field.value}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between text-xs text-slate-400">
                            <p>Gerado por Plataforma VOLL IA</p>
                            <p>Confidencial</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
