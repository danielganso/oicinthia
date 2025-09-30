import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ucicsyiltzpocctciues.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaWNzeWlsdHpwb2NjdGNpdWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTMyNzcsImV4cCI6MjA3NDMyOTI3N30.pCGlfTd8TBxpMAE61oaJo5ufhPvfxQrbmRlvPd7vlOM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);