from fastapi import FastAPI

app = FastAPI(
    title="Ciclapp",
    description="Mcastañeda, Syusuf, Rnuñez, Mmaeste, Dayala",
    version="1.0.0",
)

@app.get("/")
async def root():
    """Endpoint raiz que retoma un saludo"""
    return{"Bienvenido a Ciclapp"} 