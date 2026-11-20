import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "nlu_model.pkl"
DATA_PATH = BASE_DIR / "training_data.json"

# NOME PADRONIZADO -> FORMAS QUE O USUÁRIO PODE ESCREVER (JÁ NORMALIZADAS)
DEVICES = {
    "ar-condicionado": ["ar condicionado", "split"],
    "chuveiro": ["chuveiro", "ducha"],
    "geladeira": ["geladeira", "refrigerador", "freezer"],
    "televisao": ["televisao", "televisor", "tv"],
    "microondas": ["microondas", "micro ondas"],
    "ventilador": ["ventilador"],
    "computador": ["computador", "notebook", "pc"],
    "maquina de lavar": ["maquina de lavar", "lavadora"],
    "ferro de passar": ["ferro de passar"],
}


def normalize(text: str) -> str:
    text = text.lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[-_]", " ", text)      # "ar-condicionado" -> "ar condicionado"
    return re.sub(r"\s+", " ", text)


def train_model():
    with open(DATA_PATH, encoding="utf-8") as file:
        data = json.load(file)

    texts = [normalize(item["text"]) for item in data]
    labels = [item["intent"] for item in data]

    model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
        # CalibratedClassifierCV DÁ UMA "PROBABILIDADE" PARA CADA INTENÇÃO (predict_proba)
        ("classifier", CalibratedClassifierCV(LinearSVC(), cv=3)),
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

    # POTÊNCIA: "1500 w", "1500 watts", "1,5 kw"
    power = re.search(r"(\d+(?:[.,]\d+)?)\s*(kw|quilowatts?|w|watts?)\b", text)
    if power:
        value = float(power.group(1).replace(",", "."))
        if power.group(2).startswith(("kw", "quilo")):
            value *= 1000
        entities["potencia_watts"] = value

    # TEMPO: "1h30", "2 horas", "30 minutos", "meia hora"
    hour_minute = re.search(r"(\d+)\s*h\s*(\d{1,2})\b", text)
    time = re.search(r"(\d+(?:[.,]\d+)?)\s*(minutos?|mins?|horas?|hrs?|h)\b", text)

    if hour_minute:
        entities["hours_per_day"] = int(hour_minute.group(1)) + int(hour_minute.group(2)) / 60
    elif time:
        value = float(time.group(1).replace(",", "."))
        if time.group(2).startswith("min"):
            value /= 60
        entities["hours_per_day"] = round(value, 4)
    elif "meia hora" in text:
        entities["hours_per_day"] = 0.5

    # APARELHO (PALAVRA INTEIRA PARA "tv" NÃO CASAR DENTRO DE OUTRA PALAVRA)
    for normalized_device, terms in DEVICES.items():
        if any(re.search(rf"\b{re.escape(term)}\b", text) for term in terms):
            entities["device"] = normalized_device
            break

    days = re.search(r"(\d+)\s*dias?\s*(?:por|no|ao)\s*mes", text)
    if days:
        entities["days_per_month"] = int(days.group(1))

    return entities


def process_message(message: str):
    model = load_model()
    normalized = normalize(message)

    probabilities = model.predict_proba([normalized])[0]
    index = int(probabilities.argmax())

    return {
        "intent": str(model.classes_[index]),
        "confidence": round(float(probabilities[index]), 3),
        "entities": extract_entities(message),
    }