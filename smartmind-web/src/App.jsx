
import { useState } from 'react';
import LoginPage from './pages/Login/LoginPage.jsx';
import { authService } from './services/authService.js';
import './App.css';

export default function App() {
    const [user, setUser] = useState(() =>
        authService.getCurrentUser()
    );

    function handleLogout() {
        authService.logout();
        setUser(null);
    }

    if (user) {
        return (
            <main className="app-home">
                <section className="app-home-card">
                    <div className="app-home-icon">✓</div>

                    <h1>Bem-vindo, {user.nome}!</h1>

                    <p>
                        Você está autenticado no sistema.
                    </p>

                    <span className="app-user-role">
                        Perfil: {user.role}
                    </span>

                    <button
                        className="app-logout-button"
                        onClick={handleLogout}
                    >
                        Sair da conta
                    </button>
                </section>
            </main>
        );
    }

    return <LoginPage onLogin={setUser} />;
}
