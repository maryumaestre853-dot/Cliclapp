# 🚴 Ciclapp — Guía de instalación

## Requisitos previos (instalar UNA SOLA VEZ en el PC nuevo)

| Herramienta | Versión | Descarga |
|---|---|---|
| Node.js LTS | 18 o superior | https://nodejs.org |
| Git (opcional) | cualquiera | https://git-scm.com |
| Expo Go (celular) | última | Play Store / App Store |

---

## Pasos para abrir el proyecto

```bash
# 1. Entrar a la carpeta del proyecto
cd ciclapp/frontend        # ajusta según donde lo hayas guardado

# 2. Instalar todas las dependencias (solo la primera vez)
npm install

# 3. Iniciar el servidor de desarrollo
npx expo start --clear

# 4. Escanear el QR con la app Expo Go desde tu celular
#    (celular y PC deben estar en la misma red WiFi)
```

---

## Si hay errores al instalar

```bash
# Error con react-native-maps
npx expo install react-native-maps

# Error con expo-location
npx expo install expo-location

# Error con AsyncStorage
npx expo install @react-native-async-storage/async-storage

# Limpiar caché de Metro si la app no carga
npx expo start --clear
```

---

## Configurar la API Key de Google Maps

El archivo `app/mapa.tsx` tiene esta línea cerca del inicio:

```ts
const GOOGLE_MAPS_API_KEY = "TU_API_KEY_AQUI";
```

Reemplaza `TU_API_KEY_AQUI` con tu clave real. En **Google Cloud Console**
asegúrate de tener habilitadas estas APIs:

- ✅ Maps SDK for Android
- ✅ Maps SDK for iOS
- ✅ Geocoding API
- ✅ Directions API  ← necesaria para trazar rutas reales

---

## Estructura del proyecto

```
frontend/
├── app/
│   ├── (tabs)/
│   │   └── index.tsx      ← Home Screen
│   ├── mapa.tsx           ← Pantalla de mapa con rutas
│   ├── ruta.tsx           ← Registro de ruta activa
│   ├── historial.tsx      ← Historial de recorridos
│   └── perfil.tsx         ← Perfil del usuario
└── services/
    └── storage.ts         ← Capa de almacenamiento (AsyncStorage)
```
