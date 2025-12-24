import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Search, Upload, Calendar, ChevronRight, Filter, Clock, CheckCircle2, RotateCcw, ArrowUpRight, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, CalendarDays } from 'lucide-react';
import { Lead, CsvRow, LeadStatus } from './types';
import { AppleCard } from './components/AppleCard';
import { LeadModal } from './components/LeadModal';

// Brand Palette
// Dark Blue: #0F3443
// Orange: #FF842B
// Teal: #2C7A99
// Light: #F4F6F9

type SortDirection = 'asc' | 'desc';
interface SortConfig {
  key: keyof Lead | 'daysSinceLastContact' | 'daysUntilNextContact';
  direction: SortDirection;
}

function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('Pendentes');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  useEffect(() => {
    const storedLeads = localStorage.getItem('pescaronha_leads');
    if (storedLeads) {
      try {
        setLeads(JSON.parse(storedLeads));
      } catch (e) {
        console.error("Error parsing local storage", e);
      }
    }
  }, []);

  // Helper: Days passed SINCE a date (for Last Contact)
  const calculateDaysSince = (dateString: string): number => {
    if (!dateString) return -1;
    const parts = dateString.split('/');
    if (parts.length !== 3) return -1;
    const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (isNaN(date.getTime())) return -1;
    const today = new Date();
    today.setHours(0,0,0,0);
    date.setHours(0,0,0,0);
    const diffTime = Math.abs(today.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  // Helper: Days UNTIL a date (for Next Contact)
  // Returns: negative number (overdue), 0 (today), positive (future), or null (no date)
  const calculateDaysUntil = (dateString: string): number | null => {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    const targetDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (isNaN(targetDate.getTime())) return null;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    targetDate.setHours(0,0,0,0);
    
    // Difference in time
    const diffTime = targetDate.getTime() - today.getTime();
    // Difference in days
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const formattedLeads: Lead[] = results.data.map((row) => {
          const notes = row['Observações (resumo, objeções)'] || row['Observações'] || '';
          const lastContact = row['Data do último contato'] || '';
          const nextContact = row['Data do próximo contato'] || '';
          
          return {
            id: crypto.randomUUID(),
            name: row['Nome'] || 'Sem Nome',
            phone: row['Telefone'] || '',
            status: row['Status'] || 'Frio',
            products: row['Produtos de interesse'] || '',
            lastContact: lastContact,
            nextContact: nextContact,
            purchaseForecast: row['Previsão de Compra'] || '',
            fupType: row['Tipo de FUP atual'] || '',
            notes: notes,
            daysSinceLastContact: calculateDaysSince(lastContact),
            daysUntilNextContact: calculateDaysUntil(nextContact)
          };
        });

        setLeads(formattedLeads);
        localStorage.setItem('pescaronha_leads', JSON.stringify(formattedLeads));
      },
    });
  };

  const handleSort = (key: keyof Lead | 'daysSinceLastContact' | 'daysUntilNextContact') => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const stats = useMemo(() => {
    let overdueCount = 0;
    let todayCount = 0;

    leads.forEach(l => {
        // Only count active tasks for the dashboard alerts
        if (!l.fupType.toLowerCase().includes('finalizado') && l.daysUntilNextContact !== null) {
            if (l.daysUntilNextContact < 0) overdueCount++;
            if (l.daysUntilNextContact === 0) todayCount++;
        }
    });

    return {
      hot: leads.filter(l => l.status.includes(LeadStatus.HOT)).length,
      clients: leads.filter(l => l.status.includes(LeadStatus.CLIENT)).length,
      pending: leads.filter(l => {
         const isFinalized = l.fupType.toLowerCase().includes('finalizado');
         return !isFinalized;
      }).length,
      overdue: overdueCount,
      today: todayCount
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    // 1. Filter
    let result = leads.filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            lead.products.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      const isFinalized = lead.fupType.toLowerCase().includes('finalizado');
      const isClient = lead.status.includes(LeadStatus.CLIENT);
      const isHot = lead.status.includes(LeadStatus.HOT);

      switch (activeFilter) {
        case 'Pendentes': return !isFinalized;
        case 'Clientes': return isClient;
        case 'Quentes Finalizados': return isHot && isFinalized;
        case 'Clientes Finalizados': return isClient && isFinalized;
        default: return true;
      }
    });

    // 2. Sort
    if (sortConfig) {
      result.sort((a, b) => {
        // Handle nulls in sorting
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal > bVal ? 1 : -1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    } else {
       // Default Sorting Logic
       if (activeFilter.includes('Finalizados')) {
          result.sort((a, b) => b.daysSinceLastContact - a.daysSinceLastContact);
       } else {
          // For Active tabs, prioritize Overdue > Today > Future
          result.sort((a, b) => {
             const valA = a.daysUntilNextContact !== null ? a.daysUntilNextContact : 9999;
             const valB = b.daysUntilNextContact !== null ? b.daysUntilNextContact : 9999;
             return valA - valB;
          });
       }
    }

    return result;
  }, [leads, activeFilter, searchTerm, sortConfig]);

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const tabs = [
    { id: 'Pendentes', label: 'Em Andamento', icon: Clock },
    { id: 'Clientes', label: 'Clientes', icon: CheckCircle2 },
    { id: 'Quentes Finalizados', label: 'Reaquecer', icon: RotateCcw },
    { id: 'Clientes Finalizados', label: 'Histórico', icon: Calendar },
  ];

  const SortIcon = ({ colKey }: { colKey: keyof Lead | 'daysSinceLastContact' | 'daysUntilNextContact' }) => {
    if (sortConfig?.key !== colKey) return <ArrowUpDown size={10} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />;
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#0F3443] selection:bg-[#FF842B]/20 selection:text-[#0F3443] overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#2C7A99]/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FF842B]/5 blur-[100px] rounded-full pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="relative z-40 w-full px-6 py-8 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center leading-none">
              <span className="text-3xl font-black tracking-tighter text-[#0F3443] uppercase">PESCA</span>
              <span className="text-3xl font-black tracking-tighter text-[#FF842B] uppercase">RONHA</span>
            </div>
            <div className="h-1.5 w-full bg-[#0F3443] rounded-full mt-1 relative overflow-hidden">
               <div className="absolute top-0 right-0 h-full w-1/2 bg-[#2C7A99]"></div>
            </div>
          </div>
        </div>
        <div>
          <input type="file" id="csvFile" accept=".csv" className="hidden" onChange={handleFileUpload} />
          <label 
            htmlFor="csvFile" 
            className="group flex items-center gap-3 bg-[#0F3443] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#154255] transition-all cursor-pointer shadow-lg shadow-[#0F3443]/20"
          >
            <span>Upload CSV</span>
            <Upload size={14} className="group-hover:-translate-y-1 transition-transform" />
          </label>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mb-20">
        
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
          
          {/* Hero Card - Hot Leads */}
          <AppleCard className="md:col-span-6 p-8 relative overflow-hidden flex flex-col justify-between min-h-[240px] border-none bg-gradient-to-br from-[#FF842B] to-[#E06000] shadow-xl shadow-[#FF842B]/20">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 z-0 mix-blend-overlay"></div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase text-white tracking-widest border border-white/20">
                Oportunidades
              </div>
              <ArrowUpRight className="text-white/50" />
            </div>

            <div className="relative z-10 mt-auto text-white">
              <h2 className="text-7xl font-black tracking-tighter mb-2">{stats.hot}</h2>
              <p className="text-sm font-bold uppercase tracking-widest opacity-90">Leads Quentes</p>
              <p className="text-xs opacity-70 mt-2 max-w-xs">Foco Total: Contatos com alta probabilidade de fechamento.</p>
            </div>
          </AppleCard>

          {/* Secondary Stats */}
          <div className="md:col-span-3 flex flex-col gap-6">
            <AppleCard className="flex-1 p-6 flex flex-col justify-center items-center text-center group bg-white">
              <div className="w-12 h-12 rounded-full bg-[#2C7A99]/10 flex items-center justify-center text-[#2C7A99] mb-4 group-hover:scale-110 transition-transform">
                <Clock size={24} />
              </div>
              <h2 className="text-4xl font-bold text-[#0F3443] mb-1">{stats.pending}</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Em FUP</p>
            </AppleCard>
            
            <AppleCard className="flex-1 p-6 flex flex-col justify-center items-center text-center group bg-white">
               <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
              </div>
              <h2 className="text-4xl font-bold text-[#0F3443] mb-1">{stats.clients}</h2>
               <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Clientes</p>
            </AppleCard>
          </div>

          {/* Updated Action/Info Panel - AGENDA DO DIA */}
           <AppleCard className="md:col-span-3 p-8 flex flex-col justify-between bg-[#0F3443] text-white">
             <div>
                <h3 className="text-xl font-bold uppercase leading-tight mb-4 flex items-center gap-2">
                  <CalendarDays size={20} className="text-[#FF842B]" />
                  Agenda
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between border border-white/5">
                    <span className="text-xs font-bold uppercase text-gray-400">Para Hoje</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-[#FF842B]">{stats.today}</span>
                    </div>
                  </div>

                  <div className="bg-red-500/10 rounded-xl p-3 flex items-center justify-between border border-red-500/20">
                    <span className="text-xs font-bold uppercase text-red-300">Atrasados</span>
                    <div className="flex items-center gap-2">
                      {stats.overdue > 0 && <AlertTriangle size={14} className="text-red-400" />}
                      <span className="text-xl font-black text-white">{stats.overdue}</span>
                    </div>
                  </div>
                </div>
             </div>
             
             <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[10px] text-gray-400 text-center">
                  Mantenha o FUP em dia!
                </p>
             </div>
           </AppleCard>
        </div>

        {/* Filters & Search */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="BUSCAR..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-80 pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-full text-xs font-bold uppercase tracking-wide text-[#0F3443] focus:border-[#FF842B] focus:outline-none transition-colors shadow-sm"
            />
          </div>
          
          <div className="flex overflow-x-auto gap-2 no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${
                    isActive 
                      ? 'bg-[#0F3443] text-white border-[#0F3443] shadow-md' 
                      : 'bg-white text-gray-500 border-gray-200 hover:border-[#FF842B] hover:text-[#FF842B]'
                  }`}
                >
                  <Icon size={12} className={isActive ? 'text-[#FF842B]' : ''} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lead List */}
        <div className="space-y-2">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 select-none">
             <div 
                className="col-span-4 md:col-span-3 flex items-center gap-2 cursor-pointer hover:text-[#0F3443] transition-colors"
                onClick={() => handleSort('name')}
             >
                Nome / FUP <SortIcon colKey="name" />
             </div>
             <div 
                className="col-span-4 md:col-span-3 flex items-center gap-2 cursor-pointer hover:text-[#0F3443] transition-colors"
                onClick={() => handleSort('status')}
             >
                Status <SortIcon colKey="status" />
             </div>
             <div 
                className="hidden md:flex md:col-span-3 items-center gap-2 cursor-pointer hover:text-[#0F3443] transition-colors"
                onClick={() => handleSort('products')}
             >
               Interesse <SortIcon colKey="products" />
             </div>
             <div 
                className="col-span-4 md:col-span-3 flex items-center justify-end gap-2 cursor-pointer hover:text-[#0F3443] transition-colors"
                onClick={() => handleSort(activeFilter.includes('Finalizados') ? 'daysSinceLastContact' : 'daysUntilNextContact')}
             >
                {activeFilter.includes('Finalizados') ? 'Último Contato' : 'Próx. Contato'} 
                <SortIcon colKey={activeFilter.includes('Finalizados') ? 'daysSinceLastContact' : 'daysUntilNextContact'} />
             </div>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="py-20 text-center border-t border-gray-200">
              <Filter size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-400 text-sm uppercase tracking-widest">Nenhum resultado</p>
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div 
                key={lead.id} 
                onClick={() => openLead(lead)}
                className="group grid grid-cols-12 gap-4 px-6 py-5 items-center bg-white border border-gray-100 rounded-2xl hover:border-[#FF842B]/50 hover:shadow-lg hover:shadow-[#FF842B]/10 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="col-span-4 md:col-span-3 relative z-10">
                  <div className="font-bold text-sm text-[#0F3443]">{lead.name}</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1 rounded">{lead.fupType}</span>
                    
                    {/* Badge: Finalized Tabs (Reaquecer / Histórico) */}
                    {activeFilter.includes('Finalizados') && lead.daysSinceLastContact >= 0 && (
                       <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                         lead.daysSinceLastContact > 30 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-[#E06000]'
                       }`}>
                         <RotateCcw size={8} /> +{lead.daysSinceLastContact}d
                       </span>
                    )}

                    {/* Badge: Active Tabs (Pendentes / Clientes) */}
                    {['Pendentes', 'Clientes'].includes(activeFilter) && lead.daysUntilNextContact !== null && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          lead.daysUntilNextContact < 0 
                            ? 'bg-red-100 text-red-600' // Overdue
                            : lead.daysUntilNextContact === 0 
                              ? 'bg-yellow-100 text-yellow-700' // Today
                              : 'bg-green-100 text-green-700' // Future
                        }`}>
                          {lead.daysUntilNextContact < 0 ? (
                            <>
                              <AlertTriangle size={8} /> Atrasado
                            </>
                          ) : lead.daysUntilNextContact === 0 ? (
                            'Hoje'
                          ) : (
                            `Faltam ${lead.daysUntilNextContact} dias`
                          )}
                        </span>
                    )}

                  </div>
                </div>

                <div className="col-span-4 md:col-span-3 relative z-10">
                   <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      lead.status.includes(LeadStatus.HOT) 
                        ? 'bg-[#FF842B]/10 text-[#E06000] border-[#FF842B]/20' 
                        : lead.status.includes(LeadStatus.CLIENT) 
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {lead.status}
                    </span>
                </div>

                <div className="hidden md:block md:col-span-3 text-xs text-gray-500 truncate relative z-10">
                  {lead.products}
                </div>

                <div className="col-span-4 md:col-span-3 text-right relative z-10 flex items-center justify-end gap-3">
                   <span className="text-xs font-mono text-gray-500">
                      {activeFilter.includes('Finalizados') ? (lead.lastContact || '-') : (lead.nextContact || '—')}
                   </span>
                   <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#0F3443] group-hover:text-white transition-colors">
                      <ChevronRight size={14} />
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Detail Modal */}
      <LeadModal 
        lead={selectedLead} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

export default App;