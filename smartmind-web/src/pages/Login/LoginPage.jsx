
import { useState } from 'react';
import { authService } from '../../services/authService.js';
import logo from '../../assets/logo.png';
import './LoginPage.css';

export default function LoginPage({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();

        if (!username.trim() || !password) {
            setError('Preencha o usuário e a senha.');
            return;
        }

        setLoading(true);
        setError('');
        setNotice('');

        try {
            const result = await authService.login(
                username.trim(),
                password
            );

            authService.saveSession(result);

            onLogin(authService.getCurrentUser());
        } catch (err) {
            setError(
                err.message || 'Não foi possível realizar o login.'
            );
        } finally {
            setLoading(false);
        }
    }

    function showUnavailableFeature(feature) {
        setError('');
        setNotice(`${feature} ainda não está disponível.`);
    }

    return (
        <main className="login-page">
            <section className="login-card">
                <header className="login-heading">
                    <div className="login-logo">
                        <img src={logo} alt="Logo da aplicação" />
                    </div>

                    <h1>Bem-vindo</h1>

                    <p>
                        Entre na sua conta para continuar
                    </p>
                </header>

                <form
                    className="login-form"
                    onSubmit={handleSubmit}
                >
                    <div className="login-field">
                        <label htmlFor="usuario">
                            Usuário
                        </label>

                        <input
                            id="usuario"
                            name="usuario"
                            type="text"
                            placeholder="Digite seu usuário"
                            autoComplete="username"
                            value={username}
                            onChange={event =>
                                setUsername(event.target.value)
                            }
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="senha">
                            Senha
                        </label>

                        <div className="login-password-wrapper">
                            <input
                                id="senha"
                                name="senha"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Digite sua senha"
                                autoComplete="current-password"
                                value={password}
                                onChange={event =>
                                    setPassword(event.target.value)
                                }
                                disabled={loading}
                                required
                            />

                            <button
                                className="password-toggle"
                                type="button"
                                onClick={() =>
                                    setShowPassword(value => !value)
                                }
                                disabled={loading}
                                aria-label={
                                    showPassword
                                        ? 'Ocultar senha'
                                        : 'Mostrar senha'
                                }
                            >
                                {showPassword ? (
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            d="M3 3L21 21M10.6 10.6A2 2 0 0013.4 13.4M9.9 5.2A10.8 10.8 0 0112 5C17 5 21 12 21 12A16 16 0 0118 15.7M6.2 6.2C4.1 7.6 3 9.5 3 9.5S7 17 12 17C13.2 17 14.3 16.7 15.3 16.2"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                        />
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="3"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="login-forgot">
                        <button
                            type="button"
                            onClick={() =>
                                showUnavailableFeature('A recuperação de senha')
                            }
                        >
                            Esqueceu a senha?
                        </button>
                    </div>

                    {error && (
                        <p className="login-message login-error" role="alert">
                            {error}
                        </p>
                    )}

                    {notice && (
                        <p className="login-message login-notice" role="status">
                            {notice}
                        </p>
                    )}

                    <button
                        className="login-submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="login-spinner" />
                                Entrando...
                            </>
                        ) : (
                            'Entrar'
                        )}
                    </button>
                </form>

                <div className="login-divider">
                    <span />
                    <p>ou</p>
                    <span />
                </div>

                <button
                    className="google-login"
                    type="button"
                    disabled={loading}
                    onClick={() =>
                        showUnavailableFeature('O login com Google')
                    }
                >
                    <svg
                        className="google-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                    >
                        <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.65 1.23 9.14 3.24l6.85-6.85C35.7 2.42 30.24 0 24 0 14.64 0 6.4 5.34 2.54 13.09l7.98 6.2C12.25 13.29 17.7 9.5 24 9.5z"
                        />
                        <path
                            fill="#4285F4"
                            d="M46.98 24.5c0-1.59-.14-3.12-.39-4.59H24v9.01h13.01c-.58 3.02-2.3 5.56-4.92 7.28l7.57 5.87C43.91 38.08 46.98 31.83 46.98 24.5z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M10.52 28.89c-.63-1.84-.98-3.8-.98-5.89s.35-4.05.98-5.89l-7.98-6.2C.92 14.75 0 19.24 0 23c0 3.76.92 8.25 2.54 12.09l7.98-6.2z"
                        />
                        <path
                            fill="#34A853"
                            d="M24 48c6.24 0 11.7-2.05 15.6-5.58l-7.57-5.87c-2.11 1.41-4.81 2.25-8.03 2.25-6.3 0-11.75-3.79-13.48-9.12l-7.98 6.2C6.4 42.66 14.64 48 24 48z"
                        />
                    </svg>

                    Entrar com Google
                </button>

                <p className="login-register">
                    Não tem uma conta?

                    <button
                        type="button"
                        onClick={() =>
                            showUnavailableFeature('O cadastro de conta')
                        }
                    >
                        Criar conta
                    </button>
                </p>
            </section>
        </main>
    );
}
