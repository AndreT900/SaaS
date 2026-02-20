import os
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import groq
from sentence_transformers import SentenceTransformer

# --- App ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: List[float]

class AskRequest(BaseModel):
    query: str
    context: str

class AskResponse(BaseModel):
    answer: str

# --- Clients ---
client = None
embedding_model = None

@app.on_event("startup")
async def startup_event():
    global client, embedding_model
    
    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        client = groq.Groq(api_key=api_key)
        print("Groq Client Initialized")
    else:
        print("WARNING: GROQ_API_KEY not found. AI features will fail.")

    print("Loading SentenceTransformer model...")
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2') 
    print("Embedding Model Loaded")

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai_engine",
        "groq": "ready" if client else "not_configured",
        "embeddings": "ready" if embedding_model else "loading"
    }

@app.post("/embed", response_model=EmbedResponse)
async def embed_text(request: EmbedRequest):
    if not embedding_model:
         raise HTTPException(status_code=500, detail="Embedding model not initialized")
    
    vector = embedding_model.encode(request.text).tolist()
    return {"embedding": vector}

@app.post("/ask", response_model=AskResponse)
async def ask_llm(request: AskRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Groq Client not initialized")
    
    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": f"Context: {request.context}\n\nQuestion: {request.query}"}
            ],
            model="openai/gpt-oss-120b",
        )
        return {"answer": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
