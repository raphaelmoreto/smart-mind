import "./Register.css";

import { useState } from "react";
import { Link } from "react-router";

export default function Register() {
    const [formData, setFormData] = useState({
        nome: "",
        email: "",
        celular: "",
        usuario: "",
        senha: "",
        confirmarSenha: "",
        aceitaTermos: false,
    });

    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [mostrarConfSenha, setMostrarConfSenha] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.senha !== formData.confirmarSenha) {
            alert("As senhas não coincidem!");
            return;
        }
        console.log("Dados de cadastro:", formData);
    };

    return (
        <div className="app-container">
            <div className="card-container">
                <div className="logo-box">
                    <svg
                        className="logo-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M9 10a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                {/* Títulos */}
                <h1 className="title">Crie sua conta</h1>
                <p className="subtitle">Preencha os dados para começar</p>

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="form-grid">
                    <div className="form-group">
                        <label>Nome completo</label>
                        <input
                            type="text"
                            name="nome"
                            placeholder="Seu nome completo"
                            value={formData.nome}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>E-mail</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="Seu e-mail"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Celular</label>
                        <input
                            type="tel"
                            name="celular"
                            placeholder="(XX) XXXXX-XXXX"
                            value={formData.celular}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Nome de usuário</label>
                        <input
                            type="text"
                            name="usuario"
                            placeholder="Escolha um usuário"
                            value={formData.usuario}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Senha</label>
                        <div className="password-wrapper">
                            <input
                                type={mostrarSenha ? "text" : "password"}
                                name="senha"
                                placeholder="••••••••"
                                value={formData.senha}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() => setMostrarSenha(!mostrarSenha)}
                            >
                                👁️
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Confirme sua senha</label>
                        <div className="password-wrapper">
                            <input
                                type={mostrarConfSenha ? "text" : "password"}
                                name="confirmarSenha"
                                placeholder="••••••••"
                                value={formData.confirmarSenha}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() =>
                                    setMostrarConfSenha(!mostrarConfSenha)
                                }
                            >
                                👁️
                            </button>
                        </div>
                    </div>

                    <div className="terms-container">
                        <input
                            type="checkbox"
                            id="aceitaTermos"
                            name="aceitaTermos"
                            checked={formData.aceitaTermos}
                            onChange={handleChange}
                            required
                        />
                        <label htmlFor="aceitaTermos">
                            Eu li e aceito os <a href="#">Termos de Uso</a> e{" "}
                            <a href="#">Política de Privacidade</a>
                        </label>
                    </div>

                    <button type="submit" className="btn-primary">
                        Cadastrar
                    </button>
                </form>

                {/* Divisor */}
                <div className="divider">
                    <span>ou</span>
                </div>

                {/* Login com Google */}
                <button type="button" className="btn-google">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                    </svg>
                    Entrar com Google
                </button>

                <p className="footer-text">
                    Já tem uma conta?
                    <Link to={"/"}>Entrar</Link>
                </p>
            </div>
        </div>
    );
}
