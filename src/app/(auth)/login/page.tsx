import Image from "next/image";
import { login } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: { message: string } }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-shikho-canvas p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lift border border-gray-100">
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="Shikho Logo" width={120} height={40} priority className="object-contain" />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 font-poppins mb-1">Welcome Back</h1>
          <p className="text-sm text-gray-500 font-poppins">Sign in to access your evaluation dashboard</p>
        </div>
        <form action={login} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Email Address</label>
            <input type="email" name="email" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-shikho-indigo-500 font-poppins text-sm" placeholder="agent@shikho.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 font-poppins">Password</label>
            <input type="password" name="password" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-shikho-indigo-500 font-poppins text-sm" placeholder="••••••••" />
          </div>
          {searchParams?.message && (
            <p className="text-shikho-coral-500 text-sm font-poppins text-center bg-red-50 py-2 rounded-md">{searchParams.message}</p>
          )}
          <button type="submit" className="w-full bg-shikho-indigo-600 text-white py-3 px-4 rounded-lg font-poppins font-medium hover:bg-shikho-indigo-700 transition-colors mt-2">Sign In</button>
        </form>
      </div>
    </div>
  );
}
