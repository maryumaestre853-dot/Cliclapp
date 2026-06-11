from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db
from models import Base, Usuario, Bicicleta, DocCicla, Ruta, PuntoServicio, Recorrido
from pydantic import BaseModel
from typing import Optional, Literal
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
    apellido: str
    num_documento: str
    tipo_documento: Literal["CC", "TI"]
    correo: str
    telefono: Optional[str] = None
    contraseña: str
    rol: Optional[Literal["Usuario", "Administrador"]] = "Usuario"

class UsuarioLogin(BaseModel):
    correo: str
    contraseña: str

class BicicletaCreate(BaseModel):
    num_serie: str
    color: Optional[str] = None
    tipo: Literal["Carretera", "Urbana", "Electrica"]
    usuario_id: int

class DocCiclaCreate(BaseModel):
    fecha_emision: datetime
    fecha_vencimiento: datetime
    estado: str
    bicicleta_id: int

class RutaCreate(BaseModel):
    origen: str
    destino: str
    distancia: Optional[float] = None
    tiempo_estimado: Optional[int] = None

class PuntoServicioCreate(BaseModel):
    telefono: Optional[str] = None
    horarios: Optional[str] = None
    distancia: Optional[float] = None
    tiempo_estimado: Optional[int] = None
    servicio: Literal["Taller", "Zona_hidratacion", "Montallantas"]
    ruta_id: int

class RecorridoCreate(BaseModel):
    usuario_id: int
    ruta_id: int

# ─── USUARIOS ──────────────────────────────────────────
@app.post("/usuarios/registro")
def registro(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    existe = db.query(Usuario).filter(Usuario.correo == usuario.correo).first()
    if existe:
        raise HTTPException(status_code=400, detail="Correo ya registrado")
    nuevo = Usuario(**usuario.dict())
    nuevo.nombre_completo = f"{usuario.nombre} {usuario.apellido}"
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.post("/usuarios/login")
def login(datos: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(
        Usuario.correo == datos.correo,
        Usuario.contraseña == datos.contraseña
    ).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return {"mensaje": "Login exitoso", "usuario_id": usuario.id, "nombre": usuario.nombre, "rol": usuario.rol}

@app.get("/usuarios/{id}")
def get_usuario(id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

@app.get("/usuarios")
def get_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).all()

# ─── BICICLETAS ────────────────────────────────────────
@app.post("/bicicletas")
def crear_bicicleta(bici: BicicletaCreate, db: Session = Depends(get_db)):
    nueva = Bicicleta(**bici.dict())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

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

@app.delete("/bicicletas/{id}")
def eliminar_bicicleta(id: int, db: Session = Depends(get_db)):
    bici = db.query(Bicicleta).filter(Bicicleta.id == id).first()
    if not bici:
        raise HTTPException(status_code=404, detail="Bicicleta no encontrada")
    db.delete(bici)
    db.commit()
    return {"mensaje": "Bicicleta eliminada"}

# ─── DOC_CICLA ─────────────────────────────────────────
@app.post("/doc-cicla")
def crear_doc(doc: DocCiclaCreate, db: Session = Depends(get_db)):
    nuevo = DocCicla(**doc.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.get("/doc-cicla/{bicicleta_id}")
def get_doc(bicicleta_id: int, db: Session = Depends(get_db)):
    doc = db.query(DocCicla).filter(DocCicla.bicicleta_id == bicicleta_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return doc

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

@app.delete("/rutas/{id}")
def eliminar_ruta(id: int, db: Session = Depends(get_db)):
    ruta = db.query(Ruta).filter(Ruta.id == id).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    db.delete(ruta)
    db.commit()
    return {"mensaje": "Ruta eliminada"}

# ─── PUNTOS DE SERVICIO ────────────────────────────────
@app.get("/puntos-servicios")
def get_puntos(db: Session = Depends(get_db)):
    return db.query(PuntoServicio).all()

@app.get("/puntos-servicios/ruta/{ruta_id}")
def get_puntos_ruta(ruta_id: int, db: Session = Depends(get_db)):
    return db.query(PuntoServicio).filter(PuntoServicio.ruta_id == ruta_id).all()

@app.post("/puntos-servicios")
def crear_punto(punto: PuntoServicioCreate, db: Session = Depends(get_db)):
    nuevo = PuntoServicio(**punto.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.delete("/puntos-servicios/{id}")
def eliminar_punto(id: int, db: Session = Depends(get_db)):
    punto = db.query(PuntoServicio).filter(PuntoServicio.id == id).first()
    if not punto:
        raise HTTPException(status_code=404, detail="Punto de servicio no encontrado")
    db.delete(punto)
    db.commit()
    return {"mensaje": "Punto de servicio eliminado"}

# ─── RECORRIDOS ────────────────────────────────────────
@app.get("/recorridos/usuario/{usuario_id}")
def get_recorridos_usuario(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(Recorrido).filter(Recorrido.usuario_id == usuario_id).all()

@app.post("/recorridos")
def iniciar_recorrido(datos: RecorridoCreate, db: Session = Depends(get_db)):
    nuevo = Recorrido(**datos.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.put("/recorridos/{id}/finalizar")
def finalizar_recorrido(id: int, db: Session = Depends(get_db)):
    rec = db.query(Recorrido).filter(Recorrido.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recorrido no encontrado")
    rec.fecha_hora_fin = datetime.utcnow()
    db.commit()
    return rec

@app.put("/recorridos/{id}/pausar")
def pausar_recorrido(id: int, db: Session = Depends(get_db)):
    rec = db.query(Recorrido).filter(Recorrido.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recorrido no encontrado")
    rec.fecha_hora_parada = datetime.utcnow()
    db.commit()
    return rec

@app.put("/recorridos/{id}/retomar")
def retomar_recorrido(id: int, db: Session = Depends(get_db)):
    rec = db.query(Recorrido).filter(Recorrido.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recorrido no encontrado")
    rec.fecha_hora_retomar = datetime.utcnow()
    db.commit()
    return rec