import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router';
import LoginPage from './pages/Login/LoginPage.jsx';
import Register from './pages/Register/Register.jsx';
import Home from './pages/Home/HomePage.jsx';
import Chatbot from './pages/Chatbot/Chatbot.jsx';
import './App.css'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path='*' element={ <LoginPage /> } />
                <Route path="/" element={ <LoginPage /> } />
                <Route path="/register" element={ <Register /> } />
                <Route path="/home" element={ <Home />} />
                <Route path="/chatbot" element={ <Chatbot casaId="123" /> } />
            </Routes>
        </BrowserRouter>
    )
}

export default App
