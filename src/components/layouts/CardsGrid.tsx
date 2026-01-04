import React, { useMemo, useState } from "react";
import CardItem from "./CardItem";
import type { CardData } from "./CardItem";
import Pagination from "./Pagination";

/**
 * Replace the sampleData below with your real list from API / props.
 */
const sampleData: CardData[] = [
];

export default function CardsGrid({ cards = sampleData }: { cards?: CardData[] }) {

    const [page, setPage] = useState(1);
    const perPage = 12; // matches your screenshot that shows "1 to 6 of 9"

    const total = cards.length;
    const totalPages = Math.ceil(total / perPage);

    // slice current page
    const visible = useMemo(() => {
        const start = (page - 1) * perPage;
        return cards.slice(start, start + perPage);
    }, [cards, page]);

    // ensure page is valid when data changes
    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages || 1);
    }, [totalPages, page]);

    
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* <h2 className="text-center text-xl font-semibold mb-8">Related Examples</h2> */}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* {cards.map((c) => ( */}
        {visible.map((c) => (
          <CardItem key={c.id} card={c} />
        ))}
      </div>

      {/* Pagination block just after cards */}
      <div className="mt-8">
        <Pagination
          total={total}
          page={page}
          perPage={perPage}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </section>
  );
}
