/**
 * CICLAPP — Pantalla Perfil
 * app/perfil.tsx
 *
 * Funciones:
 *  - Mostrar nombre, email, avatar placeholder
 *  - Estadísticas totales del usuario (desde rutas guardadas)
 *  - Editar nombre y email (inline)
 *  - Guardar cambios en AsyncStorage
 *  - Botón Cerrar Sesión (stub para Auth futuro)
 */

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  RouteRecord,
  UserProfile,
  formatDuration,
  loadProfile,
  loadRoutes,
  saveProfile,
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
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Iniciales para el avatar generado */
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function PerfilScreen() {
  const [profile, setProfile] = useState<UserProfile>({
    name: "Ciclista Bogotano",
    email: "ciclista@ciclapp.co",
  });
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const editAnim = useRef(new Animated.Value(0)).current;

  // ── Cargar datos ──
  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([loadProfile(), loadRoutes()]);
      setProfile(p);
      setRoutes(r);
    })();

    // Animación de entrada del header
    Animated.spring(headerAnim, {
      toValue: 1, useNativeDriver: true,
      bounciness: 6, speed: 10,
    }).start();
  }, []);

  // ── Animación del formulario de edición ──
  useEffect(() => {
    Animated.spring(editAnim, {
      toValue: isEditing ? 1 : 0,
      useNativeDriver: true,
      bounciness: 5,
      speed: 14,
    }).start();
  }, [isEditing]);

  // ── Estadísticas totales ──
  const totalKm = routes.reduce((s, r) => s + r.distanceKm, 0);
  const totalSeconds = routes.reduce((s, r) => s + r.durationSeconds, 0);
  const totalRoutes = routes.length;
  const avgSpeedKmh =
    totalSeconds > 0 ? (totalKm / totalSeconds) * 3600 : 0;

  // ── Editar perfil ──
  const handleStartEdit = () => {
    setEditName(profile.name);
    setEditEmail(profile.email);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const trimName = editName.trim();
    const trimEmail = editEmail.trim();

    if (!trimName) {
      Alert.alert("Nombre requerido", "Por favor ingresa tu nombre.");
      return;
    }
    if (trimEmail && !/^\S+@\S+\.\S+$/.test(trimEmail)) {
      Alert.alert("Email inválido", "Ingresa un correo válido.");
      return;
    }

    setIsSaving(true);
    const updated: UserProfile = { name: trimName, email: trimEmail };
    await saveProfile(updated);
    setProfile(updated);
    setIsSaving(false);
    setIsEditing(false);
    Keyboard.dismiss();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    Keyboard.dismiss();
  };

  // ── Cerrar sesión (stub) ──
  const handleLogout = () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Seguro que quieres salir de tu cuenta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: () => {
            // TODO: Limpiar token de auth cuando se implemente backend
            Alert.alert("Listo", "Sesión cerrada. (Auth pendiente de integración)");
            router.replace("/");
          },
        },
      ]
    );
  };

  // ── Interpolaciones ──
  const headerScale = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const headerOpacity = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const editOpacity = editAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const editTranslate = editAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ══ HERO / AVATAR ══ */}
        <Animated.View
          style={[
            styles.hero,
            { opacity: headerOpacity, transform: [{ scale: headerScale }] },
          ]}
        >
          {/* Botón volver */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.surface} />
          </TouchableOpacity>

          {/* Avatar con iniciales generadas */}
          <View style={styles.avatarOuter}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
            </View>
            {/* Badge de edición */}
            <TouchableOpacity
              style={styles.avatarEditBadge}
              onPress={handleStartEdit}
            >
              <Ionicons name="pencil" size={12} color={COLORS.surface} />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroName}>{profile.name}</Text>
          <Text style={styles.heroEmail}>{profile.email}</Text>

          {/* Chip de ciclista */}
          <View style={styles.heroBadge}>
            <Ionicons name="bicycle-outline" size={13} color={COLORS.primary} />
            <Text style={styles.heroBadgeText}>Ciclista CICLAPP</Text>
          </View>
        </Animated.View>

        <View style={styles.body}>

          {/* ══ ESTADÍSTICAS ══ */}
          <Text style={styles.sectionTitle}>Mis estadísticas</Text>
          <View style={styles.statsGrid}>
            <StatBox
              icon="map-outline"
              value={`${totalKm.toFixed(1)}`}
              unit="km"
              label="Recorridos"
              color={COLORS.primary}
            />
            <StatBox
              icon="bicycle-outline"
              value={String(totalRoutes)}
              unit=""
              label="Rutas"
              color="#2980B9"
            />
            <StatBox
              icon="timer-outline"
              value={totalSeconds < 3600
                ? `${Math.floor(totalSeconds / 60)}`
                : `${(totalSeconds / 3600).toFixed(1)}`}
              unit={totalSeconds < 3600 ? "min" : "h"}
              label="Tiempo"
              color="#8E44AD"
            />
            <StatBox
              icon="speedometer-outline"
              value={avgSpeedKmh.toFixed(1)}
              unit="km/h"
              label="Vel. media"
              color="#E67E22"
            />
          </View>

          {/* ══ FORMULARIO DE EDICIÓN ══ */}
          {isEditing && (
            <Animated.View
              style={[
                styles.editCard,
                { opacity: editOpacity, transform: [{ translateY: editTranslate }] },
              ]}
            >
              <Text style={styles.editTitle}>Editar perfil</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Tu nombre"
                    placeholderTextColor={COLORS.textMuted}
                    autoFocus
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={16} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="tu@correo.com"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                  />
                </View>
              </View>

              <View style={styles.editActions}>
                <Pressable style={styles.cancelBtn} onPress={handleCancelEdit}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Ionicons name="checkmark" size={18} color={COLORS.surface} />
                  <Text style={styles.saveBtnText}>
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* ══ ACCIONES DEL PERFIL ══ */}
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="pencil-outline"
              label="Editar perfil"
              color={COLORS.primary}
              onPress={handleStartEdit}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="time-outline"
              label="Ver historial"
              color="#2980B9"
              onPress={() => router.push("/historial")}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="bicycle-outline"
              label="Iniciar ruta"
              color="#8E44AD"
              onPress={() => router.push("/ruta")}
            />
          </View>

          {/* ══ ZONA PELIGROSA ══ */}
          <View style={styles.dangerZone}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>

          {/* Versión */}
          <Text style={styles.version}>CICLAPP v1.0.0 · Bogotá, Colombia 🚴</Text>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────

function StatBox({
  icon, value, unit, label, color,
}: { icon: string; value: string; unit: string; label: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statBoxIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.statBoxValueRow}>
        <Text style={styles.statBoxValue}>{value}</Text>
        {unit ? <Text style={[styles.statBoxUnit, { color }]}>{unit}</Text> : null}
      </View>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon, label, color, onPress,
}: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuItemIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.menuItemLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────

const shadow = Platform.select({
  ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
  android: { elevation: 3 },
}) ?? {};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === "ios" ? 60 : 48,
    paddingBottom: SPACING.xl + SPACING.lg,
    alignItems: "center",
    gap: SPACING.xs,
    ...Platform.select({
      ios: { shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  backBtn: {
    position: "absolute", top: Platform.OS === "ios" ? 56 : 40, left: SPACING.md,
    width: 40, height: 40, borderRadius: RADIUS.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  avatarOuter: { position: "relative", marginBottom: SPACING.sm },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.6)",
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 30, fontWeight: "800", color: COLORS.surface },
  avatarEditBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primaryDark,
    borderWidth: 2, borderColor: COLORS.surface,
    justifyContent: "center", alignItems: "center",
  },
  heroName: { fontSize: 22, fontWeight: "800", color: COLORS.surface, letterSpacing: -0.3 },
  heroEmail: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm + 2, paddingVertical: 4,
    borderRadius: RADIUS.full, marginTop: SPACING.xs,
  },
  heroBadgeText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },

  // Body
  body: { padding: SPACING.md, gap: SPACING.md, marginTop: -SPACING.lg },

  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: COLORS.textMuted,
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: -SPACING.xs,
    marginTop: SPACING.sm,
  },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  statBox: {
    width: "47.5%", backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.xs, ...shadow,
  },
  statBoxIcon: {
    width: 38, height: 38, borderRadius: RADIUS.sm,
    justifyContent: "center", alignItems: "center",
  },
  statBoxValueRow: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  statBoxValue: { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.5 },
  statBoxUnit: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  statBoxLabel: { fontSize: 11, color: COLORS.textSecondary },

  // Formulario edición
  editCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.md, gap: SPACING.md, ...shadow,
  },
  editTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  inputGroup: { gap: SPACING.xs },
  inputLabel: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, height: 46,
    borderWidth: 1, borderColor: COLORS.border,
  },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  editActions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.xs },
  cancelBtn: {
    flex: 1, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textSecondary },
  saveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: SPACING.xs, paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    ...Platform.select({ ios: { shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 5 } }),
  },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.surface },

  // Menú
  menuCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    overflow: "hidden", ...shadow,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.md,
  },
  menuItemIcon: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    justifyContent: "center", alignItems: "center",
  },
  menuItemLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: COLORS.textPrimary },
  menuDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 68 },

  // Danger
  dangerZone: { marginTop: SPACING.sm },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: SPACING.sm, paddingVertical: SPACING.md,
    backgroundColor: "#FEF9F9", borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: "#FADBD8",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: COLORS.danger },

  version: {
    textAlign: "center", fontSize: 11, color: COLORS.textMuted,
    marginTop: SPACING.sm, marginBottom: SPACING.xl,
  },
});