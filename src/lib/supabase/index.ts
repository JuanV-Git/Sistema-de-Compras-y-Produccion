// Re-export browser client only
// Server client should be imported directly from './server' in Server Components
export { createClient as createBrowserClient } from './client';
