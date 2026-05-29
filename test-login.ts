import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ahalqicftneggidagazs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoYWxxaWNmdG5lZ2dpZGFnYXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTEwMjIsImV4cCI6MjA5NDkyNzAyMn0.O2T4XjSIXWPROoP9CWWQqOc_jeCGscJHn0hzbzVIR0s";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log("Attempting sign in as nurse12@gmail.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "nurse12@gmail.com",
    password: "123456"
  });

  if (error) {
    console.error("Sign in failed:", error.message);
    console.log("Attempting sign up as nurse12@gmail.com...");
    const { data: upData, error: upErr } = await supabase.auth.signUp({
      email: "nurse12@gmail.com",
      password: "123456"
    });
    if (upErr) {
      console.error("Sign up failed:", upErr.message);
    } else {
      console.log("Sign up succeeded, user ID:", upData.user?.id);
    }
  } else {
    console.log("Sign in succeeded, user ID:", data.user?.id);
    
    // Check user role
    const { data: roleData, error: roleErr } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", data.user.id);
      
    console.log("Roles in DB:", roleData, "Error:", roleErr?.message);
  }
}

test();
