
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchPartners } from '../../services/partnerService';
import { SystemPartner, AppRoute } from '../../types';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Tag, Copy, ExternalLink, Ticket, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentPartners: React.FC = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState<SystemPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate Coupon Code based on Studio ID
  // Format: PV + first 6 chars of studio ID (uppercase)
  const couponCode = user?.studioId 
    ? `PV${user.studioId.slice(0, 6).toUpperCase()}` 
    : 'PV-STUDIO';

  useEffect(() => {
    const load = async () => {
      const data = await fetchPartners();
      setPartners(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in pb-12">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={AppRoute.STUDENT_DASHBOARD} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400"/>
        </Link>
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="text-pink-600 fill-pink-600 w-6 h-6"/> Clube de Benefícios
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Descontos exclusivos para nossos alunos.</p>
        </div>
      </div>

      {/* Coupon Card */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <Ticket size={150} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
                <h2 className="text-3xl font-bold mb-2">Seu Cupom Exclusivo</h2>
                <p className="text-pink-100 max-w-lg">
                    Apresente este código nos estabelecimentos parceiros abaixo para garantir seus descontos especiais.
                </p>
            </div>
            
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/30 flex flex-col items-center gap-2 min-w-[250px]">
                <span className="text-xs uppercase tracking-widest font-semibold text-pink-100">Código do Aluno</span>
                <div className="text-3xl font-mono font-bold tracking-wider">{couponCode}</div>
                <button 
                    onClick={handleCopyCoupon}
                    className="mt-2 text-xs bg-white text-pink-600 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-pink-50 transition-colors"
                >
                    {copied ? <><CheckCircle2 className="w-3 h-3"/> Copiado!</> : <><Copy className="w-3 h-3"/> Copiar Código</>}
                </button>
            </div>
        </div>
      </div>

      {/* Partners Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando parceiros...</div>
      ) : partners.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
           <Tag className="h-12 w-12 mx-auto text-slate-300 mb-3"/>
           <p className="text-slate-500">Nenhum parceiro cadastrado no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map(partner => (
                <div key={partner.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <div className="h-40 bg-slate-100 dark:bg-slate-800 relative">
                        {partner.imageUrl ? (
                            <img src={partner.imageUrl} alt={partner.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Tag className="w-12 h-12" />
                            </div>
                        )}
                        <div className="absolute top-3 right-3 bg-white dark:bg-slate-900 shadow-md text-pink-600 font-bold px-3 py-1 rounded-full text-sm border border-pink-100 dark:border-pink-900">
                            {partner.discountValue}
                        </div>
                    </div>
                    
                    <div className="p-6">
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">{partner.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                            {partner.description}
                        </p>
                        
                        {partner.linkUrl ? (
                            <a 
                                href={partner.linkUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-full py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group-hover:bg-pink-50 group-hover:text-pink-700 dark:group-hover:bg-pink-900/20 dark:group-hover:text-pink-300"
                            >
                                Visitar Site <ExternalLink className="w-4 h-4 ml-2" />
                            </a>
                        ) : (
                            <div className="w-full py-2.5 text-center text-sm text-slate-400 italic">
                                Visite o local
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
