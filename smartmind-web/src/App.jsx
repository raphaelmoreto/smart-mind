import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router';
import EnergyLayout from './components/energy/EnergyLayout.jsx';
import DevicesPage from './pages/Dispositivos/DevicesPage.jsx';
import RoomsPage from './pages/Ambientes/RoomsPage.jsx';
import EnergyPage from './pages/Energia/EnergyPage.jsx';
import SettingsPage from './pages/Configuracoes/SettingsPage.jsx';
import LoginPage from './pages/Login/LoginPage.jsx';
import Register from './pages/Register/Register.jsx';
import Home from './pages/Home/HomePage.jsx';
import Chatbot from './pages/Chatbot/Chatbot.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<EnergyLayout><Home /></EnergyLayout>} />
        <Route path="/dispositivos" element={<EnergyLayout><DevicesPage /></EnergyLayout>} />
        <Route path="/ambientes" element={<EnergyLayout><RoomsPage /></EnergyLayout>} />
        <Route path="/energia" element={<EnergyLayout><EnergyPage /></EnergyLayout>} />
        <Route path="/configuracoes" element={<EnergyLayout><SettingsPage /></EnergyLayout>} />
        <Route path="/chatbot" element={<Chatbot casaId="123" />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}
