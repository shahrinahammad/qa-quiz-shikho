'use client'

import { useState } from 'react'
import html2canvas from 'html2canvas'

export default function PrintButton() {
  const [isCopying, setIsCopying] = useState(false)

  const copyImage = async () => {
    setIsCopying(true)
    try {
      const element = document.getElementById('impact-report-card')
      if (!element) return
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      canvas.toBlob(async (blob) => {
        if (blob) {
          const item = new ClipboardItem({ 'image/png': blob })
          await navigator.clipboard.write([item])
          alert('✅ Report copied to clipboard! You can now paste it anywhere.')
        }
      })
    } catch (error) {
      alert('Failed to copy image.')
    }
    setIsCopying(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <button 
        onClick={copyImage} 
        disabled={isCopying}
        className="bg-shikho-magenta-500 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-shikho-magenta-600 transition-transform hover:scale-105"
      >
        {isCopying ? '⏳ Copying...' : '📋 Copy as Picture'}
      </button>
      <button 
        onClick={() => window.print()} 
        className="bg-gray-800 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-black transition-transform hover:scale-105"
      >
        🖨️ Save as PDF
      </button>
    </div>
  )
}
