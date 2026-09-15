export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24 bg-shikho-canvas">
      <div className="bg-white p-10 rounded-2xl shadow-lift text-center max-w-lg w-full">
        <h1 className="text-h1 text-shikho-indigo-600 mb-2 font-bengali">শিখে জিতো</h1>
        <h2 className="text-xl font-poppins font-semibold text-gray-800 mb-6">
          Shikho Agent Evaluation
        </h2>
        <p className="text-body text-gray-600 mb-8 font-poppins">
          Platform foundation is successfully deployed! Our Next.js setup is working perfectly.
        </p>
        <button className="bg-shikho-indigo-600 text-white px-8 py-3 rounded-lg font-poppins font-medium hover:bg-shikho-indigo-700 transition-colors">
          Go to Login
        </button>
      </div>
    </div>
  );
}
