
import React, { useState } from 'react';

interface SidebarProps {
  servings: number;
  setServings: (count: number) => void;
  ageGroup: string;
  setAgeGroup: (age: 'Adults' | 'Children' | 'Mixed') => void;
  allergies: string[];
  setAllergies: (allergies: string[]) => void;
  onNavigate: (view: any) => void;
  currentView: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  servings, setServings, 
  ageGroup, setAgeGroup, 
  allergies, setAllergies,
  onNavigate, currentView 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [allergyInput, setAllergyInput] = useState('');

  const addAllergy = (e: React.FormEvent) => {
    e.preventDefault();
    if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
      setAllergies([...allergies, allergyInput.trim()]);
      setAllergyInput('');
    }
  };

  const removeAllergy = (a: string) => {
    setAllergies(allergies.filter(item => item !== a));
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-slate-100 h-screen sticky top-0 flex flex-col transition-all duration-500 ease-in-out hidden md:flex z-[100] shadow-sm`}>
      {/* Collapser Button - Refined Design */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-24 bg-white border border-slate-200 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-black shadow-lg z-[110] transition-all hover:scale-110"
      >
        <i className={`fas fa-chevron-${isCollapsed ? 'right' : 'left'} text-[10px]`}></i>
      </button>

      {/* Brand Section */}
      <div className={`p-8 flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'} mb-6 cursor-pointer group`} onClick={() => onNavigate('home')}>
        <div className="min-w-[44px] h-11 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl transition-transform group-hover:rotate-6">
          <i className="fas fa-utensils text-lg"></i>
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">HealBites</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">AI Kitchen Assistant</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-1.5 px-4 mb-10">
        {[
          { id: 'home', icon: 'fa-house', label: 'Dashboard' },
          { id: 'scan', icon: 'fa-camera-viewfinder', label: 'Scan Fridge', altIcon: 'fa-camera' },
          { id: 'shopping-list', icon: 'fa-cart-shopping', label: 'Smart Cart', altIcon: 'fa-shopping-basket' },
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'} px-4 py-3.5 rounded-2xl transition-all duration-300 group ${currentView === item.id ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            title={item.label}
          >
            <i className={`fas ${item.altIcon || item.icon} ${isCollapsed ? 'text-lg' : 'text-sm'} ${currentView === item.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}></i>
            {!isCollapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Settings Footer */}
      <div className="mt-auto p-4 border-t border-slate-50">
        <div className={`bg-slate-50 rounded-[2rem] ${isCollapsed ? 'p-2' : 'p-5'} border border-slate-100 flex flex-col gap-4 items-center relative transition-all`}>
          <div className={`flex flex-col items-center ${isCollapsed ? '' : 'w-full text-center'}`}>
             <span className="text-3xl font-black text-slate-900 leading-none">{servings}</span>
             {!isCollapsed && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Servings</p>}
          </div>
          
          <button 
            onClick={() => setShowPopup(!showPopup)}
            className={`flex items-center justify-center gap-2 rounded-[1.25rem] transition-all duration-300 active:scale-95 ${isCollapsed ? 'w-12 h-12 bg-white text-black shadow-sm' : 'w-full py-3 bg-white text-slate-900 shadow-sm border border-slate-200 text-xs font-black uppercase tracking-widest'}`}
          >
            <i className="fas fa-sliders text-xs"></i>
            {!isCollapsed && <span>Preferences</span>}
          </button>

          {/* PORTION & DIETARY POPUP CARD */}
          {showPopup && (
            <div className={`absolute bottom-2 left-0 ${isCollapsed ? 'left-16' : 'w-[320px] left-0'} glass shadow-2xl rounded-[2.5rem] p-7 z-[200] animate-in fade-in slide-in-from-bottom-4 transition-all duration-300 border border-slate-200`}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">Meal Preferences</h4>
                  <p className="text-[10px] text-slate-500 font-medium">AI will adapt recipes based on these rules</p>
                </div>
                <button onClick={() => setShowPopup(false)} className="text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Servings Counter */}
              <div className="mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 tracking-widest">Portion Size</label>
                <div className="flex items-center justify-between bg-white/50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                  <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-black hover:shadow-md transition-all active:scale-90"><i className="fas fa-minus text-xs"></i></button>
                  <div className="text-center">
                    <span className="text-2xl font-black text-slate-900">{servings}</span>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Guests</p>
                  </div>
                  <button onClick={() => setServings(Math.min(20, servings + 1))} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-black hover:shadow-md transition-all active:scale-90"><i className="fas fa-plus text-xs"></i></button>
                </div>
              </div>

              {/* Age Group */}
              <div className="mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 tracking-widest">Target Age Group</label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100/50 p-1.5 rounded-2xl">
                  {['Adults', 'Children', 'Mixed'].map(group => (
                    <button 
                      key={group}
                      onClick={() => setAgeGroup(group as any)}
                      className={`py-2.5 text-[10px] font-black rounded-[1.1rem] transition-all duration-300 ${ageGroup === group ? 'bg-white shadow-md text-black scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'}`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allergies */}
              <div className="mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 tracking-widest">Allergies & Bans</label>
                <form onSubmit={addAllergy} className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    placeholder="Add ingredient..."
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all placeholder:text-slate-300 font-medium"
                  />
                  <button type="submit" className="w-11 h-11 bg-black text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90"><i className="fas fa-plus"></i></button>
                </form>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {allergies.length === 0 && (
                    <div className="w-full text-center py-4 text-slate-300 text-[10px] font-medium italic">
                      <i className="fas fa-leaf mr-2"></i>No restrictions added
                    </div>
                  )}
                  {allergies.map(a => (
                    <span key={a} className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-slate-50 text-slate-900 text-[10px] font-black rounded-xl border border-slate-200 animate-in zoom-in-95">
                      {a.toUpperCase()}
                      <button onClick={() => removeAllergy(a)} className="w-5 h-5 rounded-lg hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <i className="fas fa-times opacity-60"></i>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
