import React from 'react';
import { X, MessageCircle, Package, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface LeadModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({ lead, isOpen, onClose }) => {
  if (!isOpen || !lead) return null;

  const isClient = lead.status.includes(LeadStatus.CLIENT);
  const cleanPhone = lead.phone.replace(/\D/g, '');
  
  const timelineItems = [
    { title: 'Último Contato', date: lead.lastContact, active: true },
    { title: 'Status FUP', desc: lead.fupType, active: true },
    { title: 'Próximo Passo', date: lead.nextContact, active: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0F3443]/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header - Brand Colors */}
        <div className="p-8 border-b border-gray-100 relative overflow-hidden bg-[#F4F6F9]">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 ${
                isClient 
                ? 'bg-green-100 text-green-700' 
                : 'bg-[#FF842B]/10 text-[#FF842B]'
              }`}>
                {lead.status}
              </span>
              <h2 className="text-3xl font-black text-[#0F3443] uppercase tracking-tight leading-none mb-1">
                {lead.name}
              </h2>
              <p className="text-gray-500 text-sm font-medium flex items-center gap-2 mt-2">
                <MessageCircle size={14} /> {lead.phone}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-white hover:bg-gray-100 rounded-full text-gray-500 shadow-sm transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 overflow-y-auto no-scrollbar space-y-8">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Package size={12} /> Interesse
                </div>
                <div className="font-bold text-[#0F3443] text-lg leading-tight">{lead.products || '—'}</div>
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                  <DollarSign size={12} /> Previsão
                </div>
                <div className="font-bold text-[#0F3443] text-lg leading-tight">{lead.purchaseForecast || '—'}</div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Timeline */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Clock size={14} className="text-[#2C7A99]" /> Linha do Tempo
              </h3>
              <div className="space-y-6 border-l border-gray-200 pl-6 ml-2">
                {timelineItems.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className={`absolute -left-[29px] top-1.5 w-3 h-3 rounded-full border-2 ${
                      item.active ? 'bg-[#2C7A99] border-white ring-2 ring-gray-100' : 'bg-gray-300 border-white'
                    }`}></div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{item.title}</p>
                    <p className="text-sm text-gray-700 font-medium mt-1">{item.date || item.desc || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes/Objections */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <AlertCircle size={14} className="text-[#FF842B]" /> Objeções
              </h3>
              <div className="bg-[#FFF4EC] p-5 rounded-2xl border border-[#FFE0CC] text-sm text-[#8A4B20] leading-relaxed">
                {lead.notes ? `"${lead.notes}"` : <span className="text-gray-400 italic">Sem observações.</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <a 
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold uppercase tracking-wide py-4 rounded-xl shadow-lg shadow-green-500/20 transition-all"
          >
            <MessageCircle size={20} />
            <span>Iniciar no WhatsApp</span>
            <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      </div>
    </div>
  );
};