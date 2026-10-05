'use client'

import { useState } from 'react'

export default function AgentSelector({ agents }: { agents: any[] }) {
  const [search, setSearch] = useState('')

  // সার্চের ইনপুট অনুযায়ী এজেন্ট ফিল্টার করা
  const filteredAgents = agents.filter(a =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Assign to Agents (Multi-select)</label>
      <input
        type="text"
        placeholder="Search agent by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 mb-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-shikho-indigo-500 text-sm font-poppins outline-none"
      />
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50">
        {filteredAgents.length === 0 ? (
          <p className="text-xs text-gray-500 p-2 font-poppins">No agents found.</p>
        ) : (
          filteredAgents.map(agent => (
            <label key={agent.id} className="flex items-center gap-3 p-2 bg-white rounded cursor-pointer border border-transparent hover:border-shikho-indigo-300 transition-colors shadow-sm">
              <input type="checkbox" name="agent_ids" value={agent.id} className="accent-shikho-indigo-600 w-4 h-4 cursor-pointer" />
              <div className="text-sm text-gray-800 font-poppins font-medium">
                {agent.full_name || 'N/A'} <span className="text-gray-500 text-xs font-normal">({agent.email})</span>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  )
}
