import joblib
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "models" / "consumo_model.pkl"

FEATURES = [
    "consumo_mes",
    "media_3_meses",
    "tendencia",
    "temperatura_media",
    "mes",
    "bandeira"
]

BANDEIRAS = {
    "verde": 0,
    "amarela": 1,
    "vermelha": 2
}

# A FUNÇÃO TRANSFORMA A BANDEIRA EM UM VALOR NÚMERICO PARA QUE O MODELO POSSA PROCESSÁ-LA
def predict_consumption(consumo_mes, media_3_meses, tendencia, temperatura_media, mes, bandeira):
    if not MODEL_PATH.exists():
        raise RuntimeError("Modelo não treinado.")

    bandeira_normalizada = bandeira.strip().lower()
    if bandeira_normalizada not in BANDEIRAS:
        raise ValueError(f"Bandeira tarifária inválida: {bandeira}")

    model = joblib.load(MODEL_PATH)

    data = pd.DataFrame([{
        "consumo_mes": consumo_mes,
        "media_3_meses": media_3_meses,
        "tendencia": tendencia,
        "temperatura_media": temperatura_media,
        "mes": mes,
        "bandeira": BANDEIRAS[bandeira_normalizada]
    }], columns=FEATURES)

    prediction = model.predict(data)[0]

    return round(max(0, float(prediction)), 2)