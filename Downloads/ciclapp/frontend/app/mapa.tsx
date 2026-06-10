/**
 * CICLAPP — Pantalla de Mapa
 * app/mapa.tsx
 *
 * Fix aplicado: tracksViewChanges={false} en todos los Markers
 * y Callout removido del marcador custom para evitar crash Android:
 * "addViewAt: failed to insert view into parent at index 1"
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

const BOGOTA_CENTER: Region = {
  latitude: 4.711,
  longitude: -74.0721,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const AVG_CYCLING_SPEED_KMH = 15;
const STORAGE_KEY = "ciclapp:recent_destinations";
const MAX_RECENT = 5;

/**
 * ⚠️ Reemplaza con tu API Key de Google Maps.
 * Necesita habilitados: Maps SDK Android/iOS + Geocoding API
 */
const GOOGLE_MAPS_API_KEY = "TU_API_KEY_AQUI";

const COLORS = {
  primary: "#27AE60",
  primaryDark: "#1E8449",
  primaryLight: "#EAFAF1",
  danger: "#E74C3C",
  surface: "#FFFFFF",
  background: "#F8FAF9",
  textPrimary: "#1A1A2E",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  shadow: "#000000",
} as const;

const SPACING = { xs: 4, sm: 8, md: 16, lg: 24 } as const;
const RADIUS = { sm: 8, md: 12, lg: 20, full: 999 } as const;

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Destination {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  savedAt: number;
}

interface RouteInfo {
  distanceKm: number;
  estimatedMinutes: number;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const chord =
    sinLat * sinLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

async function geocodeAddress(
  query: string
): Promise<{ name: string; address: string; coordinates: Coordinates } | null> {
  const encoded = encodeURIComponent(`${query}, Bogotá, Colombia`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) return null;
    const result = data.results[0];
    const loc = result.geometry.location;
    return {
      name: query,
      address: result.formatted_address,
      coordinates: { latitude: loc.lat, longitude: loc.lng },
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// HOOK: useRecentDestinations
// ─────────────────────────────────────────────────────────────

function useRecentDestinations() {
  const [recents, setRecents] = useState<Destination[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setRecents(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const saveDestination = useCallback(async (dest: Destination) => {
    setRecents((prev) => {
      const filtered = prev.filter(
        (d) => d.name.toLowerCase() !== dest.name.toLowerCase()
      );
      const updated = [dest, ...filtered].slice(0, MAX_RECENT);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setRecents([]);
  }, []);

  return { recents, saveDestination, clearHistory };
}

// ─────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function MapaScreen() {
  const mapRef = useRef<MapView>(null);
  const inputRef = useRef<TextInput>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const panelAnim = useRef(new Animated.Value(0)).current;

  const { recents, saveDestination, clearHistory } = useRecentDestinations();

  // ── GPS ──
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Permiso de ubicación denegado");
        setIsLocating(false);
        return;
      }

      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (mounted) {
          const coords: Coordinates = {
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          };
          setUserLocation(coords);
          setIsLocating(false);
          centerMapOn(coords, 0.015);
        }
      } catch {
        if (mounted) setIsLocating(false);
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (loc) => {
          if (!mounted) return;
          const coords: Coordinates = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setUserLocation(coords);
          if (destination) recalculateRoute(coords, destination.coordinates);
        }
      );
    })();

    return () => {
      mounted = false;
      locationSubscription.current?.remove();
    };
  }, []);

  // ── Animación panel inferior ──
  useEffect(() => {
    Animated.spring(panelAnim, {
      toValue: routeInfo ? 1 : 0,
      useNativeDriver: true,
      bounciness: 6,
      speed: 12,
    }).start();
  }, [routeInfo]);

  // ── Helpers ──
  const centerMapOn = (coords: Coordinates, delta = 0.01) => {
    mapRef.current?.animateToRegion(
      { ...coords, latitudeDelta: delta, longitudeDelta: delta },
      800
    );
  };

  const recalculateRoute = (from: Coordinates, to: Coordinates) => {
    const distanceKm = haversineDistance(from, to);
    const estimatedMinutes = (distanceKm / AVG_CYCLING_SPEED_KMH) * 60;
    setRouteInfo({ distanceKm, estimatedMinutes });
  };

  // ── Handlers ──
  const handleGoToMyLocation = () => {
    if (!userLocation) {
      Alert.alert("Ubicación no disponible", "Aún estamos obteniendo tu posición.");
      return;
    }
    centerMapOn(userLocation, 0.012);
  };

