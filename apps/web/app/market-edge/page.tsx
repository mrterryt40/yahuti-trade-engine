"use client"

export default function MarketEdgePage() {
  const handleComingSoon = () => {
    alert("This feature is coming soon! Stay tuned for advanced market analysis tools.");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-yahuti-gold-500 mb-2">Market Edge</h1>
          <p className="text-gray-400">Advanced market analysis and competitive intelligence</p>
        </div>
        
        {/* Action Buttons - Disabled State */}
        <div className="flex gap-3">
          <button 
            onClick={handleComingSoon}
            disabled
            className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed opacity-50 hover:opacity-70 transition-opacity"
            title="Coming Soon"
          >
            Generate Report
          </button>
          <button 
            onClick={handleComingSoon}
            disabled
            className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed opacity-50 hover:opacity-70 transition-opacity"
            title="Coming Soon"
          >
            Find Edge
          </button>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">Market Trends</h3>
          <p className="text-gray-400">Real-time market movement analysis</p>
          <div className="mt-4 text-sm text-yahuti-gold-500">
            🚧 In Development
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">Sector Analysis</h3>
          <p className="text-gray-400">Category performance insights</p>
          <div className="mt-4 text-sm text-yahuti-gold-500">
            🚧 In Development
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">Price Predictions</h3>
          <p className="text-gray-400">AI-powered market forecasting</p>
          <div className="mt-4 text-sm text-yahuti-gold-500">
            🚧 In Development
          </div>
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="bg-yahuti-gold-900/20 border border-yahuti-gold-600/30 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-yahuti-gold-500 mb-4">Market Edge Dashboard</h2>
        <p className="text-gray-300 mb-6">
          Coming soon - Advanced market analysis tools
        </p>
        <p className="text-gray-400 mb-8">
          This feature is under development. We&apos;re building powerful tools for market analysis, 
          competitive intelligence, and trading insights.
        </p>
        
        <button 
          onClick={handleComingSoon}
          className="px-6 py-3 bg-yahuti-gold-600 hover:bg-yahuti-gold-700 text-black font-semibold rounded-lg transition-colors"
        >
          Request Early Access
        </button>
        
        {/* Progress Indicator */}
        <div className="mt-6">
          <div className="text-sm text-gray-400 mb-2">Development Progress</div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-yahuti-gold-600 h-2 rounded-full w-1/3"></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">33% Complete</div>
        </div>
      </div>
    </div>
  );
}