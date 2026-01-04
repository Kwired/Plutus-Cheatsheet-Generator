// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import { Routes, Route } from "react-router-dom";
import './App.css'
import Index from './pages/Index'
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// import ArticlePage from "./pages/ArticlePage";

function App() {
  // const [count, setCount] = useState(0)
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return (
    <>
    {/* <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/article/:id" element={<ArticlePage />} />
    </Routes> */}
   <Index/>
    </>
  )
}

export default App
