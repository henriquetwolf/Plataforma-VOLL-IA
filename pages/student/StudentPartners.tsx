import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchPartners, fetchStudioPartners, createStudioPartner, updateStudioPartner, deleteStudioPartner, uploadPartnerImage } from '../../services/partnerService';
import { SystemPartner, StudioPartner, AppRoute } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, Tag, Copy, ExternalLink, Ticket, CheckCircle2, DollarSign, Plus, Trash2, X, Image as ImageIcon, Loader2, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentPartners: React.FC = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState<SystemPartner[]>([]);
  const [studioPartners, setStudioPartners] = useState<StudioPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPartner, setEditingPartner] = useState<StudioPartner | null>(null);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newCommission, setNewCommission] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);

  // Generate Coupon Code based on Studio ID
  const couponCode = user?.studioId 
    ? `PV${user.studioId.slice(0, 6).toUpperCase()}` 
    : 'PV-STUDIO';

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
        const globalData = await fetchPartners();
        setPartners(globalData);

        if (user?.studioId) {
            const localData = await fetchStudioPartners(user.studioId);
            setStudioPartners(localData);
        }
    } catch (e) {
        console.error(e);
    }
    setLoading(false);
  };

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setNewName(''); 
    setNewDesc(''); 
    setNewDiscount(''); 
    setNewLink(''); 
    setNewCommission(''); 
    setNewImage(null);
    setEditingPartner(null);
    setShowAddModal(false);
  };

  const handleEditPartner = (partner: StudioPartner) => {
    setEditingPartner(partner);
    setNewName(partner.name);
    setNewDesc(partner.description);
    setNewDiscount(partner.discountValue);
    setNewLink(partner.linkUrl || '');
    setNewCommission(partner.commission || '');
    setShowAddModal(true);
  };

  const handleAddOrUpdatePartner = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user?.id || !user.isOwner) return;
      if (!newName || !newDiscount) {
          alert("Preencha o nome e o desconto.");
          return;
      }

      setIsSubmitting(true);
      
      // Upload da imagem apenas se houver um novo arquivo
      let imageUrl = editingPartner?.imageUrl; // Mantém a antiga se não trocar
      
      if (newImage) {
          const uploaded = await uploadPartnerImage(newImage);
          if (uploaded) imageUrl = uploaded;
      }

      // Sanitizar URL
      let formattedLink = newLink.trim();
      if (formattedLink && !formattedLink.startsWith('http://') && !formattedLink.startsWith('https://')) {
          formattedLink = `https://${formattedLink}`;
      }

      let result;
      if (editingPartner) {
          // Update
          result = await updateStudioPartner(editingPartner.id, {
              name: newName,
              description: newDesc,
              discountValue: newDiscount,
              imageUrl: imageUrl, // Se newImage for null, imageUrl terá a URL antiga ou a nova
              linkUrl: formattedLink,
              commission: newCommission
          });
      } else {
          // Create
          result = await createStudioPartner(user.id, newName, newDesc, newDiscount, imageUrl, formattedLink, newCommission);
      }
      
      if (result.success) {
          alert(editingPartner ? "Parceiro atualizado!" : "Parceiro exclusivo criado!");
          resetForm();
          loadData();
      } else {
          alert("Erro: " + result.error);
      }
      setIsSubmitting(false);
  };

  const handleDeletePartner = async (id: string) => {
      if (!confirm("Excluir este parceiro exclusivo?")) return;
      await deleteStudioPartner(id);
      loadData();
  };

  // Determine back link based on role
  const backLink = user?.isStudent ? AppRoute.STUDENT_DASHBOARD : 
                   user?.isInstructor ? AppRoute.INSTRUCTOR_DASHBOARD : 
                   AppRoute.DASHBOARD;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in pb-12">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <Link to={backLink} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400"/>
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="text-pink-600 fill-pink-600 w-6 h-6"/> Clube de Benefícios
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Descontos exclusivos para nossos alunos.</p>
            </div>
        </div>
        {user?.isOwner && (
            <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Novo Parceiro Exclusivo
            </Button>
        )}
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

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando parceiros...</div>
      ) : (
        <div className="space-y-12">
            
            {/* SEÇÃO 1: PARCEIROS EXCLUSIVOS (Se houver ou for dono) */}
            {(studioPartners.length > 0 || user?.isOwner) && (
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-brand-600" /> Parceiros Exclusivos do Studio
                    </h2>
                    
                    {studioPartners.length === 0 ? (
                        <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-500">
                            Nenhum parceiro exclusivo cadastrado ainda.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {studioPartners.map(partner => (
                                <div key={partner.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-200 dark:border-brand-900 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative">
                                    {user?.isOwner && (
                                        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditPartner(partner)} className="bg-white/90 p-2 rounded-full text-brand-600 hover:bg-brand-50 shadow-sm border border-slate-100">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeletePartner(partner.id)} className="bg-white/90 p-2 rounded-full text-red-500 hover:bg-red-50 shadow-sm border border-slate-100">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="h-40 bg-slate-100 dark:bg-slate-800 relative">
                                        {partner.imageUrl ? (
                                            <img src={partner.imageUrl} alt={partner.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Tag className="w-12 h-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 bg-brand-600 text-white font-bold px-3 py-1 rounded-full text-sm shadow-md">
                                            {partner.discountValue}
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">{partner.name}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                                            {partner.description}
                                        </p>
                                        
                                        {user?.isOwner && partner.commission && (
                                            <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-800">
                                                    <DollarSign className="w-3 h-3" /> Sua Comissão: {partner.commission}
                                                </span>
                                            </div>
                                        )}

                                        {partner.linkUrl ? (
                                            <a href={partner.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full py-2.5 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 text-sm font-medium hover:bg-brand-100 transition-colors">
                                                Visitar Site <ExternalLink className="w-4 h-4 ml-2" />
                                            </a>
                                        ) : (
                                            <div className="w-full py-2.5 text-center text-sm text-slate-400 italic">Visite o local</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SEÇÃO 2: PARCEIROS GLOBAIS */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-pink-600" /> Clube VOLL (Nacional)
                </h2>
                
                {partners.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Tag className="h-12 w-12 mx-auto text-slate-300 mb-3"/>
                        <p>Nenhum parceiro VOLL no momento.</p>
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
                                    
                                    {user?.isOwner && partner.commission && (
                                        <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-800">
                                                <DollarSign className="w-3 h-3" /> Comissão para o Studio: {partner.commission}
                                            </span>
                                        </div>
                                    )}

                                    {partner.linkUrl ? (
                                        <a href={partner.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group-hover:bg-pink-50 group-hover:text-pink-700 dark:group-hover:bg-pink-900/20 dark:group-hover:text-pink-300">
                                            Visitar Site <ExternalLink className="w-4 h-4 ml-2" />
                                        </a>
                                    ) : (
                                        <div className="w-full py-2.5 text-center text-sm text-slate-400 italic">Visite o local</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* ADD/EDIT PARTNER MODAL */}
      {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          {editingPartner ? 'Editar Parceiro Exclusivo' : 'Cadastrar Parceiro Exclusivo'}
                      </h3>
                      <button onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <form onSubmit={handleAddOrUpdatePartner} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Parceiro *</label>
                          <Input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Ex: Restaurante Saudável" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Desconto *</label>
                              <Input value={newDiscount} onChange={e => setNewDiscount(e.target.value)} required placeholder="Ex: 15% OFF" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sua Comissão</label>
                              <Input value={newCommission} onChange={e => setNewCommission(e.target.value)} placeholder="Opcional (Visível só pra você)" />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                          <textarea 
                              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none"
                              rows={3}
                              value={newDesc}
                              onChange={e => setNewDesc(e.target.value)}
                              placeholder="Detalhes da parceria..."
                          />
                      </div>

                      <Input label="Link (Site/Instagram)" value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://..." />

                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Imagem / Logo</label>
                          <div className="flex items-center gap-4">
                              <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center w-full">
                                  {newImage ? (
                                      <span className="text-green-600 font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Imagem Selecionada</span>
                                  ) : editingPartner?.imageUrl ? (
                                      <div className="flex flex-col items-center">
                                          <img src={editingPartner.imageUrl} className="h-16 w-auto object-contain mb-2" alt="Atual"/>
                                          <span className="text-xs text-slate-500">Clique para alterar</span>
                                      </div>
                                  ) : (
                                      <span className="text-slate-500 flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Clique para upload</span>
                                  )}
                                  <input type="file" accept="image/*" className="hidden" onChange={e => setNewImage(e.target.files?.[0] || null)} />
                              </label>
                          </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                          <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                          <Button type="submit" isLoading={isSubmitting}>
                              {editingPartner ? 'Salvar Alterações' : 'Cadastrar'}
                          </Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};