import { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService.js';
import { casaService } from '../services/casaService.js';

const CHAVE_CASA = 'casaAtualId';

export function useCasaAtual() {
    const usuario = authService.getCurrentUser();
    const usuarioId = usuario?.id;

    const [casas, setCasas] = useState([]);
    const [casaAtual, setCasaAtual] = useState(null);
    const [carregando, setCarregando] = useState(Boolean(usuarioId));
    const [erro, setErro] = useState('');
    const [versao, setVersao] = useState(0);

    useEffect(() => {
        if (!usuarioId) return;
        let ignorar = false;

        async function buscar() {
            try {
                const lista = (await casaService.buscarPorUsuario(usuarioId)) ?? [];
                if (ignorar) return;

                const idSalvo = Number(sessionStorage.getItem(CHAVE_CASA));
                const escolhida = lista.find((casa) => casa.id === idSalvo) ?? lista[0] ?? null;

                setCasas(lista);
                setCasaAtual(escolhida);
                setErro('');
                if (escolhida) sessionStorage.setItem(CHAVE_CASA, String(escolhida.id));
            } catch (error) {
                if (!ignorar) setErro(error.message || 'Não foi possível carregar suas casas.');
            } finally {
                if (!ignorar) setCarregando(false);
            }
        }

        buscar();
        return () => { ignorar = true; };
    }, [usuarioId, versao]);

    const recarregar = useCallback(() => {
        setCarregando(true);
        setErro('');
        setVersao((v) => v + 1);
    }, []);

    const selecionarCasa = useCallback((id) => {
        const casa = casas.find((item) => item.id === Number(id)) ?? null;
        setCasaAtual(casa);
        if (casa) sessionStorage.setItem(CHAVE_CASA, String(casa.id));
    }, [casas]);

    return { usuario, casas, casaAtual, carregando, erro, recarregar: recarregar, selecionarCasa };
}