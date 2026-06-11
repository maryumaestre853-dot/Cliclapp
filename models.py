from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

# USUARIO

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    apellido = Column(String, nullable=False)
    nombre_completo = Column(String)
    num_documento = Column(String, unique=True, nullable=False)
    tipo_documento = Column(Enum("CC", "TI", name="tipo_documento_enum"), nullable=False)
    correo = Column(String, unique=True, nullable=False)
    telefono = Column(String)
    contraseña = Column(String, nullable=False)
    rol = Column(Enum("Usuario", "Administrador", name="rol_enum"), default="Usuario")

    bicicletas = relationship("Bicicleta", back_populates="usuario")
    recorridos = relationship("Recorrido", back_populates="usuario")

# BICICLETA

class Bicicleta(Base):
    __tablename__ = "bicicletas"
    id = Column(Integer, primary_key=True, index=True)
    num_serie = Column(String, unique=True, nullable=False)
    color = Column(String)
    tipo = Column(Enum("Carretera", "Urbana", "Electrica", name="tipo_bici_enum"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))

    usuario = relationship("Usuario", back_populates="bicicletas")
    documento = relationship("DocCicla", back_populates="bicicleta", uselist=False)

# DOC_CICLA

class DocCicla(Base):
    __tablename__ = "doc_cicla"
    id = Column(Integer, primary_key=True, index=True)
    fecha_emision = Column(DateTime, nullable=False)
    fecha_vencimiento = Column(DateTime, nullable=False)
    estado = Column(String, nullable=False)
    bicicleta_id = Column(Integer, ForeignKey("bicicletas.id"), unique=True)

    bicicleta = relationship("Bicicleta", back_populates="documento")

# RUTA

class Ruta(Base):
    __tablename__ = "rutas"
    id = Column(Integer, primary_key=True, index=True)
    origen = Column(String, nullable=False)
    destino = Column(String, nullable=False)
    distancia = Column(Float)
    tiempo_estimado = Column(Integer)

    puntos_servicios = relationship("PuntoServicio", back_populates="ruta")
    recorridos = relationship("Recorrido", back_populates="ruta")

# PUNTOS_SERVICIOS

class PuntoServicio(Base):
    __tablename__ = "puntos_servicios"
    id = Column(Integer, primary_key=True, index=True)
    telefono = Column(String)
    horarios = Column(String)
    distancia = Column(Float)
    tiempo_estimado = Column(Integer)
    servicio = Column(Enum("Taller", "Zona_hidratacion", "Montallantas", name="servicio_enum"), nullable=False)
    ruta_id = Column(Integer, ForeignKey("rutas.id"))

    ruta = relationship("Ruta", back_populates="puntos_servicios")

# RECORRIDO

class Recorrido(Base):
    __tablename__ = "recorridos"
    id = Column(Integer, primary_key=True, index=True)
    fecha_hora_inicio = Column(DateTime, default=datetime.utcnow)
    fecha_hora_fin = Column(DateTime)
    fecha_hora_parada = Column(DateTime)
    fecha_hora_retomar = Column(DateTime)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    ruta_id = Column(Integer, ForeignKey("rutas.id"))

    usuario = relationship("Usuario", back_populates="recorridos")
    ruta = relationship("Ruta", back_populates="recorridos")