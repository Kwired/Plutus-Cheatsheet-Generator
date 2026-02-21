// import React from "react";
import { Link } from "react-router-dom";

export type CardData = {
  id: string;
  title: string;
  description: string;
  image: string;
  // author: { name: string; avatar?: string };
  timeLabel?: string;
  views?: string;
  readtime?: string;
  plutusVersion: string;
  complexity: string;
};

export default function CardItem({ card }: { card: CardData }) {
  return (
    <article className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden h-full">
      <div className="p-5 flex flex-col h-full">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3 min-h-[24px]">
          {card.plutusVersion && (
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px] uppercase tracking-wider">
              {card.plutusVersion}
            </span>
          )}
          {card.complexity && (
            <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-semibold text-[11px] uppercase tracking-wider">
              {card.complexity}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 leading-tight">
          {card.title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6 line-clamp-3 flex-grow">
          {card.description}
        </p>

        {/* Action & Meta */}
        <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
          <Link
            to={`/article/${card.id}`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-slate-900 bg-[rgba(255,140,0,0.932)] hover:bg-[#e67e00] hover:text-slate-900 active:bg-[#cc7000] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 transition-all"
          >
            View
          </Link>

          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
            <span>{card.timeLabel}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span>{card.readtime}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
