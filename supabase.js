import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 👇 Apni actual URL aur Key daalein (Dhyan rahe, single quotes '' delete na hon)
const supabaseUrl = 'https://gcrebjfyxqdlkxpyilfc.supabase.co';
const supabaseAnonKey = 'sb_publishable_k2v9Y3E-4YbhzDnk_QjucQ_ntRgbp95';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
