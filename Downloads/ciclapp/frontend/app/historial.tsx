/**
 * CICLAPP — Pantalla Historial
 * app/historial.tsx
 *
 * Funciones:
 *  - Lista de rutas desde AsyncStorage
 *  - Fecha, distancia, duración, velocidad media
 *  - Eliminar ruta con confirmación
 *  - Modal de detalle de ruta
 *  - Estadísticas totales en cabecera
 *  - Estado vacío con CTA
 */

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  RouteRecord,
  deleteRoute,
  formatDuration,
  loadRoutes,
} from "../services/storage";

// ─────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────

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
} as const;

const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
const RADIUS = { sm: 8, md: 14, lg: 20, xl: 28, full: 999 } as const;

// ─────────────────────────────────────────────────────────────
// HELPERS DE FORMATO
// ─────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function avgSpeed(route: RouteRecord): string {
  if (route.durationSeconds === 0) return "—";
  const kmh = (route.distanceKm / route.durationSeconds) * 3600;
  return `${kmh.toFixed(1)} km/h`;
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function HistorialScreen() {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null);

  // ── Cargar rutas ──
  const fetchRoutes = useCallback(async () => {
    const data = await loadRoutes();
    setRoutes(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchRoutes(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoutes();
  };

  // ── Eliminar ruta ──
  const handleDelete = useCallback((route: RouteRecord) => {
    Alert.alert(
      "Eliminar ruta",
      `¿Seguro que quieres eliminar el recorrido del ${formatDate(route.date)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await deleteRoute(route.id);
            setRoutes((prev) => prev.filter((r) => r.id !== route.id));
            if (selectedRoute?.id === route.id) setSelectedRoute(null);
          },
        },
      ]
    );
  }, [selectedRoute]);

  // ── Totales globales ──
  const totals = routes.reduce(
    (acc, r) => ({
      km: acc.km + r.distanceKm,
      seconds: acc.seconds + r.durationSeconds,
    }),
    { km: 0, seconds: 0 }
  );

  // ─────────────────────────────────────────────────────────
  // RENDER ITEM
  // ─────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: RouteRecord; index: number }) => (
      <TouchableOpacity
        style={styles.routeCard}
        onPress={() => setSelectedRoute(item)}
        activeOpacity={0.8}
      >
        {/* Indicador de número de ruta */}
        <View style={styles.routeIndex}>
          <Text style={styles.routeIndexText}>
            #{routes.length - index}
          </Text>
        </View>

        <View style={styles.routeCardBody}>
          {/* Fecha + hora */}
          <View style={styles.routeCardHeader}>
            <Text style={styles.routeDate}>{formatDate(item.date)}</Text>
            <Text style={styles.routeTime}>{formatTime(item.date)}</Text>
          </View>

          {/* Métricas inline */}
          <View style={styles.routeMetrics}>
            <MetricPill
              icon="map-outline"
              value={
                item.distanceKm >= 1
                  ? `${item.distanceKm.toFixed(2)} km`
                  : `${(item.distanceKm * 1000).toFixed(0)} m`
              }
            />
            <MetricPill
              icon="timer-outline"
              value={formatDuration(item.durationSeconds)}
            />
            <MetricPill
              icon="speedometer-outline"
              value={avgSpeed(item)}
            />
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.routeCardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setSelectedRoute(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    ),
    [routes.length, handleDelete]
  );

  // ─────────────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Cargando rutas...</Text>
        </View>
      ) : routes.length === 0 ? (
        // ── ESTADO VACÍO ──
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bicycle-outline" size={56} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sin rutas aún</Text>
          <Text style={styles.emptySub}>
            Tus recorridos aparecerán aquí después de pedalear.
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push("/ruta")}
          >
            <Ionicons name="bicycle" size={18} color={COLORS.surface} />
            <Text style={styles.emptyBtnText}>Iniciar primera ruta</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListHeaderComponent={
            // ── Resumen global ──
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryHeaderTitle}>Totales</Text>
              <View style={styles.summaryHeaderRow}>
                <SummaryChip
                  icon="map-outline"
                  value={`${totals.km.toFixed(1)} km`}
                  label="Recorridos"
                />
                <SummaryChip
                  icon="bicycle-outline"
                  value={String(routes.length)}
                  label="Rutas"
                />
                <SummaryChip
                  icon="timer-outline"
                  value={formatDuration(totals.seconds)}
                  label="Tiempo"
                />
              </View>
            </View>
          }
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        />
      )}

      {/* ── MODAL DETALLE DE RUTA ── */}
      <Modal
        visible={!!selectedRoute}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRoute(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedRoute(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Detalle de ruta</Text>
            {selectedRoute && (
              <>
                <View style={styles.modalRows}>
                  <ModalDetailRow
                    icon="calendar-outline"
                    label="Fecha"
                    value={formatDate(selectedRoute.date)}
                  />
                  <ModalDetailRow
                    icon="time-outline"
                    label="Hora de inicio"
                    value={formatTime(selectedRoute.date)}
                  />
                  <ModalDetailRow
                    icon="map-outline"
                    label="Distancia"
                    value={
                      selectedRoute.distanceKm >= 1
                        ? `${selectedRoute.distanceKm.toFixed(3)} km`
                        : `${(selectedRoute.distanceKm * 1000).toFixed(0)} m`
                    }
                  />
                  <ModalDetailRow
                    icon="timer-outline"
                    label="Duración"
                    value={formatDuration(selectedRoute.durationSeconds)}
                  />
                  <ModalDetailRow
                    icon="speedometer-outline"
                    label="Velocidad media"
                    value={avgSpeed(selectedRoute)}
                  />
                  {selectedRoute.startLocation && (
                    <ModalDetailRow
                      icon="location-outline"
                      label="Inicio"
                      value={`${selectedRoute.startLocation.latitude.toFixed(4)}, ${selectedRoute.startLocation.longitude.toFixed(4)}`}
                    />
                  )}
                </View>

                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={() => handleDelete(selectedRoute)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.modalDeleteText}>Eliminar ruta</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedRoute(null)}
                >
                  <Text style={styles.modalCloseBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────

function MetricPill({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Ionicons name={icon as any} size={12} color={COLORS.primary} />
      <Text style={styles.metricPillText}>{value}</Text>
    </View>
  );
}

function SummaryChip({
  icon, value, label,
}: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.summaryChip}>
      <Ionicons name={icon as any} size={16} color={COLORS.primary} />
      <Text style={styles.summaryChipValue}>{value}</Text>
      <Text style={styles.summaryChipLabel}>{label}</Text>
    </View>
  );
}

function ModalDetailRow({
  icon, label, value,
}: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.modalRow}>
      <View style={styles.modalRowIcon}>
        <Ionicons name={icon as any} size={16} color={COLORS.primary} />
      </View>
      <Text style={styles.modalRowLabel}>{label}</Text>
      <Text style={styles.modalRowValue}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────

const shadow = Platform.select({
  ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  android: { elevation: 3 },
}) ?? {};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    justifyContent: "center", alignItems: "center",
    backgroundColor: COLORS.background,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.textPrimary },

  // Lista
  listContent: { padding: SPACING.md, paddingBottom: 40 },

  // Resumen header
  summaryHeader: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.md, ...shadow,
  },
  summaryHeaderTitle: {
    fontSize: 12, fontWeight: "700", color: COLORS.textMuted,
    letterSpacing: 1, marginBottom: SPACING.sm, textTransform: "uppercase",
  },
  summaryHeaderRow: { flexDirection: "row", gap: SPACING.sm },
  summaryChip: {
    flex: 1, backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md,
    padding: SPACING.sm, alignItems: "center", gap: 2,
  },
  summaryChipValue: { fontSize: 15, fontWeight: "800", color: COLORS.textPrimary },
  summaryChipLabel: { fontSize: 10, color: COLORS.textSecondary },

  // Tarjeta de ruta
  routeCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    flexDirection: "row", alignItems: "center",
    padding: SPACING.md, gap: SPACING.sm, ...shadow,
  },
  routeIndex: {
    width: 36, height: 36, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center", alignItems: "center",
  },
  routeIndexText: { fontSize: 12, fontWeight: "800", color: COLORS.primary },
  routeCardBody: { flex: 1, gap: SPACING.xs },
  routeCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  routeDate: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary },
  routeTime: { fontSize: 11, color: COLORS.textMuted },
  routeMetrics: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs },
  metricPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: COLORS.background, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
  },
  metricPillText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "600" },
  routeCardActions: { gap: SPACING.xs },
  actionBtn: {
    width: 34, height: 34, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center", alignItems: "center",
  },
  actionBtnDanger: { backgroundColor: "#FDEDEC" },

  // Estado vacío
  emptyState: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: SPACING.xl,
  },
  emptyIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center", alignItems: "center", marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptySub: {
    fontSize: 14, color: COLORS.textSecondary, textAlign: "center",
    lineHeight: 20, marginBottom: SPACING.xl,
  },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    ...Platform.select({ ios: { shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 6 } }),
  },
  emptyBtnText: { fontSize: 15, fontWeight: "700", color: COLORS.surface },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === "ios" ? 40 : SPACING.lg,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: "center", marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18, fontWeight: "800", color: COLORS.textPrimary,
    marginBottom: SPACING.md, letterSpacing: -0.3,
  },
  modalRows: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    overflow: "hidden", marginBottom: SPACING.md,
  },
  modalRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalRowIcon: {
    width: 32, height: 32, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight, justifyContent: "center", alignItems: "center",
  },
  modalRowLabel: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  modalRowValue: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary },
  modalDeleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: SPACING.sm, paddingVertical: SPACING.md,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: "#FADBD8",
    marginBottom: SPACING.sm, backgroundColor: "#FEF9F9",
  },
  modalDeleteText: { fontSize: 14, fontWeight: "700", color: COLORS.danger },
  modalCloseBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, alignItems: "center",
    ...Platform.select({ ios: { shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 6 } }),
  },
  modalCloseBtnText: { fontSize: 15, fontWeight: "700", color: COLORS.surface },
});