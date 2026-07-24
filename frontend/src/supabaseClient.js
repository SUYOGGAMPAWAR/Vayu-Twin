import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wgjhlozrllqhdqaogcbx.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnamhsb3pybGxxaGRxYW9nY2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NjkyNTYsImV4cCI6MjEwMDQ0NTI1Nn0.dAkgUSSpHzuCU-2FKtWP40w1zFzKZ4Fv3bMf1O-lIEM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
