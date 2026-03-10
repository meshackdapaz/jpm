const fs = require('fs')

let code = fs.readFileSync('src/app/messages/page.tsx', 'utf-8')

// Bubbles
code = code.replace(
`                                mine
                                  ? \`bg-black dark:bg-white text-white dark:text-black \${mineRound}\`
                                  : \`bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 \${othersRound}\``,
`                                mine
                                  ? \`bg-blue-600 text-white \${mineRound}\`
                                  : \`bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-sm \${othersRound}\``
)

// Input form
const oldInputForm = `                <form onSubmit={sendMessage}
                  className="flex-none flex items-end gap-2 px-3 py-2.5 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-zinc-100/80 dark:border-zinc-900/80"
                  style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))' }}>

                  <div className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-3xl px-4 py-2.5 flex items-center min-h-[46px] shadow-sm" style={{ touchAction: 'pan-x pan-y' }}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={handleTyping}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as any) }
                      }}
                      placeholder={recording ? '🔴 Recording…' : 'Message…'}
                      autoComplete="off"
                      disabled={recording}
                      className="flex-1 bg-transparent text-[16px] outline-none placeholder-zinc-400 text-zinc-900 dark:text-zinc-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {!input.trim() && (
                    <button
                      type="button"
                      onPointerDown={startRecording}
                      onPointerUp={stopAndSendVoiceNote}
                      onPointerLeave={stopAndSendVoiceNote}
                      className={\`flex-none w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-all flex-shrink-0 \${
                        recording
                          ? 'bg-red-500 text-white animate-record'
                          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                      }\`}
                      aria-label="Hold to record voice note"
                    >
                      <MicrophoneIcon className="w-5 h-5" />
                    </button>
                  )}

                  {(input.trim() || sending) && (
                    <button
                      type="submit"
                      disabled={!input.trim() || sending}
                      className="flex-none w-11 h-11 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all flex-shrink-0"
                      aria-label="Send"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                      </svg>
                    </button>
                  )}
                </form>`

const newInputForm = `                <form onSubmit={sendMessage}
                  className="flex-none flex items-end gap-2 px-3 py-3 bg-zinc-50 dark:bg-black"
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>

                  <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[24px] px-2 py-1 flex items-center min-h-[44px] shadow-sm border border-zinc-200 dark:border-zinc-800" style={{ touchAction: 'pan-x pan-y' }}>
                    
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={handleTyping}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as any) }
                      }}
                      placeholder={recording ? '🔴 Recording…' : 'Type a message...'}
                      autoComplete="off"
                      disabled={recording}
                      className="flex-1 bg-transparent text-[15px] px-3 outline-none placeholder-zinc-400 text-zinc-900 dark:text-zinc-100 disabled:cursor-not-allowed"
                    />

                    <button type="button" className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-blue-600 transition-colors">
                      <FaceSmileIcon className="w-6 h-6" />
                    </button>

                    {!input.trim() && (
                      <button
                        type="button"
                        onPointerDown={startRecording}
                        onPointerUp={stopAndSendVoiceNote}
                        onPointerLeave={stopAndSendVoiceNote}
                        className={\`p-2 transition-colors \${
                          recording
                            ? 'text-red-500 animate-record'
                            : 'text-zinc-400 dark:text-zinc-500 hover:text-blue-600'
                        }\`}
                        aria-label="Hold to record voice note"
                      >
                        <MicrophoneIcon className="w-6 h-6" />
                      </button>
                    )}
                  </div>

                  {(input.trim() || sending) && (
                    <button
                      type="submit"
                      disabled={!input.trim() || sending}
                      className="flex-none w-[44px] h-[44px] rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shadow-md ml-1"
                      aria-label="Send"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 -ml-0.5">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                      </svg>
                    </button>
                  )}
                </form>`

if (code.includes('className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-3xl px-4 py-2.5 flex items-center min-h-[46px] shadow-sm" style={{ touchAction: \'pan-x pan-y\' }}>')) {
  code = code.replace(oldInputForm, newInputForm)
}

fs.writeFileSync('src/app/messages/page.tsx', code, 'utf-8')
console.log('UI Replaced')
