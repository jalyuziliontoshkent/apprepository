const backendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'https://lion-blinds-backend.onrender.com';
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rgqgefqmuwqeritnxely.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJncWdlZnFtdXdxZXJpdG54ZWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDMzMDMsImV4cCI6MjA5MTIxOTMwM30.rB5aDvnD2eSL4PYGXoGc1POhTikS-IZIraoekgE_dKU';

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    backendUrl,
    supabaseUrl,
    supabaseAnonKey,
  },
});
