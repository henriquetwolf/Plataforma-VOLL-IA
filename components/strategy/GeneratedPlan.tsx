
import React, { useEffect, useState } from 'react';
import { StrategicPlan } from '../../types';
import { Button } from '../ui/Button';
import { Save, Download, FileText, CheckCircle, Building2 } from 'lucide-react';
import { fetchProfile } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Props {
  planData: StrategicPlan;
  report: string;
  onStartOver: () => void;
  onSave: () => void;
  isSaved: boolean;
}

export const GeneratedPlan: React.FC<Props> = ({ planData, report, onStartOver, onSave, isSaved }) => {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
        fetchProfile(user.id).then(p => {
            if (p?.logoUrl) setLogoUrl(p.logoUrl);
        });
    }
  }, [user]);

  const downloadPDF = async () => {
    const element = document.getElementById('strategic-report-content');
    if (!element) return;

    try {
      // Force white background for capture
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = "#ffffff";

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      element.style.backgroundColor = originalBg;

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

      pdf.save(`Plano_Estrategico_${planData.studioName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Error:', error);
      alert('Erro ao gerar PDF.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 text-green-600 rounded-full">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">Plano Gerado com Sucesso!</h2>
            <p className="text-sm text-slate-500">Seu consultor IA finalizou a análise.</p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={onStartOver} className="flex-1 md:flex-none">
            Novo Plano
          </Button>
          <Button 
            variant={isSaved ? "secondary" : "primary"} 
            onClick={onSave} 
            disabled={isSaved}
            className="flex-1 md:flex-none"
          >
            {isSaved ? <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-2"/> Salvo</span> : <span className="flex items-center"><Save className="h-4 w-4 mr-2"/> Salvar</span>}
          </Button>
          <Button onClick={downloadPDF} className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-900 text-white">
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Report Preview Container (Gray Background) */}
      <div className="bg-slate-100 dark:bg-slate-950 p-4 md:p-8 rounded-xl overflow-hidden shadow-inner flex justify-center">
        
        {/* Actual Report Sheet (A4 Simulation) */}
        <div 
          id="strategic-report-content" 
          className="bg-white text-slate-800 w-full max-w-[210mm] p-10 md:p-12 shadow-2xl min-h-[297mm] flex flex-col relative"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-4 border-brand-500 pb-6 mb-8">
            <div className="flex flex-col gap-2">
               <div className="flex items-center gap-3 text-brand-600 mb-1">
                  <FileText className="w-6 h-6" />
                  <span className="text-sm font-bold uppercase tracking-wider">Relatório de Planejamento</span>
               </div>
               <h1 className="text-4xl font-extrabold text-slate-900 leading-tight">Plano Estratégico <br/> {planData.planningYear}</h1>
               <h2 className="text-xl text-slate-500 font-medium">{planData.studioName}</h2>
            </div>
            
            <div className="flex flex-col items-end">
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-20 w-20 object-contain mb-2" />
                ) : (
                    <div className="h-20 w-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 mb-2">
                        <Building2 className="w-8 h-8" />
                    </div>
                )}
                <span className="text-xs text-slate-400">Gerado em: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* AI Content */}
          <div 
            className="flex-1 prose prose-slate max-w-none 
            prose-h2:text-2xl prose-h2:font-bold prose-h2:text-brand-600 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-lg prose-h3:font-semibold prose-h3:text-slate-700 prose-h3:mt-6
            prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-justify
            prose-li:text-slate-600 prose-li:marker:text-brand-500 prose-li:mb-1
            prose-strong:text-slate-800"
            dangerouslySetInnerHTML={{ __html: report }} 
          />

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center text-slate-400 text-xs">
            <p>Plataforma VOLL IA - Gestão Inteligente de Studios</p>
            <p>Página 1</p>
          </div>
        </div>
      </div>
    </div>
  );
};
