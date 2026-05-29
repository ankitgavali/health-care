import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  // Wait, anon key cannot list users.
  
  // Let's just login as guest
  const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({
    email: 'guest.patient@medicare.local',
    password: 'guestPassword123'
  });
  
  console.log("Sign in error:", signErr);
  console.log("User:", signData.user?.id);
  
  if (signData.user) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', signData.user.id);
    console.log("Roles:", data);
    console.log("Role error:", error);
  }
}

check();
