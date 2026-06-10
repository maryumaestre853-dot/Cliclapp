from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db
from models import Base, Usuario, Ruta, Favorito, Historial, Bicicleta
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── SCHEMAS ───────────────────────────────────────────
class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    contraseña: str

class UsuarioLogin(BaseModel):
    email: str
    contraseña: str

class RutaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    distancia_km: Optional[float] = None
    duracion_min: Optional[int] = None
    origen_lat: float
    origen_lng: float
    destino_lat: float
    destino_lng: float
    creador_id: int

class BicicletaCreate(BaseModel):
    marca: str
    modelo: str
    color: Optional[str] = None
    numero_serie: Optional[str] = None
    usuario_id: int

# ─── USUARIOS ──────────────────────────────────────────
@app.post("/usuarios/registro")
def registro(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    existe = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    if existe:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    nuevo = Usuario(**usuario.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.post("/usuarios/login")
def login(datos: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(
        Usuario.email == datos.email,
        Usuario.contraseña == datos.contraseña
    ).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return {"mensaje": "Login exitoso", "usuario_id": usuario.id, "nombre": usuario.nombre}

@app.get("/usuarios/{id}")
def get_usuario(id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

# ─── RUTAS ─────────────────────────────────────────────
@app.get("/rutas")
def get_rutas(db: Session = Depends(get_db)):
    return db.query(Ruta).all()

@app.get("/rutas/{id}")
def get_ruta(id: int, db: Session = Depends(get_db)):
    ruta = db.query(Ruta).filter(Ruta.id == id).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return ruta

@app.post("/rutas")
def crear_ruta(ruta: RutaCreate, db: Session = Depends(get_db)):
    nueva = Ruta(**ruta.dict())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@app.put("/rutas/{id}")
def actualizar_ruta(id: int, datos: RutaCreate, db: Session = Depends(get_db)):
    ruta = db.query(Ruta).filter(Ruta.id == id).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    for key, value in datos.dict().items():
        setattr(ruta, key, value)
    db.commit()
    return ruta

@app.delete("/rutas/{id}")
def eliminar_ruta(id: int, db: Session = Depends(get_db)):
    ruta = db.query(Ruta).filter(Ruta.id == id).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    db.delete(ruta)
    db.commit()
    return {"mensaje": "Ruta eliminada"}

# ─── FAVORITOS ─────────────────────────────────────────
@app.get("/favoritos/{usuario_id}")
def get_favoritos(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(Favorito).filter(Favorito.usuario_id == usuario_id).all()

@app.post("/favoritos")
def agregar_favorito(usuario_id: int, ruta_id: int, db: Session = Depends(get_db)):
    favorito = Favorito(usuario_id=usuario_id, ruta_id=ruta_id)
    db.add(favorito)
    db.commit()
    return {"mensaje": "Agregado a favoritos"}

@app.delete("/favoritos")
def eliminar_favorito(usuario_id: int, ruta_id: int, db: Session = Depends(get_db)):
    fav = db.query(Favorito).filter(
        Favorito.usuario_id == usuario_id,
        Favorito.ruta_id == ruta_id
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")
    db.delete(fav)
    db.commit()
    return {"mensaje": "Eliminado de favoritos"}

# ─── HISTORIAL ─────────────────────────────────────────
@app.get("/historial/{usuario_id}")
def get_historial(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(Historial).filter(Historial.usuario_id == usuario_id).all()

@app.post("/historial")
def agregar_historial(usuario_id: int, ruta_id: int, db: Session = Depends(get_db)):
    registro = Historial(usuario_id=usuario_id, ruta_id=ruta_id)
    db.add(registro)
    db.commit()
    return {"mensaje": "Agregado al historial"}

# ─── BICICLETAS ────────────────────────────────────────
@app.get("/bicicletas")
def get_bicicletas(db: Session = Depends(get_db)):
    return db.query(Bicicleta).all()

@app.get("/bicicletas/{id}")
def get_bicicleta(id: int, db: Session = Depends(get_db)):
    bici = db.query(Bicicleta).filter(Bicicleta.id == id).first()
    if not bici:
        raise HTTPException(status_code=404, detail="Bicicleta no encontrada")
    return bici

@app.get("/bicicletas/usuario/{usuario_id}")
def get_bicicletas_usuario(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(Bicicleta).filter(Bicicleta.usuario_id == usuario_id).all()

@app.post("/bicicletas")
def crear_bicicleta(bici: BicicletaCreate, db: Session = Depends(get_db)):
    nueva = Bicicleta(**bici.dict())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@app.delete("/bicicletas/{id}")
def eliminar_bicicleta(id: int, db: Session = Depends(get_db)):
    bici = db.query(Bicicleta).filter(Bicicleta.id == id).first()
    if not bici:
        raise HTTPException(status_code=404, detail="Bicicleta no encontrada")
    db.delete(bici)
    db.commit()
    return {"mensaje": "Bicicleta eliminada"}

