import re

with open('src/app/messages/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
if 'import { encryptMessage' not in code:
    code = code.replace(
        "import { createClient } from '@/lib/supabase/client'",
        "import { createClient } from '@/lib/supabase/client'\nimport { encryptMessage, decryptMessage, getSharedSecret } from '@/lib/crypto'"
    )

# Replace EllipsisHorizontalIcon and FaceSmileIcon to imports if not exist
if 'FaceSmileIcon' not in code:
    code = code.replace('PaperAirplaneIcon,', 'PaperAirplaneIcon,\n  FaceSmileIcon,\n  EllipsisHorizontalIcon,')

# 2. fetchConvos
code = code.replace(
'''    const list = (profiles || []).map((p: any) => ({
      profile: p,
      lastMsg: lastMsg.get(p.id),
      unread:  unread.get(p.id) || 0,
    }))
    list.sort((a: any, b: any) =>
      +new Date(b.lastMsg?.created_at || 0) - +new Date(a.lastMsg?.created_at || 0))
    setConvos(list)''',
'''    const list = (profiles || []).map((p: any) => ({
      profile: p,
      lastMsg: lastMsg.get(p.id),
      unread:  unread.get(p.id) || 0,
    }))

    // Decrypt previews
    await Promise.all(list.map(async (c: any) => {
      if (c.lastMsg && c.lastMsg.content) {
        c.lastMsg.content = await decryptMessage(c.lastMsg.content, getSharedSecret(user.id, c.profile.id))
      }
    }))

    list.sort((a: any, b: any) =>
      +new Date(b.lastMsg?.created_at || 0) - +new Date(a.lastMsg?.created_at || 0))
    setConvos(list)'''
)

# 3. fetchMessages
code = code.replace(
'''    if (!data) { setLoadingMessages(false); return }
    const timeline = data.map((m: any) => ({ ...m, _type: 'message' }))''',
'''    if (!data) { setLoadingMessages(false); return }
    
    const secret = getSharedSecret(user.id, selected.id)
    const decryptedData = await Promise.all(data.map(async (m: any) => {
      if (m.content) {
        m.content = await decryptMessage(m.content, secret)
      }
      return m
    }))
    
    const timeline = decryptedData.map((m: any) => ({ ...m, _type: 'message' }))'''
)

# 4. Realtime subscribe
code = code.replace(
'''          const rel = (m.sender_id === user.id && m.receiver_id === selected.id) ||
                      (m.sender_id === selected.id && m.receiver_id === user.id)
          if (!rel) return
          
          setMessages(prev => [...prev, { ...m }])''',
'''          const rel = (m.sender_id === user.id && m.receiver_id === selected.id) ||
                      (m.sender_id === selected.id && m.receiver_id === user.id)
          if (!rel) return
          
          if (m.content) {
            const secret = getSharedSecret(user.id, selected.id)
            m.content = await decryptMessage(m.content, secret)
          }
          
          setMessages(prev => [...prev, { ...m }])'''
)

code = code.replace(
'''          const rel = (updated.sender_id === user.id && updated.receiver_id === selected.id) ||
                      (updated.sender_id === selected.id && updated.receiver_id === user.id)
          if (!rel) return
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))''',
'''          const rel = (updated.sender_id === user.id && updated.receiver_id === selected.id) ||
                      (updated.sender_id === selected.id && updated.receiver_id === user.id)
          if (!rel) return
          if (updated.content) {
            const secret = getSharedSecret(user.id, selected.id)
            updated.content = await decryptMessage(updated.content, secret)
          }
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))'''
)

# 5. sendMessage
code = code.replace(
'''    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: selected.id, content: text })''',
'''    const secret = getSharedSecret(user.id, selected.id)
    const encryptedContent = await encryptMessage(text, secret)
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: selected.id, content: encryptedContent })'''
)

# 6. Global Style for Bottom Nav
code = code.replace(
'''  return (
    <AppLayout fullBleed>
      <div className="flex h-[calc(100dvh-var(--nav-height,3.5rem))] md:h-screen overflow-hidden bg-white dark:bg-black" style={{ touchAction: 'pan-y' }}>''',
'''  return (
    <AppLayout fullBleed>
      {selected && (
        <style dangerouslySetInnerHTML={{ __html: \`
          nav.sm\\\\:hidden.fixed.bottom-0 { display: none !important; }
          main { padding-bottom: 0px !important; }
        \`}} />
      )}
      <div className="flex h-[calc(100dvh-var(--nav-height,3.5rem))] md:h-screen overflow-hidden bg-zinc-50 dark:bg-black" style={{ touchAction: 'pan-y' }}>'''
)


with open('src/app/messages/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Replaced')
