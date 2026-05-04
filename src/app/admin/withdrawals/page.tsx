'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/AppLayout'
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function AdminWithdrawalsPage() {
  const supabase = createClient()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    const checkAdminAndLoad = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Check admin status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        setLoading(false)
        return
      }

      setIsAdmin(true)
      fetchRequests()
    }

    checkAdminAndLoad()
  }, [])

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('*, profiles(full_name, username, email)')
      .order('created_at', { ascending: false })
    
    setRequests(data || [])
    setLoading(false)
  }

  const handleConfirmPaid = async (reqId: string) => {
    if (!confirm('Are you sure you have sent the money? This will deduct from the creator balance and mark as paid.')) return
    
    setProcessingId(reqId)
    const { error } = await supabase.rpc('admin_mark_withdrawal_paid', { req_id: reqId })
    
    if (error) {
      alert(`Error: ${error.message}`)
    } else {
      alert('Success! Creator balance deducted and marked as paid.')
      fetchRequests()
    }
    setProcessingId(null)
  }

  if (loading) return (
    <AppLayout>
      <div className="p-8 text-center text-zinc-400 font-bold animate-pulse">Loading Admin Dashboard...</div>
    </AppLayout>
  )

  if (!isAdmin) return (
    <AppLayout>
      <div className="p-8 text-center text-red-500 font-bold">Access Denied. You must be an administrator.</div>
    </AppLayout>
  )

  const pending = requests.filter(r => r.status === 'pending')
  const paid = requests.filter(r => r.status === 'paid')

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-8">Admin: Withdrawals</h1>

        {/* Pending Requests */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <ClockIcon className="w-6 h-6 text-amber-500" /> 
          Pending Action ({pending.length})
        </h2>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden mb-12">
          {pending.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">No pending requests right now.</div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pending.map(r => (
                <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{r.profiles?.full_name || 'Unknown'}</span>
                      <span className="text-zinc-400 text-sm">@{r.profiles?.username}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-zinc-500 mr-2">Amount:</span>
                      <span className="font-black text-lg text-emerald-500">${r.amount}</span>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="text-zinc-500 mr-2">Method:</span>
                      <span className="font-bold uppercase bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px]">{r.payment_method}</span>
                    </div>
                    <div className="text-sm mt-1 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 p-2 rounded-lg mt-2 inline-block font-mono">
                      {r.phone_number}
                    </div>
                  </div>
                  
                  <div className="flex-none">
                    <button
                      onClick={() => handleConfirmPaid(r.id)}
                      disabled={processingId === r.id}
                      className="w-full sm:w-auto px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl disabled:opacity-50 hover:scale-[0.98] transition-transform"
                    >
                      {processingId === r.id ? 'Processing...' : 'Confirm Payment Sent'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paid Requests History */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-zinc-500">
          <CheckCircleIcon className="w-6 h-6" /> 
          Paid History ({paid.length})
        </h2>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden opacity-75">
          {paid.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">No history yet.</div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paid.map(r => (
                <div key={r.id} className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold block text-sm">{r.profiles?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black block">${r.amount}</span>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">Paid via {r.payment_method}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
