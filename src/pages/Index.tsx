import MainBody from '@/components/layouts/MainBody'
import Navbar from '../components/layouts/Navbar'
// import Search from '@/components/layouts/Search'
import Footer from '@/components/layouts/Footer'
import { Route, Routes } from 'react-router-dom'
import ArticlePage from './ArticlePage'
function Index() {
  // const [count, setCount] = useState(0)

  return (
    <>
    <div className='min-h-screen flex flex-col'>
      <Navbar/>
      <main className='flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-gray-50 '>
        {/* <h2 className='text-3xl font-bold'>Plutus CheatSheet</h2>
        <p className='font-light text-[#7d7d7d]'>Search through Plutus code example and snippets</p> */}
        {/* <Search/>
        <br /> */}
        {/* <MainBody/> */}
        <Routes>
          <Route path="/" element={<MainBody />} />
          <Route path="/article/:id" element={<ArticlePage />} />
          {/* other routes */}
        </Routes>
        
        <br />
      </main>
      <Footer/>
      </div>
    </>
  )
}

export default Index
