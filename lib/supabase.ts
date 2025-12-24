
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmdnmneppcuzepeonnbn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZG5tbmVwcGN1emVwZW9ubmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MjIxNDksImV4cCI6MjA4MjA5ODE0OX0.-hAiJu8D0p_VwAfg060mgr0rD1430xvld85U69w_etI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SQL for the shopping_list table:
 * 
 * create table shopping_list (
 *   id uuid default gen_random_uuid() primary key,
 *   name text not null unique,
 *   created_at timestamp with time zone default now()
 * );
 */
