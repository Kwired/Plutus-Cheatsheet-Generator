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
};

export default function CardItem({ card }: { card: CardData }) {
  return (
    <article className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transform hover:-translate-y-1 transition-all duration-150">
      {/* image */}
      {/* <div className="h-40 md:h-44 lg:h-48 w-full bg-gray-100 overflow-hidden">
        <img
          src={card.image}
          alt={card.title}
          className="w-full h-full object-cover"
        />
      </div> */}

      {/* content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          {card.description}
        </p>

        {/* action */}
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            className="px-4 py-2 rounded-md text-sm font-medium bg-[rgba(255,140,0,0.932)] !text-white hover:bg-blue-700 transition-colors"
            aria-label={`View ${card.title}`}>
            {/* View */}
            <Link to={`/article/${card.id}`} className="!text-white">View</Link>
          </button>
          {/* <button
            type="button"
            className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            aria-label={`View ${card.title}`}>
            View
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            aria-label={`View ${card.title}`}>
            View
          </button> */}

          <div className="flex items-center space-x-3 text-xs">
            <span className="inline-flex items-center gap-2 text-gray-500">
              {/* time badge */}
              <span className="px-2 py-1 rounded-full bg-gray-100 border border-gray-200">
                {card.timeLabel ?? "1 year ago"}
              </span>
            </span>

            <span className="inline-flex items-center gap-2 text-gray-500">
              <span className="px-2 py-1 rounded-full bg-gray-100 border border-gray-200">
                {card.readtime ?? "2.9k"}
              </span>
            </span>
          </div>
        </div>

        {/* footer row with author */}
        {/* <div className="mt-4 flex items-center gap-3">
          <img
            src={card.author.avatar ?? "https://i.pravatar.cc/40"}
            alt={card.author.name}
            className="h-8 w-8 rounded-full object-cover border"
          />
          <div className="text-sm">
            <div className="text-slate-800 font-medium">{card.author.name}</div>
            <div className="text-xs text-slate-500">Author</div>
          </div>
        </div> */}
      </div>
    </article>
  );
}
