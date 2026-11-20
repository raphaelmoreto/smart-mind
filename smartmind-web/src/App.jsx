import './App.css';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router';
import EnergyLayout from './components/energy/EnergyLayout.jsx';
import ProtectedRoute from './components/protected-route/ProtectedRoute.jsx';
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

        <Route
          element={
            <ProtectedRoute>
              <EnergyLayout>
                <Outlet />
              </EnergyLayout>
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/dispositivos" element={<DevicesPage />} />
          <Route path="/ambientes" element={<RoomsPage />} />
          <Route path="/energia" element={<EnergyPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/chatbot" element={<Chatbot />} />
        </Route>

        <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}