import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24 bg-shikho-canvas">
      <div className="bg-white p-10 rounded-2xl shadow-lift text-center max-w-lg w-full border border-gray-100">
        
        {/* Shikho Official Logo */}
        <div className="flex justify-center mb-6">
          <Image 
            src="/logo.png" 
            alt="Shikho Logo" 
            width={160} 
            height={50} 
            priority 
            className="object-contain"
          />
        </div>

        {/* Correct Slogan */}
        <h1 className="text-3xl font-bold text-shikho-indigo-600 mb-2 font-bengali">
          শিখবো, জিতবো।
        </h1>
        
        <h2 className="text-lg font-poppins font-semibold text-gray-800 mb-4">
          Agent Evaluation & QA Intelligence Platform
        </h2>

        <p className="text-sm text-gray-600 mb-8 font-poppins leading-relaxed">
          Internal enterprise platform for Shikho’s Training, Quality Assurance, and Telesales teams.
        </p>

        <Link 
          href="/login" 
          className="inline-block w-full bg-shikho-indigo-600 text-white py-3.5 px-6 rounded-lg font-poppins font-medium hover:bg-shikho-indigo-700 transition-colors shadow-ambient"
        >
          Go to Login / ড্যাশবোর্ড প্রবেশ করুন
        </Link>
      </div>

      <div className="mt-8 text-xs text-gray-500 font-poppins">
        © 2026 Cross Border Education Technologies Pte. Ltd. (Shikho)
      </div>
    </div>
  );
}
