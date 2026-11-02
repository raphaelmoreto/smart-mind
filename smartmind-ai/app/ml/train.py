import pandas as pd
import joblib

from pathlib import Path

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

BASE_DIR = Path(__file__).resolve().parents[2]

DATA_PATH = BASE_DIR / "datasets" / "historico_consumo.csv"

MODEL_PATH = BASE_DIR / "models" / "consumo_model.pkl"


def train():
    df = pd.read_csv(DATA_PATH)

    features = [
        "consumo_mes",
        "media_3_meses",
        "tendencia",
        "temperatura_media",
        "mes",
        "bandeira"
    ]

    X = df[features]
    y = df["consumo_futuro"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=5,
        random_state=42
    )
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    MODEL_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(model, MODEL_PATH)

    print(f"MAE: {mae:.2f} kWh")
    print("Modelo treinado com sucesso!")


if __name__ == "__main__":
    train()