import { useState, useRef, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import RelatedCards from "../components/RelatedCards";
import { ArrowLeft, ArrowRight, Share2, Check, Twitter, MessageCircle, Linkedin, Link2 } from "lucide-react";
import {
  getArticleById,
  getNextArticle,
  getPrevArticle,
} from "../articles";

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const article = id ? (getArticleById(id) ?? null) : null;
  const loading = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = article?.meta as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ArticleComponent = article?.component as any;

  const nextArticle = meta ? getNextArticle(meta.id) : null;
  const prevArticle = meta ? getPrevArticle(meta.id) : null;

  const shareUrl = window.location.href;
  const shareTitle = meta?.title ?? "Plutus Cheatsheet";
  const copyText = [meta?.title, meta?.subtitle, shareUrl].filter(Boolean).join("\n");

  const executeCopy = () => {
    navigator.clipboard?.writeText(copyText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleMainShareClick = () => {
    if (!showShareMenu) {
      executeCopy();
      setShowShareMenu(true);
    } else {
      setShowShareMenu(false);
    }
  };

  const handleDropdownCopyClick = () => {
    executeCopy();
    setTimeout(() => {
      setShowShareMenu(false);
    }, 2000);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* HERO */}
      <header className="mb-8">
        <div className="mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            {meta?.title ?? "Article"}
          </h1>

          {meta?.subtitle && (
            <p className="mt-3 text-slate-600">{meta.subtitle}</p>
          )}

          {meta && (
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                {meta.author?.avatar && (
                  <img
                    src={meta.author.avatar}
                    alt={meta.author.name}
                    className="h-10 w-10 rounded-full object-cover border"
                  />
                )}

                <div className="text-sm">
                  <div className="font-medium text-slate-800">
                    {meta.author?.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(meta.date).toLocaleDateString()} •{" "}
                    {meta.readTime}
                  </div>
                </div>

                <div className="ml-4 hidden sm:flex items-center gap-2">
                  <span className="px-2 py-1 rounded-sm bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs">
                    {meta.plutusVersion}
                  </span>

                  <span className="px-2 py-1 rounded-sm bg-orange-50 text-orange-700 border border-orange-200 font-semibold text-xs">
                    {meta.complexity}
                  </span>

                  <span className="px-2 py-1 rounded-sm bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-xs">
                    {meta.useCase}
                  </span>

                  {meta.tags?.map((t: string) => (
                    <span
                      key={t}
                      className="px-2 py-1 rounded-sm bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative" ref={shareMenuRef}>
                <button
                  onClick={handleMainShareClick}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" /> <span className="text-green-600 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 text-slate-600" /> <span className="text-slate-700 font-medium">Share</span>
                    </>
                  )}
                </button>

                {showShareMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-2 top-full">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowShareMenu(false)}
                    >
                      <Twitter className="h-4 w-4 text-sky-500" /> X (Twitter)
                    </a>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + " " + shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowShareMenu(false)}
                    >
                      <MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp
                    </a>
                    <a
                      href={`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowShareMenu(false)}
                    >
                      <span className="text-orange-500 font-bold w-4 text-center mr-[-4px]">r/</span> Reddit
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowShareMenu(false)}
                    >
                      <Linkedin className="h-4 w-4 text-blue-600" /> LinkedIn
                    </a>
                    <div className="my-1 border-t border-slate-100"></div>
                    <button
                      onClick={handleDropdownCopyClick}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" /> <span className="text-green-600 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4 text-slate-600" /> Copy Link
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ARTICLE */}
        <article className="prose prose-slate max-w-none lg:col-span-8 xl:col-span-9 rounded-lg bg-white p-6 shadow-md outline outline-black/5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 mb-4"
          >
            ← Back to Home
          </Link>

          {/* CONTENT */}
          <div className="mt-6">
            {loading ? (
              <div className="py-20 text-center text-slate-500">
                Loading article…
              </div>
            ) : !article ? (
              <div className="py-20 text-center">
                <h2 className="text-xl font-semibold text-slate-800">
                  Article not found
                </h2>
                <p className="mt-2 text-slate-500">
                  The article you’re looking for doesn’t exist or was moved.
                </p>

                <Link
                  to="/"
                  className="inline-block mt-6 text-sm text-orange-600 hover:underline"
                >
                  ← Go back to homepage
                </Link>
              </div>
            ) : (
              <ArticleComponent />
            )}
          </div>

          {/* PREV / NEXT */}
          {article && (
            <div className="mt-10 flex items-center justify-between gap-4">
              {prevArticle ? (
                <Link
                  to={`/article/${prevArticle.meta.id}`}
                  className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 border rounded-md px-4 py-2 bg-white max-w-[45%]"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {prevArticle.meta.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}

              {nextArticle ? (
                <Link
                  to={`/article/${nextArticle.meta.id}`}
                  className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 border rounded-md px-4 py-2 bg-white max-w-[45%] ml-auto"
                >
                  <span className="truncate">
                    {nextArticle.meta.title}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </article>

        {/* SIDEBAR */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="hidden lg:block sticky top-24 space-y-6">
            <div className="border rounded-md p-4 bg-white shadow-sm">
              <div className="text-sm font-semibold mb-3">
                Related
              </div>
              <RelatedCards limit={3} />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
