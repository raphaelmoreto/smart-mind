# PARA EXECUTAR: uvicorn app.main:app --reload --port 8000

# SWAGGER: http://localhost:8000/docs

from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.ml.predictor import predict_consumption
from app.nlu.processor import load_model, process_message, train_model

app = FastAPI(
    title = "SmartMind AI",
    description = "Microsserviço de inteligência artificial do SmartMind",
    version = "1.0.0"
)

class TipoCatalogo(BaseModel):
    id: int
    nome: str
    sinonimos: List[str] = []


class DispositivoCatalogo(BaseModel):
    id: int
    nome: str
    tipo_id: Optional[int] = None


class Catalogo(BaseModel):
    types: List[TipoCatalogo] = []
    devices: List[DispositivoCatalogo] = []


class MessageRequest(BaseModel):
    message: str
    catalog: Optional[Catalogo] = None

class PredictionRequest(BaseModel):
    consumo_mes: float
    media_3_meses: float
    tendencia: float
    temperatura_media: float
    mes: int
    bandeira: str

@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "SmartMind AI"
    }


@app.post("/ml/predict")
def predict(request: PredictionRequest):
    try:
        consumo = predict_consumption(
            request.consumo_mes,
            request.media_3_meses,
            request.tendencia,
            request.temperatura_media,
            request.mes,
            request.bandeira
        )

        return { "consumo_previsto": consumo }
    except (RuntimeError, KeyError, ValueError) as error:
        raise HTTPException(status_code=400, detail=str(error))


# EXEMPLO TESTE:
# {
#     "message": "Quanto gasto com meu chuveiro de 5500 watts ligado por 30 minutos por dia?"
# }
@app.post("/nlu/parse")
def parse_message(request: MessageRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Mensagem não pode ser vazia")

    catalog = request.catalog.model_dump() if request.catalog else None
    return process_message(request.message, catalog)


# RETREINA SEM PRECISAR APAGAR O .pkl NA MÃO (USE DEPOIS DE EDITAR O training_data.json)
@app.post("/nlu/train")
def retrain():
    train_model()
    load_model.cache_clear()
    return {"status": "modelo de intenções treinado novamente"}