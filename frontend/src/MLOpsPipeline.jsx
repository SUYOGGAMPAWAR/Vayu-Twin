import React from 'react';
import { Database, BrainCircuit, FileJson, Server, Map } from 'lucide-react';

const MLOpsPipeline = () => {
  const steps = [
    {
      id: 1,
      title: "Automated Spatial Ingestion",
      description: "Pulls multi-pollutant trace elements (Vertical Column Density) and meteorological data points from Sentinel-5P and Open-Meteo APIs.",
      icon: <Database className="w-5 h-5 text-blue-400" />
    },
    {
      id: 2,
      title: "Scheduled Inference",
      description: "A localized Random Forest ML regression model combines atmospheric inputs with weather indicators, running autonomously in the background.",
      icon: <BrainCircuit className="w-5 h-5 text-purple-400" />
    },
    {
      id: 3,
      title: "Data Bridge",
      description: "The AQI output is saved into a persistent JSON state, allowing decoupled layers to read the data without triggering heavy model re-runs.",
      icon: <FileJson className="w-5 h-5 text-green-400" />
    },
    {
      id: 4,
      title: "FastAPI Serving",
      description: "A lightweight REST API strictly handles HTTP requests and CORS, ensuring zero dashboard lag and total separation from the ingestion layer.",
      icon: <Server className="w-5 h-5 text-red-400" />
    },
    {
      id: 5,
      title: "Geospatial Rendering",
      description: "React and Leaflet dynamically consume the API to map raw numerical output into clear, color-coded surface AQI risk categories.",
      icon: <Map className="w-5 h-5 text-yellow-400" />
    }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-[#0B1120] rounded-xl border border-gray-800 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-2">VayuTwin Architecture</h2>
      <p className="text-gray-400 mb-8 text-sm">
        A decoupled, multi-tier microservice architecture designed for resource efficiency and zero-lag live updates.
      </p>

      <div className="relative border-l border-gray-700 ml-3">
        {steps.map((step, index) => (
          <div key={step.id} className="mb-10 ml-8 relative group">
            {/* Timeline Node */}
            <div className="absolute -left-11 mt-1 bg-gray-900 border-2 border-gray-700 rounded-full p-1.5 z-10 group-hover:border-blue-500 transition-colors duration-300">
              {step.icon}
            </div>
            
            {/* Content Card */}
            <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700/50 hover:bg-gray-800 transition-colors duration-300">
              <div className="flex items-center mb-2">
                <span className="text-xs font-bold text-gray-500 mr-3 px-2 py-1 bg-gray-900 rounded-md">
                  STEP 0{step.id}
                </span>
                <h3 className="text-lg font-semibold text-gray-200">{step.title}</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MLOpsPipeline;
