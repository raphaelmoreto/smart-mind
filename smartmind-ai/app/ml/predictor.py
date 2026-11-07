import joblib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "models" / "consumo_model.pkl"

# A FUNÇÃO TRANSFORMA A BANDEIRA EM UM VALOR NÚMERICO PARA QUE O MODELO POSSA PROCESSÁ-LA
def predict_consumption(consumo_mes, media_3_meses, tendencia, temperatura_media, mes, bandeira):
    if not MODEL_PATH.exists():
        raise RuntimeError("Modelo não treinado.")

    model = joblib.load(MODEL_PATH)

    bandeiras = {
        "Verde": 0,
        "Amarela": 1,
        "Vermelha": 2
    }

    data = [[
        consumo_mes,
        media_3_meses,
        tendencia,
        temperatura_media,
        mes,
        bandeiras[bandeira]
    ]]

    prediction = model.predict(data)[0]

    return round(max(0, float(prediction)), 2)