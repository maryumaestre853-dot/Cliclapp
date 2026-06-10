from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    contraseña = Column(String, nullable=False)
    rutas = relationship("Ruta", back_populates="creador")
    favoritos = relationship("Favorito", back_populates="usuario")
    historial = relationship("Historial", back_populates="usuario")
    bicicletas = relationship("Bicicleta", back_populates="usuario")

class Ruta(Base):
    __tablename__ = "rutas"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    descripcion = Column(String)
    distancia_km = Column(Float)
    duracion_min = Column(Integer)
    origen_lat = Column(Float)
    origen_lng = Column(Float)
    destino_lat = Column(Float)
    destino_lng = Column(Float)
    creador_id = Column(Integer, ForeignKey("usuarios.id"))
    creador = relationship("Usuario", back_populates="rutas")
    favoritos = relationship("Favorito", back_populates="ruta")

class Favorito(Base):
    __tablename__ = "favoritos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    ruta_id = Column(Integer, ForeignKey("rutas.id"))
    usuario = relationship("Usuario", back_populates="favoritos")
    ruta = relationship("Ruta", back_populates="favoritos")

class Historial(Base):
    __tablename__ = "historial"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    ruta_id = Column(Integer, ForeignKey("rutas.id"))
    fecha = Column(DateTime, default=datetime.utcnow)
    usuario = relationship("Usuario", back_populates="historial")

class Bicicleta(Base):
    __tablename__ = "bicicletas"
    id = Column(Integer, primary_key=True, index=True)
    marca = Column(String, nullable=False)
    modelo = Column(String, nullable=False)
    color = Column(String)
    numero_serie = Column(String, unique=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    usuario = relationship("Usuario", back_populates="bicicletas")