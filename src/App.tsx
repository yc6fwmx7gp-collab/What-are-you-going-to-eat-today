/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Settings, ChefHat, Utensils, RefreshCw, AlertCircle, CheckCircle2, Heart, Clock, Globe, X } from 'lucide-react';

type Category = 'Home-style' | 'Luxury' | 'Creative/Innovative';

interface Dish {
  id: number;
  name: string;
  category: Category;
  ingredients?: string[];
  steps?: string[];
  estimated_cooking_time?: string;
  cuisine_type?: string;
}

export default function App() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem('favorite_dishes');
    return saved ? JSON.parse(saved) : [];
  });
  const [showProfile, setShowProfile] = useState(false);

  const toggleFavorite = (id: number) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id];
      localStorage.setItem('favorite_dishes', JSON.stringify(next));
      return next;
    });
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Config State
  const [mode, setMode] = useState<'wheel' | 'direct'>('direct');
  const [showRecipe, setShowRecipe] = useState(false);
  const [categories, setCategories] = useState<Record<Category, boolean>>({
    'Home-style': true,
    'Luxury': true,
    'Creative/Innovative': true,
  });
  const [servingSize, setServingSize] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(1);

  // Draw State
  const [isDrawing, setIsDrawing] = useState(false);
  const [results, setResults] = useState<Dish[]>([]);
  const [wheelRotation, setWheelRotation] = useState(0);

  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = async () => {
    try {
      const res = await fetch('/api/dishes');
      if (!res.ok) throw new Error('Failed to fetch dishes');
      const data = await res.json();
      setDishes(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load dish pool. Please try again later.');
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/dishes/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json),
        });
        
        if (!res.ok) throw new Error('Upload failed');
        
        const data = await res.json();
        setSuccessMsg(data.message);
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchDishes();
      } catch (err) {
        setError('Invalid JSON file or upload error.');
        setTimeout(() => setError(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDraw = () => {
    setError(null);
    const activeCategories = Object.entries(categories)
      .filter(([_, isActive]) => isActive)
      .map(([cat]) => cat);

    const pool = dishes.filter(d => activeCategories.includes(d.category));

    if (pool.length === 0) {
      setError('No dishes match the selected categories.');
      return;
    }

    if (quantity > pool.length) {
      setError(`Only ${pool.length} dishes available in selected categories.`);
      return;
    }

    setIsDrawing(true);
    setResults([]);

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, quantity);

    if (mode === 'wheel') {
      const newRotation = wheelRotation + 1440 + Math.random() * 360;
      setWheelRotation(newRotation);
      
      setTimeout(() => {
        setResults(selected);
        setIsDrawing(false);
      }, 3000);
    } else {
      setTimeout(() => {
        setResults(selected);
        setIsDrawing(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-emerald-200">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700">
            <ChefHat className="w-6 h-6" />
            <h1 className="font-bold text-lg tracking-tight hidden sm:block">What Are You Going to Eat Today?</h1>
            <h1 className="font-bold text-lg tracking-tight sm:hidden">Eat Today?</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowProfile(true)} 
              className="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-red-500 transition-colors"
            >
              <Heart className={`w-4 h-4 ${favorites.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              <span className="hidden sm:inline">Favorites</span> ({favorites.length})
            </button>
            <div className="text-sm text-stone-500 font-medium border-l border-stone-200 pl-4">
              {dishes.length} dishes
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-4 flex items-center gap-2">
               <Settings className="w-4 h-4" /> Parameters
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Selection Mode</label>
              <div className="flex bg-stone-100 p-1 rounded-lg">
                <button
                  onClick={() => setMode('direct')}
                  className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${mode === 'direct' ? 'bg-white shadow-sm text-emerald-700' : 'text-stone-600 hover:text-stone-900'}`}
                >
                  Direct Draw
                </button>
                <button
                  onClick={() => setMode('wheel')}
                  className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${mode === 'wheel' ? 'bg-white shadow-sm text-emerald-700' : 'text-stone-600 hover:text-stone-900'}`}
                >
                  Spinning Wheel
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Categories</label>
              <div className="space-y-2">
                {(Object.keys(categories) as Category[]).map(cat => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={categories[cat]}
                      onChange={(e) => setCategories(prev => ({ ...prev, [cat]: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-stone-700 group-hover:text-stone-900">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Serving Size</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <label key={num} className="cursor-pointer">
                    <input
                      type="radio"
                      name="servingSize"
                      value={num}
                      checked={servingSize === num}
                      onChange={() => setServingSize(num)}
                      className="sr-only"
                    />
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${servingSize === num ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                      {num}
                    </div>
                  </label>
                ))}
              </div>
              <select
                value={servingSize > 6 ? servingSize : ''}
                onChange={(e) => setServingSize(Number(e.target.value))}
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="" disabled>7+ people...</option>
                {[7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num} people</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Number of Dishes</label>
              <input
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-semibold">Show Recipe Details</span>
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showRecipe ? 'bg-emerald-600' : 'bg-stone-300'}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={showRecipe}
                    onChange={(e) => setShowRecipe(e.target.checked)}
                  />
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showRecipe ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-4 flex items-center gap-2">
               <Upload className="w-4 h-4" /> Custom Pool
            </h2>
            <p className="text-xs text-stone-500 mb-4">Upload a .json file to append custom dishes to your local pool.</p>
            <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-stone-300 rounded-xl hover:bg-stone-50 hover:border-emerald-400 transition-colors cursor-pointer group">
              <div className="text-center">
                <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1 group-hover:text-emerald-500 transition-colors" />
                <span className="text-sm text-stone-600 font-medium">Select JSON File</span>
              </div>
              <input type="file" accept=".json" className="sr-only" onChange={handleFileUpload} />
            </label>
            
            <AnimatePresence>
              {successMsg && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {successMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col">
          
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3 border border-red-100">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white flex-1 rounded-2xl shadow-sm border border-stone-200 p-8 flex flex-col items-center justify-center relative overflow-hidden">
            
            {mode === 'wheel' && (
              <div className="mb-12 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10 text-emerald-600">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L16 10H8L12 2Z" /></svg>
                </div>
                <motion.div 
                  className="w-64 h-64 rounded-full border-4 border-stone-100 shadow-inner relative overflow-hidden"
                  animate={{ rotate: wheelRotation }}
                  transition={{ duration: 3, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="absolute inset-0 bg-emerald-100" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%)' }} />
                  <div className="absolute inset-0 bg-emerald-200" style={{ clipPath: 'polygon(50% 50%, 100% 100%, 0 100%)' }} />
                  <div className="absolute inset-0 bg-emerald-300" style={{ clipPath: 'polygon(50% 50%, 0 100%, 0 0)' }} />
                  <div className="absolute inset-0 bg-emerald-400" style={{ clipPath: 'polygon(50% 50%, 0 0, 100% 0)' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-stone-400" />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            <button
              onClick={handleDraw}
              disabled={isDrawing || loading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-lg font-bold py-4 px-12 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2 mb-8"
            >
              {isDrawing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Drawing...
                </>
              ) : (
                'Draw Now'
              )}
            </button>

            <div className="w-full max-w-2xl">
              <AnimatePresence mode="popLayout">
                {results.map((dish, idx) => (
                  <motion.div
                    key={`${dish.id}-${idx}`}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-stone-50 border border-stone-200 rounded-xl p-6 mb-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-2xl font-bold text-stone-900">{dish.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs font-semibold uppercase tracking-wider bg-stone-200 text-stone-600 px-2 py-1 rounded">
                            {dish.category}
                          </span>
                          {dish.cuisine_type && (
                            <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-1 rounded flex items-center gap-1">
                              <Globe className="w-3 h-3" /> {dish.cuisine_type}
                            </span>
                          )}
                          {dish.estimated_cooking_time && (
                            <span className="text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-1 rounded flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {dish.estimated_cooking_time}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleFavorite(dish.id)} 
                        className="p-2 -mr-2 -mt-2 rounded-full hover:bg-stone-200 transition-colors"
                        title={favorites.includes(dish.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart className={`w-6 h-6 ${favorites.includes(dish.id) ? 'fill-red-500 text-red-500' : 'text-stone-400'}`} />
                      </button>
                    </div>
                    
                    {showRecipe && (dish.ingredients || dish.steps) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-6 pt-6 border-t border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-6"
                      >
                        {dish.ingredients && dish.ingredients.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ingredients
                            </h4>
                            <ul className="space-y-1.5">
                              {dish.ingredients.map((ing, i) => (
                                <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
                                  <span className="text-stone-300 mt-0.5">•</span>
                                  <span dangerouslySetInnerHTML={{ __html: ing }} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {dish.steps && dish.steps.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Instructions
                            </h4>
                            <ol className="space-y-3">
                              {dish.steps.map((step, i) => (
                                <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
                                  <span className="font-mono text-xs text-stone-400 mt-0.5">{i + 1}.</span>
                                  <span dangerouslySetInnerHTML={{ __html: step }} />
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {results.length === 0 && !isDrawing && !loading && (
                <div className="text-center text-stone-400 py-12">
                  <Utensils className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Ready to decide what to eat?</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" /> My Favorite Dishes
                </h2>
                <button 
                  onClick={() => setShowProfile(false)} 
                  className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-full hover:bg-stone-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-white">
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-500 font-medium">You haven't saved any favorites yet.</p>
                    <p className="text-stone-400 text-sm mt-1">Draw some dishes and click the heart icon to save them here!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dishes.filter(d => favorites.includes(d.id)).map(dish => (
                      <div key={dish.id} className="flex items-center justify-between bg-stone-50 p-4 rounded-xl border border-stone-200 hover:border-emerald-200 transition-colors group">
                        <div>
                          <h4 className="font-bold text-stone-900 text-lg">{dish.name}</h4>
                          <div className="text-xs text-stone-500 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                            <span className="font-medium text-stone-600">{dish.category}</span>
                            {dish.cuisine_type && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {dish.cuisine_type}</span>}
                            {dish.estimated_cooking_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {dish.estimated_cooking_time}</span>}
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleFavorite(dish.id)} 
                          className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          title="Remove from favorites"
                        >
                          <Heart className="w-5 h-5 fill-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
