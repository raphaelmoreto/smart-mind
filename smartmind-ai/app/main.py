# PARA EXECUTAR: uvicorn app.main:app --reload --port 8000

# SWAGGER: http://localhost:8000/docs

from app.ml.predictor import predict_consumption
from app.nlu.processor import process_message
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title = "SmartMind AI",
    description = "Microsserviço de inteligência artificial do SmartMind",
    version = "1.0.0"
)

class MessageRequest(BaseModel):
    message: str

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
    except (RuntimeError, KeyError) as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.post("/nlu/parse")
def parse_message(request: MessageRequest):
    if not request.message.strip():
        raise HTTPException(
            status_code = 400,
            detail = "Mensagem não pode ser vazia"
        )

    result = process_message(request.message)

    return result