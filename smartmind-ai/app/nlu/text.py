import re
import unicodedata

# PALAVRAS QUE NÃO AJUDAM A IDENTIFICAR O APARELHO
PALAVRAS_VAZIAS = {
    "o", "a", "os", "as", "do", "da", "dos", "das", "de", "meu", "minha",
    "meus", "minhas", "um", "uma", "no", "na", "nos", "nas", "em", "por",
    "para", "pra", "com", "e", "esse", "essa", "este", "esta", "seu", "sua",
}


def normalize(text: str) -> str:
    """minúsculas, sem acento, hífen vira espaço, espaços simples"""
    text = text.lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[-_]", " ", text)
    return re.sub(r"\s+", " ", text)


def limpar(text: str) -> str:
    """normalize + sem pontuação + sem palavras vazias (usado para comparar nomes de aparelhos)"""
    text = re.sub(r"[^\w\s]", " ", normalize(text))
    return " ".join(palavra for palavra in text.split() if palavra not in PALAVRAS_VAZIAS)