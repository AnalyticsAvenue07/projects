import React from 'react';

const ProjectDetailCard = () => {
  return (
    <div className="project-detail-card border rounded-lg p-8 shadow-lg bg-white">
      <h1 className="text-2xl font-bold mb-4">Real Estate Intelligence Suite</h1>
      <p className="mb-4 text-gray-700">
        The Real Estate Intelligence Suite provides advanced analytics and AI-driven insights for real estate professionals. Features include:
      </p>
      <ul className="list-disc pl-6 mb-4 text-gray-700">
        <li>Property value prediction</li>
        <li>Market trend analysis</li>
        <li>Investment opportunity identification</li>
        <li>Automated document processing</li>
        <li>Customizable dashboards</li>
      </ul>
      <div className="mt-6">
        <a href="/projects/real-estate-intelligence-suite/section" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
          Go to Project Section
        </a>
      </div>
    </div>
  );
};

export default ProjectDetailCard;
