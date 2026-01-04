// import React from "react";
import { Link, useParams } from "react-router-dom";
import { getAllArticles } from "../articles";

type Props = {
  limit?: number;
};

export default function RelatedCards({ limit = 4 }: Props) {
  const { id: currentId } = useParams<{ id: string }>();

  const related = getAllArticles()
    .filter(article => article.id !== currentId) // exclude current
    .slice(0, limit);

  if (related.length === 0) {
    return (
      <div className="text-sm text-slate-500">
        No related articles
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {related.map(article => (
        <Link
          key={article.id}
          to={`/article/${article.id}`}
          className="flex items-center gap-3 p-3 rounded-md border border-gray-100 bg-white hover:bg-gray-50 hover:shadow-sm transition"
        >
          {/* Avatar */}
          <div className="h-10 w-10 shrink-0 rounded-md bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
            {article.title.charAt(0)}
          </div>

          {/* Text */}
          <div className="text-sm overflow-hidden">
            <div className="font-medium text-slate-800 truncate">
              {article.title}
            </div>
            {article.subtitle && (
              <div className="text-xs text-slate-500 truncate">
                {article.subtitle}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
