import json
import re
import unicodedata
import joblib

from functools import lru_cache
from pathlib import Path

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "nlu_model.pkl"
DATA_PATH = BASE_DIR / "training_data.json"

def normalize(text: str) -> str:
    text = text.lower().strip()
    text = unicodedata.normalize("NFD", text)
    return "".join(
        char for char in text
        if unicodedata.category(char) != "Mn"
    )


def train_model():
    with open(DATA_PATH, encoding="utf-8") as file:
        data = json.load(file)

    texts = [normalize(item["text"]) for item in data]
    labels = [item["intent"] for item in data]

    model = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(ngram_range=(1,2), sublinear_tf=True)
        ),
        (
            "classifier",
            LinearSVC()
        )
    ])

    model.fit(texts, labels)
    joblib.dump(model, MODEL_PATH)

    return model


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        train_model()

    return joblib.load(MODEL_PATH)


def extract_entities(message: str):
    text = normalize(message)
    entities = {}

    #POTÊNCIA: 1500 WATTS 1500 W
    power = re.search(
        r"(\d+(?:[.,]\d+)?)\s*(kw|quilowatts?|w|watts?)\b",
        text
    )

    if power:
        value = float(power.group(1).replace(",", "."))

        unit = power.group(2)
        if unit.startswith("kw") or unit.startswith("quilo"):
            value *= 1000

        entities["potencia_watts"] = value

    time = re.search(
        r"(\d+(?:[.,]\d+)?)\s*(minutos?|mins?|horas?|h)\b",
        text
    )

    if time:
        value = float(time.group(1).replace(",", "."))

        unit = time.group(2)
        if unit.startswith("min"):
            value /= 60

        entities["hours_per_day"] = value

    devices = {
        "ar condicionado": "ar-condicionado",
        "chuveiro": "chuveiro",
        "geladeira": "geladeira",
        "televisao": "televisao",
        "microondas": "microondas",
        "micro ondas": "microondas",
        "ventilador": "ventilador",
        "computador": "computador"
    }

    for device, normalized_device in devices.items():
        if normalize(device) in text:
            entities["device"] = normalized_device
            break

    days = re.search(
        r"(\d+)\s*dias?\s*(?:por|no)\s*mes",
        text
    )
    if days:
        entities["days_per_month"] = int(days.group(1))

    return entities


def process_message(message: str):
    model = load_model()
    normalized = normalize(message)

    # O MODELO RECEBE UMA FRASE E IDENTIFICA A INTENÇÃO MAIS PROVÁVEL ENTRE AS CATEGORIAS
    intent = model.predict([normalized])[0]

    # AQUI BUSCAMOS INFORMAÇÕES IMPORTANTES DA FRASE, COMO POTÊNCIA, TEMPO E DISPOSITIVO
    entities = extract_entities(message)

    return {
        "intent": intent,
        "entities": entities
    }