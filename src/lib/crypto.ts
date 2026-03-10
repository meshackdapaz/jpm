/**
 * Secure Message Encryption/Decryption using Web Crypto API (AES-GCM)
 */

async function getEncryptionKey(secret: string) {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('meme-sharing-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptMessage(text: string, secret: string): Promise<string> {
  try {
    const enc = new TextEncoder()
    const key = await getEncryptionKey(secret)
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(text)
    )

    const result = new Uint8Array(iv.length + encrypted.byteLength)
    result.set(iv)
    result.set(new Uint8Array(encrypted), iv.length)
    
    return 'encrypted:' + btoa(String.fromCharCode(...result))
  } catch (err) {
    console.error('Encryption failed:', err)
    return text // Fallback to plain text if failed
  }
}

export async function decryptMessage(ciphertext: string, secret: string): Promise<string> {
  if (!ciphertext.startsWith('encrypted:')) return ciphertext
  try {
    const data = Uint8Array.from(atob(ciphertext.replace('encrypted:', '')), c => c.charCodeAt(0))
    const iv = data.slice(0, 12)
    const encrypted = data.slice(12)
    const key = await getEncryptionKey(secret)
    const dec = new TextDecoder()
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )
    
    return dec.decode(decrypted)
  } catch (err) {
    // If decryption fails, it might be an unencrypted old message
    return ciphertext 
  }
}

/**
 * Generates a deterministic shared secret between two users
 */
export function getSharedSecret(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('-')
}
