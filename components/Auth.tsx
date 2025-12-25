
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center text-white shadow-2xl mx-auto mb-8 animate-float">
            <i className="fas fa-utensils text-3xl"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">HealBites</h1>
          <p className="text-slate-500 font-medium uppercase tracking-[0.2em] text-[10px]">Your Intelligent Culinary Assistant</p>
        </div>

        <div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-xl">
          <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-slate-900 font-bold focus:outline-none focus:border-black focus:bg-white transition-all"
                placeholder="chef@healbites.ai"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-slate-900 font-bold focus:outline-none focus:border-black focus:bg-white transition-all"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in zoom-in-95 ${message.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <i className={`fas ${message.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}`}></i>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-slate-900 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <i className="fas fa-circle-notch animate-spin"></i> : (isSignUp ? 'Join the Kitchen' : 'Sign In')}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-black transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "New to HealBites? Create Account"}
            </button>
          </div>
        </div>
        
        <p className="mt-8 text-center text-slate-300 text-[10px] font-medium uppercase tracking-widest">
          Secure Cloud Sync Enabled
        </p>
      </div>
    </div>
  );
};
