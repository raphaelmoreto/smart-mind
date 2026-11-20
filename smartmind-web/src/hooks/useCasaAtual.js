import { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService.js';
import { casaService } from '../services/casaService.js';

const CHAVE_CASA = 'casaAtualId';

export function useCasaAtual() {
    const usuario = authService.getCurrentUser();
    const usuarioId = usuario?.id;

    const [casas, setCasas] = useState([]);
    const [casaAtual, setCasaAtual] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');

    const carregar = useCallback(async () => {
        if (!usuarioId) {
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro('');

        try {
            const lista = (await casaService.buscarPorUsuario(usuarioId)) ?? [];
            const idSalvo = Number(sessionStorage.getItem(CHAVE_CASA));
            const escolhida = lista.find((casa) => casa.id === idSalvo) ?? lista[0] ?? null;

            setCasas(lista);
            setCasaAtual(escolhida);

            if (escolhida) sessionStorage.setItem(CHAVE_CASA, String(escolhida.id));
        } catch (error) {
            setErro(error.message || 'Não foi possível carregar suas casas.');
        } finally {
            setCarregando(false);
        }
    }, [usuarioId]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    const selecionarCasa = useCallback((id) => {
        const casa = casas.find((item) => item.id === Number(id)) ?? null;
        setCasaAtual(casa);
        if (casa) sessionStorage.setItem(CHAVE_CASA, String(casa.id));
    }, [casas]);

    return { usuario, casas, casaAtual, carregando, erro, recarregar: carregar, selecionarCasa };
}