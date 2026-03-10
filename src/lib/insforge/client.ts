import { createClient } from '@insforge/sdk';

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

let client: any = null;

export function getInsForgeClient() {
  if (client) return client;

  client = createClient({
    baseUrl,
    anonKey
  });
  
  return client;
}
