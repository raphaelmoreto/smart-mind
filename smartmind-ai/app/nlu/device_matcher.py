from difflib import SequenceMatcher

from app.nlu.text import limpar

# A PARTIR DE QUAL NOTA CONSIDERAMOS QUE É O MESMO APARELHO (AJUSTE TESTANDO)
LIMIAR_SIMILARIDADE = 0.82

# PALAVRAS CURTAS ("tv", "pc", "ar") SÓ VALEM SE FOREM EXATAS
TAMANHO_MINIMO_APROXIMADO = 4

# USADO QUANDO A API NÃO MANDA O CATÁLOGO (EX.: TESTE DIRETO NO /docs DO PYTHON)
CATALOGO_PADRAO = {
    "types": [
        {"id": None, "nome": "ar condicionado", "sinonimos": ["split"]},
        {"id": None, "nome": "chuveiro", "sinonimos": ["ducha"]},
        {"id": None, "nome": "geladeira", "sinonimos": ["refrigerador", "freezer"]},
        {"id": None, "nome": "televisao", "sinonimos": ["televisor", "tv"]},
        {"id": None, "nome": "microondas", "sinonimos": ["micro ondas"]},
        {"id": None, "nome": "ventilador", "sinonimos": []},
        {"id": None, "nome": "computador", "sinonimos": ["notebook", "pc"]},
    ],
    "devices": [],
}


def _similaridade(trecho: str, termo: str) -> float:
    if trecho == termo:
        return 1.0
    if len(termo) < TAMANHO_MINIMO_APROXIMADO:
        return 0.0
    return SequenceMatcher(None, trecho, termo).ratio()


def _melhor_nota(palavras: list[str], termo: str) -> float:
    """compara o termo com todos os trechos da frase de tamanho parecido"""
    tamanho = len(termo.split())
    melhor = 0.0
    for n in {max(1, tamanho - 1), tamanho, tamanho + 1}:
        for inicio in range(len(palavras) - n + 1):
            trecho = " ".join(palavras[inicio:inicio + n])
            melhor = max(melhor, _similaridade(trecho, termo))
    return melhor


def encontrar_dispositivo(mensagem: str, catalog: dict | None = None) -> dict:
    catalog = catalog or CATALOGO_PADRAO
    palavras = limpar(mensagem).split()
    if not palavras:
        return {}

    melhor = None  # ((nota, especifico), entidade)

    def considerar(nota: float, especifico: int, entidade: dict):
        nonlocal melhor
        if nota < LIMIAR_SIMILARIDADE:
            return
        chave = (nota, especifico)  # EMPATE → APARELHO CADASTRADO GANHA DO TIPO GENÉRICO
        if melhor is None or chave > melhor[0]:
            melhor = (chave, entidade)

    # 1) APARELHOS QUE O USUÁRIO CADASTROU ("AR CONDICIONADO DA SALA")
    for device in catalog.get("devices", []):
        considerar(
            _melhor_nota(palavras, limpar(device["nome"])),
            1,
            {"device": device["nome"].lower(), "device_id": device["id"], "device_type_id": device.get("tipo_id")},
        )

    # 2) TIPOS DO BANCO + SINÔNIMOS
    for tipo in catalog.get("types", []):
        for termo in [tipo["nome"], *tipo.get("sinonimos", [])]:
            termo_limpo = limpar(termo)
            if termo_limpo:
                considerar(
                    _melhor_nota(palavras, termo_limpo),
                    0,
                    {"device": limpar(tipo["nome"]), "device_type_id": tipo["id"]},
                )

    if melhor is None:
        return {}

    (nota, _), entidade = melhor
    entidade = {chave: valor for chave, valor in entidade.items() if valor is not None}

    # 3) ACHOU SÓ O TIPO E A CASA TEM EXATAMENTE 1 APARELHO DESSE TIPO → LIGA AO APARELHO
    if "device_id" not in entidade and "device_type_id" in entidade:
        mesmos = [d for d in catalog.get("devices", []) if d.get("tipo_id") == entidade["device_type_id"]]
        if len(mesmos) == 1:
            entidade["device_id"] = mesmos[0]["id"]
            entidade["device"] = mesmos[0]["nome"].lower()

    entidade["device_score"] = round(nota, 3)
    return entidade