  const handleSearch = async () => {
    const query = searchText.trim();
    if (!query) return;
    Keyboard.dismiss();
    setIsSearching(true);
    const result = await geocodeAddress(query);
    setIsSearching(false);

    if (!result) {
      Alert.alert(
        "Lugar no encontrado",
        `No encontramos "${query}" en Bogotá. Intenta con un nombre más específico.`
      );
      return;
    }

    const newDest: Destination = {
      id: Date.now().toString(),
      name: result.name,
      address: result.address,
      coordinates: result.coordinates,
      savedAt: Date.now(),
    };

    setDestination(newDest);
    saveDestination(newDest);
    setSearchFocused(false);
    centerMapOn(result.coordinates, 0.02);
    if (userLocation) recalculateRoute(userLocation, result.coordinates);
  };

  const handleSelectRecent = (dest: Destination) => {
    setSearchText(dest.name);
    setDestination(dest);
    setSearchFocused(false);
    Keyboard.dismiss();
    centerMapOn(dest.coordinates, 0.02);
    if (userLocation) recalculateRoute(userLocation, dest.coordinates);
  };

  const handleClearDestination = () => {
    setDestination(null);
    setRouteInfo(null);
    setSearchText("");
  };

  const handleStartRoute = () => {
    if (!destination) return;
    Alert.alert(
      "🚴 Ruta iniciada",
      `Navegando hacia:\n${destination.name}\n\n📏 ${routeInfo?.distanceKm.toFixed(1)} km · ⏱ ${formatTime(routeInfo?.estimatedMinutes ?? 0)}`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => router.push("/ruta") },
      ]
    );
  };

  // ── Interpolaciones animación ──
  const panelTranslate = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });
  const panelOpacity = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const showRecentList = searchFocused && recents.length > 0 && !searchText;

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ══ MAPA FULLSCREEN ══ */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={BOGOTA_CENTER}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsTraffic={false}
        showsBuildings={true}
      >
        {/*
          ✅ FIX ANDROID — tracksViewChanges={false} es OBLIGATORIO
          cuando usas vistas personalizadas dentro de <Marker>.
          Sin esto, Android intenta re-insertar la vista en cada render
          y lanza: "addViewAt: failed to insert view at index 1"

          También se eliminó <Callout> del marcador custom.
          En su lugar usamos las props title/description nativas
          del Marker, que son 100% estables en Android.
        */}

        {/* Marcador de ubicación actual del usuario */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={10}
            tracksViewChanges={false}
            title="Tu ubicación"
            description="Estás aquí"
          >
            {/* Vista personalizada: punto azul con anillo */}
            <View style={styles.userMarker}>
              <View style={styles.userMarkerRing} />
              <View style={styles.userMarkerCore} />
            </View>
          </Marker>
        )}

        {/* Marcador de destino buscado */}
        {destination && (
          <Marker
            coordinate={destination.coordinates}
            zIndex={9}
            tracksViewChanges={false}
            title={destination.name}
            description={destination.address}
          >
            {/* Ícono de pin personalizado */}
            <View style={styles.destMarker}>
              <Ionicons name="location" size={40} color={COLORS.danger} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ══ BARRA DE BÚSQUEDA ══ */}
      <View style={styles.searchContainer}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchInputWrap}>
          <Ionicons
            name="search-outline"
            size={18}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Buscar destino en Bogotá..."
            placeholderTextColor={COLORS.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={handleClearDestination}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.searchBtn, isSearching && { opacity: 0.6 }]}
          onPress={handleSearch}
          disabled={isSearching}
          accessibilityLabel="Buscar"
        >
          {isSearching ? (
            <ActivityIndicator size="small" color={COLORS.surface} />
          ) : (
            <Ionicons name="arrow-forward" size={20} color={COLORS.surface} />
          )}
        </TouchableOpacity>
      </View>

      {/* ══ LISTA DE RECIENTES ══ */}
      {showRecentList && (
        <View style={styles.recentsList}>
          <View style={styles.recentsHeader}>
            <Text style={styles.recentsTitle}>Recientes</Text>
            <TouchableOpacity onPress={clearHistory}>
              <Text style={styles.recentsClear}>Borrar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recents}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentItem}
                onPress={() => handleSelectRecent(item)}
              >
                <View style={styles.recentItemIcon}>
                  <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                </View>
                <View style={styles.recentItemText}>
                  <Text style={styles.recentItemName}>{item.name}</Text>
                  <Text style={styles.recentItemAddr} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ══ OVERLAY CARGANDO GPS ══ */}
      {isLocating && (
        <View style={styles.locatingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.locatingText}>Obteniendo tu ubicación...</Text>
        </View>
      )}

      {/* ══ BANNER ERROR DE UBICACIÓN ══ */}
      {locationError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color={COLORS.danger} />
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      {/* ══ BOTONES FLOTANTES ══ */}
      <View style={styles.fabColumn}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleGoToMyLocation}
          accessibilityLabel="Ir a mi ubicación"
        >
          <Ionicons name="locate-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        {destination && (
          <TouchableOpacity
            style={[styles.fab, styles.fabDanger]}
            onPress={handleClearDestination}
            accessibilityLabel="Eliminar destino"
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* ══ PANEL INFERIOR: INFO DE RUTA ══ */}
      {routeInfo && destination && (
        <Animated.View
          style={[
            styles.routePanel,
            {
              opacity: panelOpacity,
              transform: [{ translateY: panelTranslate }],
            },
          ]}
        >
          <View style={styles.routePanelHeader}>
            <Ionicons name="location" size={18} color={COLORS.danger} />
            <Text style={styles.routeDestName} numberOfLines={1}>
              {destination.name}
            </Text>
          </View>
          <Text style={styles.routeDestAddr} numberOfLines={2}>
            {destination.address}
          </Text>

          <View style={styles.routeStats}>
            <View style={styles.routeStat}>
              <Ionicons name="map-outline" size={18} color={COLORS.primary} />
              <Text style={styles.routeStatValue}>
                {routeInfo.distanceKm < 1
                  ? `${Math.round(routeInfo.distanceKm * 1000)} m`
                  : `${routeInfo.distanceKm.toFixed(1)} km`}
              </Text>
              <Text style={styles.routeStatLabel}>Distancia</Text>
            </View>

            <View style={styles.routeStatDivider} />

            <View style={styles.routeStat}>
              <Ionicons name="bicycle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.routeStatValue}>
                {formatTime(routeInfo.estimatedMinutes)}
              </Text>
              <Text style={styles.routeStatLabel}>En bicicleta</Text>
            </View>

            <View style={styles.routeStatDivider} />

            <View style={styles.routeStat}>
              <Ionicons name="speedometer-outline" size={18} color={COLORS.primary} />
              <Text style={styles.routeStatValue}>{AVG_CYCLING_SPEED_KMH} km/h</Text>
              <Text style={styles.routeStatLabel}>Velocidad media</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startRouteBtn}
            onPress={handleStartRoute}
            activeOpacity={0.85}
          >
            <Ionicons name="bicycle" size={20} color={COLORS.surface} />
            <Text style={styles.startRouteBtnText}>Iniciar Ruta</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────

const mapShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  android: { elevation: 8 },
}) ?? {};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  map: { ...StyleSheet.absoluteFillObject },

  // ── Marcador usuario ──
  userMarker: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  userMarkerCore: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2980B9",
    borderWidth: 2,
    borderColor: COLORS.surface,
    zIndex: 2,
  },
  userMarkerRing: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(41,128,185,0.18)",
    zIndex: 1,
  },

  // ── Marcador destino ──
  destMarker: {
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Búsqueda ──
  searchContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 40,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    ...mapShadow,
  },
  searchInputWrap: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    ...mapShadow,
  },
  searchIcon: { marginRight: -4 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...mapShadow,
  },

  // ── Recientes ──
  recentsList: {
    position: "absolute",
    top: Platform.OS === "ios" ? 112 : 96,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    ...mapShadow,
  },
  recentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  recentsClear: { fontSize: 12, color: COLORS.danger, fontWeight: "600" },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentItemIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  recentItemText: { flex: 1 },
  recentItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  recentItemAddr: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // ── Overlay GPS ──
  locatingOverlay: {
    position: "absolute",
    top: "45%",
    left: "50%",
    transform: [{ translateX: -80 }, { translateY: -30 }],
    width: 160,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    gap: SPACING.sm,
    ...mapShadow,
  },
  locatingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // ── Error banner ──
  errorBanner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 112 : 96,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: "#FDEDEC",
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: "#F1948A",
  },
  errorText: { fontSize: 12, color: COLORS.danger, flex: 1 },

  // ── FABs ──
  fabColumn: {
    position: "absolute",
    right: SPACING.md,
    bottom: 220,
    gap: SPACING.sm,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...mapShadow,
  },
  fabDanger: {
    borderColor: "#FADBD8",
    backgroundColor: "#FEF9F9",
  },

  // ── Panel de ruta ──
  routePanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === "ios" ? 36 : SPACING.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  routePanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: 2,
  },
  routeDestName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
    flex: 1,
    letterSpacing: -0.2,
  },
  routeDestAddr: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: SPACING.md,
  },
  routeStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  routeStat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  routeStatValue: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  routeStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  routeStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  startRouteBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  startRouteBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.surface,
    letterSpacing: -0.2,
  },
});