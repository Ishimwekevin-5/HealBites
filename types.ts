
import { User } from '@supabase/supabase-js';

export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export interface Ingredient {
  name: string;
  amount: string;
  isMissing?: boolean;
}

export interface ShoppingListItem {
  name: string;
  amount: string;
}

export interface NearbyStore {
  name: string;
  address: string;
  uri: string;
  phone?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  prepTime: string;
  calories: number;
  ingredients: Ingredient[];
  steps: string[];
  imagePrompt: string;
  tags: string[];
}

export interface AppState {
  view: 'auth' | 'home' | 'scan' | 'recipe-list' | 'cooking-mode' | 'shopping-list';
  user: User | null;
  ingredientsFound: string[];
  selectedRecipe: Recipe | null;
  shoppingList: ShoppingListItem[];
  servings: number;
  ageGroup: 'Adults' | 'Children' | 'Mixed';
  allergies: string[];
  isLoading: boolean;
  isInitialLoading: boolean;
  balance: number;
  estimatedTotal: number;
  nearbyStores: NearbyStore[];
}
