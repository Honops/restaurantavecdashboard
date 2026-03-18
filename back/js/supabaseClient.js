// js/supabaseClient.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://hkutmhlfmcfeyfhftzqb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdXRtaGxmbWNmZXlmaGZ0enFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDMwMDYsImV4cCI6MjA4ODk3OTAwNn0.ZZv-yKedzZYo3qpQ6tq_bBjG35RL8WiPqrgeryvL0bg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)