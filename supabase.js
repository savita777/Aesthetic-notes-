import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 👇 Apni actual URL aur Key daalein (Dhyan rahe, single quotes '' delete na hon)
const supabaseUrl = 'https://wknpkbifrxcmrpurxmjm.supabase.co';
const supabaseAnonKey = 'sb_publishable_qXdJaio7Bm5cUoHxs6A9iQ_JLtYDr7L';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
