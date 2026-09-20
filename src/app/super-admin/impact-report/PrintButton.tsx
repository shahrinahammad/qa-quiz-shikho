'use client'

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="bg-shikho-magenta-500 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-shikho-magenta-600 transition-transform hover:scale-105"
    >
      🖨️ Print / Save as Image
    </button>
  )
}
