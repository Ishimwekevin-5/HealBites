
import React, { useState, useEffect } from 'react';
import { Recipe, ShoppingListItem } from '../types';
import { generateRecipeImage } from '../services/geminiService';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  onAddAllMissing: (items: ShoppingListItem[]) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onSelect, onAddAllMissing }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      setIsGenerating(true);
      setError(false);
      try {
        const url = await generateRecipeImage(recipe.imagePrompt);
        if (isMounted) setImageUrl(url);
      } catch (e) {
        console.error("Image generation failed for recipe:", recipe.title, e);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    fetchImage();
    return () => { isMounted = false; };
  }, [recipe.imagePrompt]);

  const missingIngredients = recipe.ingredients.filter(i => i.isMissing);

  return (
    <div 
      className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col relative"
    >
      <div 
        className="relative h-64 overflow-hidden bg-slate-50 cursor-pointer"
        onClick={() => onSelect(recipe)}
      >
        {isGenerating ? (
          <div className="w-full h-full flex flex-col items-center justify-center shimmer">
            <div className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-4 animate-float">
              <i className="fas fa-kitchen-set text-slate-900 text-2xl"></i>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Preparing View...</span>
          </div>
        ) : error || !imageUrl ? (
          <div className="w-full h-full relative overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1495195129352-aeb325a55b65?auto=format&fit=crop&w=800&q=60" 
              className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 ease-out" 
              alt="Placeholder"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black/60 to-slate-900/80 p-10 text-center pointer-events-none transition-opacity duration-500 group-hover:opacity-0">
               <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-sm flex items-center justify-center mb-4">
                 <i className="fas fa-image-slash text-white/80 text-xl"></i>
               </div>
               <h4 className="text-white font-black text-sm leading-tight uppercase tracking-widest">
                 Visual Preview Unavailable
               </h4>
               <p className="text-white/60 text-[10px] font-bold mt-2 uppercase tracking-tighter">AI Generation Failed</p>
            </div>
          </div>
        ) : (
          <>
            <img 
              src={imageUrl} 
              alt={recipe.title}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </>
        )}
        
        {/* Difficulty Badge */}
        <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-black text-black shadow-xl uppercase tracking-widest border border-slate-100 z-20">
          <i className="fas fa-bolt-lightning mr-2 text-[8px] opacity-70"></i>
          {recipe.difficulty}
        </div>

        {/* Action Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
          <button className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl scale-90 group-hover:scale-100 transition-transform">
            View Recipe
          </button>
        </div>
      </div>
      
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex gap-2 mb-4">
          {recipe.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] font-black uppercase tracking-widest text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              {tag}
            </span>
          ))}
        </div>
        
        <h3 
          className="text-2xl font-black text-slate-900 mb-3 leading-tight transition-colors cursor-pointer group-hover:text-black"
          onClick={() => onSelect(recipe)}
        >
          {recipe.title}
        </h3>
        
        <p className="text-sm text-slate-500 line-clamp-2 mb-6 leading-relaxed font-medium">
          {recipe.description}
        </p>

        {/* Missing Ingredients Section */}
        {missingIngredients.length > 0 && (
          <div className="mb-6 p-5 bg-slate-50 rounded-[1.75rem] border border-slate-200 group/items">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-shopping-cart text-[10px] animate-pulse"></i>
                Missing Items
              </h4>
              <span className="text-[10px] font-black text-slate-300">{missingIngredients.length} total</span>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-5">
              {missingIngredients.slice(0, 3).map((ing, idx) => (
                <span key={idx} className="text-[10px] font-bold bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-xl shadow-sm">
                  {ing.name}
                </span>
              ))}
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAddAllMissing(missingIngredients.map(i => ({ name: i.name, amount: i.amount })));
              }}
              className="w-full py-4 bg-black text-white text-[10px] font-black rounded-xl hover:bg-slate-800 transition-all uppercase tracking-[0.2em] shadow-xl active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-plus-circle"></i>
              Sync to Smart Cart
            </button>
          </div>
        )}

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-50 pt-6">
          <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 transition-colors group-hover:bg-slate-100">
            <i className="far fa-clock text-slate-400 mb-1 text-sm"></i>
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{recipe.prepTime}</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 transition-colors group-hover:bg-slate-100">
            <i className="fas fa-fire-flame-curved text-slate-400 mb-1 text-sm"></i>
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{recipe.calories} Cal</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 transition-colors group-hover:bg-slate-100">
            <i className="fas fa-leaf text-slate-400 mb-1 text-sm"></i>
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{recipe.ingredients.length} Ing.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
