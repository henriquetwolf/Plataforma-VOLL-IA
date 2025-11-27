import React from 'react';
import { StrategicPlan } from '../../types';
import { Button } from '../ui/Button';
import { ArrowLeft, Save, Download, FileText, CheckCircle } from 'lucide-react';
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
  const downloadPDF = async () => {
    const element = document.getElementById('strategic-report-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
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
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 text-green-600 rounded-full">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Plano Gerado com Sucesso!</h2>
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

      <div className="bg-slate-200 p-4 md:p-8 rounded-xl overflow-hidden shadow-inner">
        <div 
          id="strategic-report-content" 
          className="bg-white max-w-4xl mx-auto p-8 md:p-12 shadow-2xl min-h-[1000px]"
        >
          {/* Cabeçalho do Relatório */}
          <div className="border-b-4 border-brand-500 pb-6 mb-8">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Plano Estratégico</h1>
                <h2 className="text-2xl text-brand-600 font-medium">{planData.studioName}</h2>
              </div>
              <div className="text-right">
                <p className="text-slate-400 font-medium">{planData.planningYear}</p>
                <div className="flex items-center gap-2 text-brand-600 text-sm mt-1">
                  <FileText className="h-4 w-4" />
                  <span>Gerado por Plataforma VOLL IA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo IA */}
          <div 
            className="prose prose-slate max-w-none prose-headings:text-brand-800 prose-h2:text-2xl prose-h2:mt-8 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-ul:list-disc prose-li:marker:text-brand-500"
            dangerouslySetInnerHTML={{ __html: report }} 
          />

          {/* Rodapé do Relatório */}
          <div className="mt-16 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm">
            <p>&copy; {new Date().getFullYear()} Plataforma VOLL IA - Gestão Inteligente de Studios</p>
          </div>
        </div>
      </div>
    </div>
  );
};