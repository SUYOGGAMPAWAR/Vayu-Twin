import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-[#080b13] flex justify-center py-12 px-4 font-sans">
      <div className="w-full max-w-md space-y-8">
        
        {/* --- CARD 03 (HCHO Hotspots) --- */}
        <div className="bg-[#422c1e] rounded-sm p-5 flex flex-col gap-4">
          <div className="flex justify-between items-start mb-2">
            {/* Hollow Orange Text Effect */}
            <span 
              className="text-4xl font-light tracking-wide text-transparent"
              style={{ WebkitTextStroke: '1.5px #f97316' }} 
            >
              03
            </span>
            <ArrowUpRight className="text-[#f97316] w-6 h-6 stroke-[2]" />
          </div>
          
          {/* Image Placeholder */}
          <div className="w-full h-32 bg-[#e5e7eb] rounded overflow-hidden flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 opacity-80" />
            <span className="text-slate-900 font-bold z-10 text-sm">Heatmap Image</span>
          </div>

          <p className="text-[#e2e8f0] text-lg leading-snug pr-4">
            Development of Surface AQI & Identification of HCHO Hotspots over India using Satellite Data
          </p>
        </div>

        {/* --- CARD 05 (Digital Twin) --- */}
        <div className="bg-[#422c1e] rounded-sm p-5 flex flex-col gap-4">
          <div className="flex justify-between items-start mb-2">
            {/* Hollow Orange Text Effect */}
            <span 
              className="text-4xl font-light tracking-wide text-transparent"
              style={{ WebkitTextStroke: '1.5px #f97316' }} 
            >
              05
            </span>
            <ArrowUpRight className="text-[#f97316] w-6 h-6 stroke-[2]" />
          </div>
          
          {/* Image Placeholder */}
          <div className="w-full h-32 bg-[#0ea5e9] rounded overflow-hidden flex items-center justify-center relative">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-cyan-400 opacity-90" />
             <span className="text-white font-bold z-10 text-sm">Climate Twin Image</span>
          </div>

          <p className="text-[#e2e8f0] text-lg leading-snug pr-4">
            AI-Powered Digital Twin of India's Climate using India's National Data
          </p>
        </div>

        {/* --- START OF CARD 06 (To show the blue theme) --- */}
        <div className="bg-[#0f172a] rounded-t-sm p-5 flex flex-col gap-4 border-t border-slate-800">
           <div className="flex justify-between items-start">
            {/* Hollow Blue Text Effect */}
            <span 
              className="text-4xl font-light tracking-wide text-transparent"
              style={{ WebkitTextStroke: '1.5px #3b82f6' }} 
            >
              06
            </span>
            <ArrowUpRight className="text-[#3b82f6] w-6 h-6 stroke-[2]" />
          </div>
        </div>

      </div>
    </div>
  );
}
