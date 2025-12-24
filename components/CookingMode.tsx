
import React, { useState, useEffect } from 'react';
import { Recipe, Ingredient } from '../types';

interface CookingModeProps {
  recipe: Recipe;
  onExit: () => void;
  addToShoppingList: (item: Ingredient) => void;
}

export const CookingMode: React.FC<CookingModeProps> = ({ recipe, onExit, addToShoppingList }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleNext = () => {
    if (currentStep < recipe.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  useEffect(() => {
    speak(`Step ${currentStep + 1}: ${recipe.steps[currentStep]}`);
  }, [currentStep]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col text-white animate-in fade-in duration-500 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-white rounded-full blur-[160px] animate-pulse"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-slate-500 rounded-full blur-[160px] animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 px-8 py-6 flex items-center justify-between border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <button 
            onClick={onExit} 
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 active:scale-90"
          >
            <i className="fas fa-times"></i>
          </button>
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase">{recipe.title}</h2>
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kitchen Mode Active</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex px-6 py-2.5 rounded-full bg-white/10 border border-white/10 items-center gap-3">
             <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Step</span>
             <span className="font-black text-white">{currentStep + 1} / {recipe.steps.length}</span>
          </div>
          <button 
            onClick={() => speak(recipe.steps[currentStep])}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isSpeaking ? 'bg-white text-black' : 'bg-white/10 border border-white/10'}`}
          >
            <i className={`fas ${isSpeaking ? 'fa-stop' : 'fa-volume-high'}`}></i>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Instruction Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-10 md:p-24 text-center">
          <div className="max-w-4xl w-full">
            <p className="text-white text-4xl md:text-7xl font-black leading-tight tracking-tight mb-16 animate-in slide-in-from-bottom-4 duration-500">
              {recipe.steps[currentStep]}
            </p>
            
            <div className="flex items-center justify-center gap-6">
              <button 
                disabled={currentStep === 0}
                onClick={handlePrev}
                className="w-20 h-20 rounded-[2rem] bg-white/5 text-white border border-white/10 disabled:opacity-10 hover:bg-white/10 transition-all flex items-center justify-center active:scale-95"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              
              <button 
                onClick={currentStep === recipe.steps.length - 1 ? onExit : handleNext}
                className={`h-20 px-12 rounded-[2rem] font-black text-lg transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95 bg-white text-black hover:bg-slate-200`}
              >
                {currentStep === recipe.steps.length - 1 ? 'Finish Dish' : 'Next Step'}
                <i className={`fas ${currentStep === recipe.steps.length - 1 ? 'fa-check' : 'fa-arrow-right'} text-sm`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* Ingredients Sidepane */}
        <div className="w-full md:w-[400px] bg-white/5 backdrop-blur-3xl border-l border-white/10 p-10 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-white font-black text-xl flex items-center gap-3 uppercase tracking-tight">
              Mise en Place
            </h3>
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{recipe.ingredients.length} items</span>
          </div>

          <div className="space-y-4">
            {recipe.ingredients.map((ing, idx) => (
              <div key={idx} className={`group p-6 rounded-3xl flex items-center justify-between transition-all duration-300 ${ing.isMissing ? 'bg-white/20' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ing.isMissing ? 'bg-white text-black' : 'bg-white/10'}`}>
                    <i className={`fas ${ing.isMissing ? 'fa-cart-shopping' : 'fa-check'}`}></i>
                  </div>
                  <div>
                    <p className="text-white font-black text-sm uppercase tracking-tight">{ing.name}</p>
                    <p className="text-xs text-white/40 font-bold mt-0.5">{ing.amount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Track */}
      <div className="h-1 bg-white/10 w-full">
        <div 
          className="h-full bg-white transition-all duration-1000 ease-in-out"
          style={{ width: `${((currentStep + 1) / recipe.steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
};
