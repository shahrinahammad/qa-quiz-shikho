'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

export default function NotificationBell({ 
  notifications, 
  dashboardLink 
}: { 
  notifications: any[], 
  dashboardLink: string 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(notifications.length)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUnreadCount(notifications.length)
  }, [notifications])

  const handleMarkAsRead = () => {
    setUnreadCount(0)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none" 
        title="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden transform transition-all">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm font-poppins">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAsRead}
                className="text-xs text-shikho-indigo-600 font-bold hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-72 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif, idx) => (
                  <div key={idx} className={`p-4 transition-colors ${idx < unreadCount ? 'bg-blue-50/30' : 'bg-white'}`}>
                    <p className="text-xs text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: notif.text }}></p>
                    <p className="text-[10px] text-gray-400 mt-1">{notif.time}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400 text-xs">
                📭 No notifications
              </div>
            )}
          </div>
          
          <Link 
            href={dashboardLink} 
            onClick={() => setIsOpen(false)}
            className="block w-full text-center bg-gray-50 hover:bg-gray-100 text-shikho-indigo-600 text-xs font-bold py-3 border-t border-gray-100 transition-colors"
          >
            View Dashboard &rarr;
          </Link>
        </div>
      )}
    </div>
  )
}
