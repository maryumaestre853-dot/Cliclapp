/**
 * CICLAPP — Home Screen
 * app/index.tsx
 *
 * FIXES APLICADOS:
 *  - Imports corregidos (useState, useCallback, useFocusEffect separados)
 *  - Stats dinámicas conectadas a weekStats desde AsyncStorage
 *  - Ruta de storage corregida
 */

import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  WeekStats,
  calcWeekStats,
  loadRoutes,
} from "../services/storage";

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLORS = {
  primary: "#27AE60",
  primaryDark: "#1E8449",
  primaryLight: "#EAFAF1",
  background: "#F8FAF9",
  surface: "#FFFFFF",
  textPrimary: "#1A1A2E",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  shadow: "#000000",
} as const;

const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;

const RADIUS = {
  sm: 8, md: 14, lg: 20, xl: 28, full: 999,
} as const;

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

type ActionButton = {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/mapa" | "/ruta" | "/historial" | "/perfil";
  iconColor: string;
  iconBg: string;
};

type StatItem = {
  id: string;
  value: string;
  unit: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// ─────────────────────────────────────────────────────────────
// DATOS ESTÁTICOS
// ─────────────────────────────────────────────────────────────

const ACTION_BUTTONS: ActionButton[] = [
  {
    id: "mapa",
    label: "Ver Mapa",
    description: "Explora ciclorrutas en Bogotá",
    icon: "map-outline",
    route: "/mapa",
    iconColor: "#27AE60",
    iconBg: "#EAFAF1",
  },
  {
    id: "ruta",
    label: "Iniciar Ruta",
    description: "Registra una nueva sesión de ruta",
    icon: "navigate-outline",
    route: "/ruta",
    iconColor: "#2980B9",
    iconBg: "#EBF5FB",
  },
  {
    id: "historial",
    label: "Historial",
    description: "Revisa tus recorridos anteriores",
    icon: "time-outline",
    route: "/historial",
    iconColor: "#8E44AD",
    iconBg: "#F5EEF8",
  },
  {
    id: "perfil",
    label: "Mi Perfil",
    description: "Gestiona tu cuenta y logros",
    icon: "person-outline",
    route: "/perfil",
    iconColor: "#E67E22",
    iconBg: "#FEF9E7",
  },
];

// ─────────────────────────────────────────────────────────────
// COMPONENTE: ActionCard
// ─────────────────────────────────────────────────────────────

type ActionCardProps = {
  item: ActionButton;
  fadeAnim: Animated.Value;
};

function ActionCard({ item, fadeAnim }: ActionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      speed: 50,
      bounciness: 4,
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      speed: 50,
      bounciness: 4,
      useNativeDriver: true,
    }).start();

  const opacity = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale: scaleAnim }] }}>
      <Pressable
        style={styles.actionCard}
        onPress={() => router.push(item.route)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityLabel={`${item.label}: ${item.description}`}
        accessibilityRole="button"
      >
        <View style={[styles.actionIconWrap, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={24} color={item.iconColor} />
        </View>
        <View style={styles.actionTextWrap}>
          <Text style={styles.actionLabel}>{item.label}</Text>
          <Text style={styles.actionDesc}>{item.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: StatCard
// ─────────────────────────────────────────────────────────────

function StatCard({ stat }: { stat: StatItem }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Ionicons name={stat.icon} size={16} color={COLORS.primary} />
      </View>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{stat.value}</Text>
        {stat.unit ? <Text style={styles.statUnit}>{stat.unit}</Text> : null}
      </View>
      <Text style={styles.statLabel} numberOfLines={2}>{stat.label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// HOME SCREEN PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(ACTION_BUTTONS.map(() => new Animated.Value(0))).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  // FIX: useState y useCallback ahora correctamente importados
  const [weekStats, setWeekStats] = useState<WeekStats>({
    totalKm: 0,
    totalRoutes: 0,
    totalSeconds: 0,
  });

  // FIX: useFocusEffect importado de expo-router, recalcula al volver al Home
  useFocusEffect(
    useCallback(() => {
      loadRoutes().then((routes) => setWeekStats(calcWeekStats(routes)));
    }, [])
  );

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.stagger(
        90,
        cardAnims.map((a) =>
          Animated.timing(a, { toValue: 1, duration: 380, useNativeDriver: true })
        )
      ),
      Animated.timing(statsAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  const headerOpacity = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const headerTransY = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });
  const statsOpacity = statsAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const statsTransY = statsAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  // FIX: Stats calculadas dinámicamente desde weekStats (ya no estáticas)
  const STATS: StatItem[] = [
    {
      id: "km",
      value: weekStats.totalKm < 1
        ? (weekStats.totalKm * 1000).toFixed(0)
        : weekStats.totalKm.toFixed(1),
      unit: weekStats.totalKm < 1 ? "m" : "km",
      label: "Esta semana",
      icon: "speedometer-outline",
    },
    {
      id: "rutas",
      value: String(weekStats.totalRoutes),
      unit: "",
      label: "Rutas completadas",
      icon: "checkmark-circle-outline",
    },
    {
      id: "tiempo",
      value: weekStats.totalSeconds < 3600
        ? String(Math.floor(weekStats.totalSeconds / 60))
        : (weekStats.totalSeconds / 3600).toFixed(1),
      unit: weekStats.totalSeconds < 3600 ? "min" : "h",
      label: "Tiempo pedaleando",
      icon: "timer-outline",
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ══ HEADER ══ */}
        <Animated.View
          style={[
            styles.header,
            { opacity: headerOpacity, transform: [{ translateY: headerTransY }] },
          ]}
        >
          <View style={styles.headerAccentBar} />
          <View style={styles.headerInner}>
            <View style={styles.logoRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoEmoji}>🚴</Text>
              </View>
              <Text style={styles.logoText}>Ciclapp</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Movilidad inteligente para ciclistas en Bogotá
            </Text>
            <View style={styles.locationChip}>
              <View style={styles.locationDot} />
              <Text style={styles.locationText}>Bogotá, Colombia</Text>
            </View>
          </View>
        </Animated.View>

        {/* ══ TARJETA DE BIENVENIDA ══ */}
        <Animated.View
          style={[
            styles.welcomeCard,
            { opacity: headerOpacity, transform: [{ translateY: headerTransY }] },
          ]}
        >
          <View style={styles.welcomeDecorCircle} />
          <View style={styles.welcomeBody}>
            <Text style={styles.welcomeTitle}>¿Listo para rodar hoy? 🚵</Text>
            <Text style={styles.welcomeSub}>
              Bogotá te espera. Encuentra tu ruta ideal y pedalea seguro.
            </Text>
          </View>
          <Pressable
            style={styles.welcomeBtn}
            onPress={() => router.push("/ruta")}
            accessibilityLabel="Comenzar una ruta ahora"
            accessibilityRole="button"
          >
            <Text style={styles.welcomeBtnText}>Comenzar ahora</Text>
            <Ionicons name="arrow-forward" size={15} color={COLORS.surface} />
          </Pressable>
        </Animated.View>

        {/* ══ ACCIONES RÁPIDAS ══ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={styles.actionList}>
            {ACTION_BUTTONS.map((item, i) => (
              <ActionCard key={item.id} item={item} fadeAnim={cardAnims[i]} />
            ))}
          </View>
        </View>

        {/* ══ ESTADÍSTICAS DINÁMICAS ══ */}
        <Animated.View
          style={[
            styles.section,
            { opacity: statsOpacity, transform: [{ translateY: statsTransY }] },
          ]}
        >
          <Text style={styles.sectionTitle}>Tu semana en cifras</Text>
          <View style={styles.statsRow}>
            {STATS.map((s) => (
              <StatCard key={s.id} stat={s} />
            ))}
          </View>
        </Animated.View>

        {/* ══ BANNER CICLOVÍA ══ */}
        <Animated.View
          style={[
            styles.cicloviaBanner,
            { opacity: statsOpacity, transform: [{ translateY: statsTransY }] },
          ]}
        >
          <View style={styles.cicloviaIcon}>
            <Ionicons name="sunny-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.cicloviaInfo}>
            <Text style={styles.cicloviaTitle}>Ciclovía activa</Text>
            <Text style={styles.cicloviaSub}>Domingos y festivos · 7 AM – 2 PM</Text>
          </View>
          <View style={styles.cicloviaBadge}>
            <Text style={styles.cicloviaBadgeText}>HOY</Text>
          </View>
        </Animated.View>

        {/* ══ FOOTER ══ */}
        <View style={styles.footer}>
          <Ionicons name="leaf-outline" size={13} color={COLORS.primary} />
          <Text style={styles.footerText}>Pedalea hacia una ciudad mejor</Text>
          <Ionicons name="leaf-outline" size={13} color={COLORS.primary} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
}) ?? {};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl },

  header: {
    backgroundColor: COLORS.surface,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  headerAccentBar: { height: 4, backgroundColor: COLORS.primary },
  headerInner: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  logoRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  logoEmoji: { fontSize: 22 },
  logoText: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
    maxWidth: SCREEN_WIDTH * 0.72,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  locationDot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  locationText: { fontSize: 12, fontWeight: "600", color: COLORS.primary },

  welcomeCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
    }),
  },
  welcomeDecorCircle: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -50,
    right: -40,
  },
  welcomeBody: { marginBottom: SPACING.md },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.surface,
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  welcomeSub: { fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 19 },
  welcomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  welcomeBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.surface },

  section: { marginTop: SPACING.xl, paddingHorizontal: SPACING.lg },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    letterSpacing: -0.2,
  },

  actionList: { gap: SPACING.sm },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...cardShadow,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTextWrap: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 2 },
  actionDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  statsRow: { flexDirection: "row", gap: SPACING.sm },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...cardShadow,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  statValueRow: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  statValue: { fontSize: 22, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.5 },
  statUnit: { fontSize: 13, fontWeight: "600", color: COLORS.primary, marginBottom: 3 },
  statLabel: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 4, lineHeight: 15 },

  cicloviaBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: "#C8EFD9",
  },
  cicloviaIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: "#D4F5E2",
    justifyContent: "center",
    alignItems: "center",
  },
  cicloviaInfo: { flex: 1 },
  cicloviaTitle: { fontSize: 13, fontWeight: "700", color: COLORS.primaryDark },
  cicloviaSub: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  cicloviaBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  cicloviaBadgeText: { fontSize: 10, fontWeight: "800", color: COLORS.surface, letterSpacing: 0.8 },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    marginTop: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  footerText: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" },
});