import pandas as pd
import joblib

from pathlib import Path

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

BASE_DIR = Path(__file__).resolve().parents[2]

DATA_PATH = BASE_DIR / "datasets" / "historico_consumo.csv"
MODEL_PATH = BASE_DIR / "models" / "consumo_model.pkl"

FEATURES = [
    "consumo_mes",
    "media_3_meses",
    "tendencia",
    "temperatura_media",
    "mes",
    "bandeira"
]

TARGET = "consumo_futuro"

def train():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset não encontrado: {DATA_PATH}")
    
    df = pd.read_csv(DATA_PATH)

    required_columns = FEATURES + [TARGET]

    missing_columns = [
        column for column in required_columns
        if column not in df.columns
    ]
    if missing_columns:
        raise ValueError(f"Colunas ausentes no dataset: {missing_columns}")

    if df.empty:
        raise ValueError("O dataset está vazio.")

    X = df[FEATURES]
    y = df[TARGET]

    # "RandomForestRegressor" É UM ALGORITMO DE MACHINE LEARNING QUE CRIA VÁRIAS ÁRVORES DE DECISÃO PARA REALIZAR PREVISÕES NUMÉRICAS
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=5,
        random_state=42
    )

    model.fit(X, y)

    MODEL_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(model, MODEL_PATH)

    print("Modelo treinado com sucesso!")
    print(f"Registros utilizados: {len(df)}")
    print(f"Modelo salvo em: {MODEL_PATH}")


if __name__ == "__main__":
    train()