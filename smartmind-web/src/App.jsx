import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router';

import LoginPage from './pages/Login/LoginPage.jsx';
import Register from './pages/Register/Register.jsx';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path='*' element={ <LoginPage /> } />
                <Route path="/" element={ <LoginPage /> } />
                <Route path="/register" element={ <Register /> } />
            </Routes>
        </BrowserRouter>
    )
}
