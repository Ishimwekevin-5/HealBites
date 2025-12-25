
import React, { useState, useEffect } from 'react';
import { AppState, Recipe, ShoppingListItem, Ingredient, NearbyStore } from './types';
import { Sidebar } from './components/Sidebar';
import { CameraInput } from './components/CameraInput';
import { RecipeCard } from './components/RecipeCard';
import { CookingMode } from './components/CookingMode';
import { Auth } from './components/Auth';
import { analyzeFridgeImage, findNearbySupermarkets, estimateTotalCost } from './services/geminiService';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'auth',
    user: null,
    ingredientsFound: [],
    selectedRecipe: null,
    shoppingList: [],
    servings: 2,
    ageGroup: 'Adults',
    allergies: [],
    isLoading: false,
    isInitialLoading: true,
    balance: 50.00,
    estimatedTotal: 0,
    nearbyStores: []
  });

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // 1. Session & Auth Listener - Improved for Caching/Persistence
  useEffect(() => {
    // Immediate session check
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setState(prev => ({ 
          ...prev, 
          user: session.user, 
          view: 'home',
          isInitialLoading: false 
        }));
        await fetchUserData(session.user.id);
      } else {
        setState(prev => ({ ...prev, isInitialLoading: false }));
      }
    };

    checkSession();

    // Listen for auth state changes (Sign in, Sign up, Sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setState(prev => ({ 
          ...prev, 
          user: session.user, 
          view: 'home',
          isInitialLoading: false
        }));
        fetchUserData(session.user.id);
      } else {
        setState(prev => ({ 
          ...prev, 
          user: null, 
          view: 'auth',
          isInitialLoading: false
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Data Fetching Logic
  const fetchUserData = async (userId: string) => {
    // Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('servings, age_group, allergies, balance')
      .eq('id', userId)
      .single();

    if (profile) {
      setState(prev => ({
        ...prev,
        servings: profile.servings,
        ageGroup: profile.age_group,
        allergies: profile.allergies,
        balance: profile.balance
      }));
    }

    // Fetch Shopping List
    const { data: list } = await supabase
      .from('shopping_list')
      .select('name, amount')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (list) {
      setState(prev => ({ ...prev, shoppingList: list }));
    }
  };

  // 3. Persistent Sync Helpers
  useEffect(() => {
    if (state.user) {
      syncProfile();
    }
  }, [state.servings, state.ageGroup, state.allergies, state.balance]);

  const syncProfile = async () => {
    if (!state.user) return;
    await supabase.from('profiles').upsert({
      id: state.user.id,
      servings: state.servings,
      age_group: state.ageGroup,
      allergies: state.allergies,
      balance: state.balance,
      updated_at: new Date().toISOString()
    });
  };

  useEffect(() => {
    updateCostEstimation();
  }, [state.shoppingList]);

  const updateCostEstimation = async () => {
    if (state.shoppingList.length === 0) {
      setState(prev => ({ ...prev, estimatedTotal: 0 }));
      return;
    }
    const cost = await estimateTotalCost(state.shoppingList);
    setState(prev => ({ ...prev, estimatedTotal: cost }));
  };

  const handleNearbyStores = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const stores = await findNearbySupermarkets(pos.coords.latitude, pos.coords.longitude);
        setState(prev => ({ ...prev, nearbyStores: stores }));
      } catch (err) {
        console.error("Failed to find stores", err);
      } finally {
        setIsLocating(false);
      }
    }, (err) => {
      console.error(err);
      setIsLocating(false);
      alert("Location permission denied. Cannot find nearby stores.");
    });
  };

  const addToShoppingList = async (item: ShoppingListItem) => {
    if (!state.user) return;
    const exists = state.shoppingList.find(i => i.name.toLowerCase() === item.name.toLowerCase());
    if (!exists) {
      const newList = [...state.shoppingList, item];
      setState(prev => ({ ...prev, shoppingList: newList }));
      await supabase.from('shopping_list').insert([{ 
        user_id: state.user.id,
        name: item.name, 
        amount: item.amount 
      }]);
    }
  };

  const addMultipleToShoppingList = async (items: ShoppingListItem[]) => {
    if (!state.user) return;
    const currentNames = state.shoppingList.map(i => i.name.toLowerCase());
    const newItems = items.filter(i => !currentNames.includes(i.name.toLowerCase()));
    if (newItems.length > 0) {
      const newList = [...state.shoppingList, ...newItems];
      setState(prev => ({ ...prev, shoppingList: newList }));
      await supabase.from('shopping_list').insert(
        newItems.map(i => ({ 
          user_id: state.user!.id,
          name: i.name, 
          amount: i.amount 
        }))
      );
    }
  };

  const updateItemAmount = async (name: string, newAmount: string) => {
    if (!state.user) return;
    const newList = state.shoppingList.map(item => 
      item.name === name ? { ...item, amount: newAmount } : item
    );
    setState(prev => ({ ...prev, shoppingList: newList }));
    await supabase.from('shopping_list')
      .update({ amount: newAmount })
      .eq('user_id', state.user.id)
      .eq('name', name);
  };

  const removeFromShoppingList = async (name: string) => {
    if (!state.user) return;
    const newList = state.shoppingList.filter(i => i.name !== name);
    setState(prev => ({ ...prev, shoppingList: newList }));
    await supabase.from('shopping_list')
      .delete()
      .eq('user_id', state.user.id)
      .eq('name', name);
  };

  const handleImageCapture = async (base64: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    setError(null);
    try {
      const result = await analyzeFridgeImage(
        base64, 
        state.servings, 
        state.ageGroup, 
        state.allergies
      );
      setState(prev => ({ 
        ...prev, 
        ingredientsFound: result.ingredients, 
        view: 'recipe-list', 
        isLoading: false 
      }));
      setRecipes(result.recipes);
    } catch (err) {
      setError("Analysis failed. Try again.");
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Initial Loading Splash Screen
  if (state.isInitialLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="relative">
          <div className="w-24 h-24 bg-black rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl animate-float">
            <i className="fas fa-utensils text-3xl"></i>
          </div>
          <div className="absolute -inset-4 border-2 border-black/5 rounded-[3rem] animate-ping opacity-20"></div>
        </div>
        <div className="mt-12 text-center">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">HealBites</h1>
          <div className="flex gap-1 justify-center">
            <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (state.view === 'auth') return <Auth />;

    switch (state.view) {
      case 'home':
        return (
          <div className="max-w-6xl mx-auto py-16 px-8 animate-in fade-in duration-700">
            <header className="mb-16">
              <span className="text-black font-black text-xs uppercase tracking-[0.4em] mb-4 block">Welcome to the future of cooking</span>
              <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">Your Kitchen, <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-slate-500">Intelligent.</span></h1>
              <p className="text-slate-500 text-xl font-medium max-w-2xl leading-relaxed">Turn your leftovers into gourmet meals. HealBites AI uses computer vision to inventory your fridge and create tailored menus in seconds.</p>
            </header>
            
            <div className="grid lg:grid-cols-3 gap-8">
              <div 
                onClick={() => setState(p => ({ ...p, view: 'scan' }))} 
                className="lg:col-span-2 group relative h-96 bg-black rounded-[3rem] overflow-hidden cursor-pointer shadow-2xl transition-transform active:scale-[0.98]"
              >
                <img src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80" className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-12 flex flex-col justify-end">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center text-white mb-6 group-hover:bg-white group-hover:text-black transition-colors">
                    <i className="fas fa-camera text-2xl"></i>
                  </div>
                  <h3 className="text-4xl font-black text-white mb-4">Start New Scan</h3>
                  <p className="text-slate-300 text-lg max-w-md font-medium">Capture a photo of your shelves to get instant, optimized recipe suggestions.</p>
                </div>
              </div>

              <div 
                onClick={() => setState(p => ({ ...p, view: 'shopping-list' }))} 
                className="bg-white rounded-[3rem] p-10 flex flex-col justify-between border border-slate-200 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group"
              >
                <div>
                  <div className="w-14 h-14 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-black mb-8 transition-transform group-hover:rotate-12 border border-slate-100">
                    <i className="fas fa-shopping-basket text-xl"></i>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4">Smart Cart</h3>
                  <p className="text-slate-500 font-medium">Automatically tracked missing ingredients and budget analysis.</p>
                </div>
                <div className="flex items-center justify-between text-black font-black text-xs uppercase tracking-widest mt-6">
                  <span>Manage List</span>
                  <i className="fas fa-arrow-right-long group-hover:translate-x-2 transition-transform"></i>
                </div>
              </div>
            </div>

            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 opacity-70">
               {[
                 { icon: 'fa-brain', label: 'AI Vision', desc: 'Precise ingredient detection' },
                 { icon: 'fa-scale-balanced', label: 'Smart Scaling', desc: 'Portions for any crowd' },
                 { icon: 'fa-wallet', label: 'Budget Lock', desc: 'Cost estimation engine' }
               ].map((feature, i) => (
                 <div key={i} className="flex items-start gap-4 p-6 rounded-3xl border border-slate-100">
                    <div className="text-black text-lg mt-1"><i className={`fas ${feature.icon}`}></i></div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-tight text-slate-800">{feature.label}</h4>
                      <p className="text-xs text-slate-500 font-medium">{feature.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        );

      case 'scan':
        return (
          <div className="py-24 px-8 animate-in slide-in-from-bottom-8 duration-700">
            <CameraInput onImageCaptured={handleImageCapture} isLoading={state.isLoading} />
            <div className="mt-12 max-w-xl mx-auto">
               <div className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-black border border-slate-100">
                      <i className="fas fa-users"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scaling For</p>
                      <p className="text-lg font-black text-slate-800">{state.servings} {state.ageGroup}</p>
                    </div>
                  </div>
                  <button onClick={() => setState(p => ({ ...p, view: 'home' }))} className="text-black text-[10px] font-black uppercase tracking-widest hover:underline">Change</button>
               </div>
            </div>
            {error && (
              <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-3xl text-slate-900 text-center max-w-2xl mx-auto flex items-center justify-center gap-3 font-bold shadow-xl animate-in zoom-in-95">
                <i className="fas fa-circle-exclamation text-xl"></i> {error}
              </div>
            )}
          </div>
        );

      case 'recipe-list':
        return (
          <div className="max-w-7xl mx-auto py-16 px-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <span className="text-black font-black text-xs uppercase tracking-[0.4em] mb-3 block">Gourmet Curated Selection</span>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">AI Culinary <span className="text-slate-400">Proposals</span></h2>
                <p className="text-slate-500 font-medium mt-2">Personalized for {state.servings} {state.ageGroup.toLowerCase()} with existing inventory.</p>
              </div>
              <button 
                onClick={() => setState(p => ({ ...p, view: 'scan' }))}
                className="px-8 py-3.5 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                <i className="fas fa-rotate mr-2"></i>
                Rescan Fridge
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
              {recipes.map(recipe => (
                <RecipeCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  onSelect={(r) => setState(prev => ({ ...prev, selectedRecipe: r, view: 'cooking-mode' }))}
                  onAddAllMissing={(items) => addMultipleToShoppingList(items)}
                />
              ))}
            </div>
          </div>
        );

      case 'shopping-list':
        const budgetPercentage = state.balance > 0 ? (state.estimatedTotal / state.balance) * 100 : 0;
        const isOverBudget = state.estimatedTotal > state.balance;
        const remaining = state.balance - state.estimatedTotal;

        return (
          <div className="max-w-5xl mx-auto py-16 px-8 flex flex-col gap-12 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Smart Cart</h2>
                <p className="text-slate-500 font-medium">Intelligent budget tracking & inventory procurement.</p>
              </div>
              <div className="flex gap-3">
                <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm bg-slate-900 text-white`}>
                  <i className={`fas fa-cloud-check mr-2`}></i>
                  Cloud Synced
                </span>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="px-4 py-2 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100"
                >
                  Sign Out
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Visual Budget Tracker Card */}
              <div className="lg:col-span-1 bg-black text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10">Wallet Engine</h4>
                
                <div className="mb-10">
                  <div className="flex justify-between items-end mb-4 px-1">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Available Funds</span>
                    <span className="text-3xl font-black">${state.balance.toFixed(0)}</span>
                  </div>
                  
                  {/* Progress Bar Container */}
                  <div className="relative h-6 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-1">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out rounded-full ${isOverBudget ? 'bg-white' : 'bg-slate-400'}`}
                      style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between mt-4 px-2">
                    <span className={`text-[10px] font-black ${isOverBudget ? 'text-white' : 'text-slate-500'}`}>
                      {budgetPercentage.toFixed(0)}% Utilized
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">Limit: ${state.balance}</span>
                  </div>
                </div>

                <div className="space-y-6 pt-10 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs font-medium tracking-tight">Estimated Spend</span>
                    <span className="font-black text-xl text-white">${state.estimatedTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs font-medium tracking-tight">Balance Status</span>
                    <span className={`font-black text-xl ${isOverBudget ? 'text-white' : 'text-slate-400'}`}>
                      {remaining >= 0 ? `$${remaining.toFixed(2)} Left` : `$${Math.abs(remaining).toFixed(2)} Over`}
                    </span>
                  </div>
                </div>

                <div className="mt-12">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Set Weekly Budget</label>
                  <div className="relative group/input">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black">$</span>
                    <input 
                      type="number" 
                      value={state.balance} 
                      onChange={(e) => setState(p => ({ ...p, balance: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-10 pr-5 text-white font-black text-base focus:outline-none focus:border-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm flex flex-col group/list overflow-hidden relative">
                <div className="flex items-center justify-between mb-10">
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight">Line Items</h4>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-slate-100">{state.shoppingList.length} Units</span>
                  </div>
                </div>

                {state.shoppingList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-24">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
                      <i className="fas fa-cart-plus text-3xl"></i>
                    </div>
                    <p className="font-black text-slate-300 uppercase tracking-widest text-xs">Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto pr-4 max-h-[600px] custom-scrollbar pb-6">
                    {state.shoppingList.map(item => (
                      <div key={item.name} className="flex items-center gap-5 p-5 bg-slate-50 rounded-[2rem] group/item hover:bg-black hover:text-white transition-all duration-300 border border-slate-100">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-black transition-colors group-hover/item:bg-slate-900 group-hover/item:text-white shrink-0 border border-slate-100">
                          <i className="fas fa-basket-shopping"></i>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm leading-tight uppercase tracking-tight truncate group-hover/item:text-white text-slate-900">{item.name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <i className="fas fa-pencil text-[8px] opacity-40"></i>
                            <input 
                              type="text"
                              value={item.amount}
                              onChange={(e) => updateItemAmount(item.name, e.target.value)}
                              placeholder="Quantity..."
                              className="bg-transparent text-xs font-black border-none p-0 focus:outline-none w-full placeholder:text-slate-300 group-hover/item:text-slate-400 text-black"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={() => removeFromShoppingList(item.name)} 
                          className="w-10 h-10 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center shrink-0"
                        >
                          <i className="fas fa-trash-can text-sm"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Nearby Stores Card */}
            <div className="bg-black rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -mr-48 -mt-48 animate-pulse"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-12">
                  <div className="max-w-xl">
                    <h4 className="text-4xl font-black mb-4 tracking-tight">Grocery Dispatch</h4>
                    <p className="text-slate-400 text-lg font-medium opacity-80 leading-relaxed">Locate the nearest premium supermarkets and markets with high-precision geolocation.</p>
                  </div>
                  <button 
                    onClick={handleNearbyStores}
                    disabled={isLocating}
                    className="px-12 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50"
                  >
                    {isLocating ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-location-dot"></i>}
                    {isLocating ? 'Scanning...' : 'Search Stores'}
                  </button>
                </div>

                {state.nearbyStores.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-28 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center border-dashed">
                        <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">Standby...</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {state.nearbyStores.map((store, i) => (
                      <div 
                        key={i} 
                        className="p-8 bg-white/5 backdrop-blur-md rounded-[2.25rem] border border-white/10 flex flex-col justify-between hover:bg-white hover:text-black transition-all duration-500 shadow-xl group/store"
                      >
                        <div>
                          <div className="flex items-center gap-5 mb-6">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white transition-all group-hover/store:bg-black group-hover/store:text-white group-hover/store:scale-110">
                              <i className="fas fa-store"></i>
                            </div>
                            <div className="min-w-0">
                              <span className="font-black text-sm block truncate uppercase tracking-tight">{store.name}</span>
                              <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{store.address}</span>
                            </div>
                          </div>
                        </div>

                        <a 
                          href={store.uri} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-full py-3 bg-white/10 group-hover/store:bg-black group-hover/store:text-white rounded-xl text-center font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105"
                        >
                          Navigate
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {state.view !== 'auth' && (
        <Sidebar 
          currentView={state.view} 
          servings={state.servings} 
          setServings={(count) => setState(p => ({ ...p, servings: count }))} 
          ageGroup={state.ageGroup}
          setAgeGroup={(age) => setState(p => ({ ...p, ageGroup: age }))}
          allergies={state.allergies}
          setAllergies={(als) => setState(p => ({ ...p, allergies: als }))}
          onNavigate={(v) => setState(p => ({ ...p, view: v }))} 
        />
      )}
      <main className="flex-1 pb-24 md:pb-0 overflow-x-hidden bg-white min-h-screen">
        {renderContent()}
      </main>
      
      {state.view !== 'auth' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex justify-around items-center z-[150] shadow-2xl">
           {[
             { id: 'home', icon: 'fa-house' },
             { id: 'scan', icon: 'fa-camera' },
             { id: 'shopping-list', icon: 'fa-cart-shopping' }
           ].map(item => (
             <button 
               key={item.id}
               onClick={() => setState(p => ({ ...p, view: item.id as any }))}
               className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${state.view === item.id ? 'bg-black text-white shadow-lg' : 'text-slate-400'}`}
             >
               <i className={`fas ${item.icon}`}></i>
             </button>
           ))}
        </div>
      )}

      {state.view === 'cooking-mode' && state.selectedRecipe && (
        <CookingMode 
          recipe={state.selectedRecipe} 
          onExit={() => setState(p => ({ ...p, view: 'recipe-list' }))} 
          addToShoppingList={(item) => addToShoppingList({ name: item.name, amount: item.amount })} 
        />
      )}
    </div>
  );
};

export default App;
