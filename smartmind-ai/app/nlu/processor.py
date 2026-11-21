import json
import random
import re
from functools import lru_cache
from pathlib import Path

import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.svm import LinearSVC

from app.nlu.augmentation import gerar_erros_digitacao
from app.nlu.device_matcher import encontrar_dispositivo
from app.nlu.text import normalize

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "nlu_model.pkl"
DATA_PATH = BASE_DIR / "training_data.json"

VARIANTES_POR_FRASE = 2


def train_model():
    with open(DATA_PATH, encoding="utf-8") as file:
        data = json.load(file)

    rng = random.Random(42)  # SEMENTE FIXA: O TREINO SAI SEMPRE IGUAL
    textos, rotulos = [], []

    for item in data:
        texto = normalize(item["text"])
        textos.append(texto)
        rotulos.append(item["intent"])

        # FRASES COM ERRO DE DIGITAÇÃO GERADAS AUTOMATICAMENTE
        for variante in gerar_erros_digitacao(texto, VARIANTES_POR_FRASE, rng):
            textos.append(variante)
            rotulos.append(item["intent"])

    model = Pipeline([
        ("features", FeatureUnion([
            # PALAVRAS INTEIRAS E PARES DE PALAVRAS ("quanto gasta")
            ("palavras", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
            # PEDAÇOS DE 2 A 5 LETRAS ("chu", "huve", "veir"): "chuverio" AINDA PARECE "chuveiro"
            ("letras", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True)),
        ])),
        ("classifier", CalibratedClassifierCV(LinearSVC(), cv=3)),
    ])

    model.fit(textos, rotulos)
    joblib.dump(model, MODEL_PATH)
    return model


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        train_model()
    return joblib.load(MODEL_PATH)


def extract_entities(message: str, catalog: dict | None = None):
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

    days = re.search(r"(\d+)\s*dias?\s*(?:por|no|ao)\s*mes", text)
    if days:
        entities["days_per_month"] = int(days.group(1))

    # APARELHO: VEM DO CATÁLOGO DO BANCO, COM TOLERÂNCIA A ERRO
    entities.update(encontrar_dispositivo(message, catalog))

    return entities


def process_message(message: str, catalog: dict | None = None):
    model = load_model()
    normalized = normalize(message)

    probabilities = model.predict_proba([normalized])[0]
    index = int(probabilities.argmax())

    return {
        "intent": str(model.classes_[index]),
        "confidence": round(float(probabilities[index]), 3),
        "entities": extract_entities(message, catalog),
    }