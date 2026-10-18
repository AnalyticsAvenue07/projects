import React from 'react';
import { useNavigate } from 'react-router';

const RealEstateIntelligenceSuiteDashboardCard = () => {
  const navigate = useNavigate();
  return (
    <div
      className="bg-white border-[1.5px] border-[#CBD5E1] rounded-xl p-5 hover:shadow-[0_4px_16px_rgba(15,23,42,0.12)] hover:border-[#94A3B8] transition-all cursor-pointer flex flex-col justify-between h-full"
      onClick={() => navigate('/projects/real-estate-intelligence-suite')}
      tabIndex={0}
      role="button"
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/projects/real-estate-intelligence-suite'); } }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-[#475569]">#6</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[#1E293B] text-lg leading-tight">Real Estate Intelligence Suite</h3>
            <span className="px-2.5 py-1 text-xs font-bold bg-[#0F766E] text-white rounded-md shadow-sm">New</span>
          </div>
        </div>
      </div>
      <p className="text-[15px] font-medium text-[#475569] mb-4 line-clamp-3 leading-relaxed">
        Unlock actionable insights for real estate investments, property management, and market analysis with AI-powered tools.
      </p>
      <div className="flex items-center flex-wrap gap-2 mb-2">
        <span className="px-2.5 py-1 text-xs font-bold rounded-md border bg-[#EDE9FE] text-[#6D28D9] border-[#C4B5FD]">Gen AI</span>
        <span className="px-2.5 py-1 text-xs font-bold rounded-md border bg-[#E0E7FF] text-[#4338CA] border-[#A5B4FC]">Analytics</span>
        <span className="px-2.5 py-1 text-xs font-bold rounded-md border bg-[#DBEAFE] text-[#1D4ED8] border-[#93C5FD]">AI</span>
        <span className="px-2.5 py-1 text-xs font-bold rounded-md border bg-[#FCE7F3] text-[#BE185D] border-[#F9A8D4]">Automation</span>
      </div>
      <div className="mt-4 pt-3 border-t-[1.5px] border-[#CBD5E1]">
        <span className="text-xs font-semibold text-[#475569]">Updated May 2026</span>
      </div>
      <button
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        onClick={e => { e.stopPropagation(); navigate('/projects/real-estate-intelligence-suite'); }}
      >
        View Full Details
      </button>
    </div>
  );
};

export default RealEstateIntelligenceSuiteDashboardCard;
