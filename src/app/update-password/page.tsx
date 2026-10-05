import Image from "next/image"
import { updatePasswordAction } from "./actions"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function UpdatePasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen items-center justify-center bg-shikho-canvas p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lift border border-gray-100">
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="Shikho Logo" width={120} height={40} priority className="object-contain" />
        </div>
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 font-poppins mb-1">Set New Password</h1>
          <p className="text-sm text-gray-500 font-poppins">Please change your temporary password to secure your account.</p>
        </div>
        
        <form action={updatePasswordAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">New Password</label>
            <input type="password" name="newPassword" required minLength={6} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-shikho-indigo-500 text-sm" placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Confirm Password</label>
            <input type="password" name="confirmPassword" required minLength={6} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-shikho-indigo-500 text-sm" placeholder="Re-enter new password" />
          </div>
          
          {searchParams?.error && (
            <p className="text-red-600 text-xs font-poppins text-center bg-red-50 py-2 rounded-md">{searchParams.error}</p>
          )}
          
          <button type="submit" className="w-full bg-shikho-indigo-600 text-white py-3 px-4 rounded-lg font-poppins font-bold hover:bg-shikho-indigo-700 transition-colors mt-2">
            Update & Continue
          </button>
        </form>
      </div>
    </div>
  )
}
