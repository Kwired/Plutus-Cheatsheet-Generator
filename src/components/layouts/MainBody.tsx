// src/components/layouts/MainBody.tsx
import { useState, useMemo } from "react";
import Search from "./Search";
import CardItem from "./CardItem";
import Pagination from "./Pagination";
import { getAllArticles } from "../../articles";

function MainBody() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const perPage = 12;

  const allArticles = useMemo(() => {
    return getAllArticles().map(meta => ({
      id: meta.id,
      title: meta.title,
      description: meta.subtitle || "A Plutus code",
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop",
      author: "wired",
      timeLabel: new Date(meta.date).toLocaleDateString(),
      views: "1.5k",
      readtime: meta.readTime,

    }));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return allArticles;
    const q = query.toLowerCase();
    return allArticles.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [allArticles, query]);

  const total = filtered.length;

  const visible = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  return (
    <>
      <h2 className="text-3xl font-bold">Plutus CheatSheet</h2>
      <p className="font-light text-[#7d7d7d]">
        Search through Plutus code example and snippets
      </p>

      <div className="mt-4">
        <Search value={query} onChange={handleSearch} />
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 min-h-[220px]">
        {visible.length === 0 ? (
          // <div className="  text-slate-500">
            <p className="min-w-[300px]">
              No articles found. 
            </p>
          // </div>
        ) : (
          visible.map(card => (
            <CardItem key={card.id} card={card} />
          ))
        )}
      </div>

      {total > perPage && (
        <div className="mt-8">
          <Pagination
            total={total}
            page={page}
            perPage={perPage}
            onPageChange={setPage}
          />
        </div>
      )}
    </>
  );
}

export default MainBody;
