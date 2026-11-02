# PARA EXECUTAR:
# uvicorn app.main:app --reload --port 8000

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.nlu.processor import process_message

app = FastAPI(
    title = "SmartMind AI",
    description = "Microsserviço de inteligência artificial do SmartMind",
    version = "1.0.0"
)

class MessageRequest(BaseModel):
    message: str

@app.get("health")
def health():
    return {
        "status": "online",
        "service": "SmartMind AI"
    }


@app.post("/nlu/parse")
def parse_message(request: MessageRequest):
    if not request.message.strip():
        raise HTTPException(
            status_code = 400,
            detail = "Mensagem não pode ser vazia"
        )

    result = process_message(request.message)

    return result