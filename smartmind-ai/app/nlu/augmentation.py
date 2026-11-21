import random


def gerar_erros_digitacao(texto: str, quantidade: int = 2, rng: random.Random | None = None) -> list[str]:
    rng = rng or random.Random(42)
    palavras = texto.split()
    variantes: set[str] = set()

    for _ in range(quantidade * 10):          # LIMITE DE TENTATIVAS
        if len(variantes) >= quantidade or not palavras:
            break

        indice = rng.randrange(len(palavras))
        palavra = palavras[indice]
        if len(palavra) < 4:                  # NÃO ESTRAGA PALAVRAS CURTAS
            continue

        posicao = rng.randrange(1, len(palavra) - 1)
        operacao = rng.choice(["trocar", "apagar", "duplicar"])

        if operacao == "trocar":              # chuveiro -> chuverio
            nova = palavra[:posicao] + palavra[posicao + 1] + palavra[posicao] + palavra[posicao + 2:]
        elif operacao == "apagar":            # condicionado -> condicionao
            nova = palavra[:posicao] + palavra[posicao + 1:]
        else:                                 # geladeira -> geladdeira
            nova = palavra[:posicao] + palavra[posicao] + palavra[posicao:]

        variante = " ".join(palavras[:indice] + [nova] + palavras[indice + 1:])
        if variante != texto:
            variantes.add(variante)

    return list(variantes)