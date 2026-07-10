import { QRCodeSVG } from 'qrcode.react';
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChefHat, History, LogOut, User, Users, Maximize2, Minimize2, Menu, X,
  ChevronDown, ChevronLeft, ChevronRight, Sparkles, Lock, MessageSquare,
  Shield, ShieldCheck, RefreshCw, Eye, CheckCircle, XCircle, Download,
  Palette, KeyRound, Package, LayoutDashboard, Euro, ShoppingBag,
  SlidersHorizontal, Percent, CalendarDays, Clock, FileText, Mail,
  Building2, Bike, Gamepad2,
  Bell, Search, Timer, Phone, Check, Trash2, AlertTriangle, Volume2,
  Pencil, Briefcase, Loader2, ArrowRight, Send,
  Play, Square, UserCircle, TrendingUp, Calendar,
  Plus, Flame, Star, Image as ImageIcon,
  Save, MapPin,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format, startOfWeek, endOfWeek, addDays, differenceInMinutes, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase";
import { LOCAL_IMAGES as PRODUCT_LOCAL_IMAGES } from "@/lib/product-images";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PromotionsManagement from "@/components/admin/PromotionsManagement";
import PointageHistory from "@/components/admin/hr/PointageHistory";
import PlanningsPage from "@/components/admin/hr-combo/PlanningsPage";
import NotificationsHub from "@/components/admin/NotificationsHub";

export const Route = createFileRoute("/staff/")({
  component: StaffDashboardPage,
});

function StaffDashboardPage() {
  return (
    <ProtectedRoute>
      <StaffPinProvider>
        <StaffPageInner />
      </StaffPinProvider>
    </ProtectedRoute>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TabValue =
  | "kitchen" | "orders" | "timetracking"
  | "messages" | "applications" | "dashboard" | "sales"
  | "products" | "options" | "promotions" | "planning"
  | "pointage-history" | "invoices" | "email" | "users"
  | "delivery" | "inventory" | "settings-restaurants"
  | "theme" | "settings-password" | "game";

type StaffTheme = "light" | "dark" | "auto";

type Application = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  message: string;
  cv_url: string | null;
  status: "new" | "reviewed" | "contacted" | "rejected";
};

type Contact = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: "unread" | "read" | "replied";
};

type TimeEntry = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  entry_date: string;
};

type StaffMember = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: "admin" | "manager" | "equipe" | "livreur";
  contract_type: string | null;
  weekly_hours: number | null;
  hire_date: string | null;
  is_active: boolean;
  notes: string | null;
  user_id?: string | null;
};

interface NavItem {
  value: TabValue;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  adminOnly?: boolean;
  badge?: number;
  disabled?: boolean;
  disabledLabel?: string;
  category: "cuisine" | "gestion" | "parametres";
}

// ─── Staff PIN Context ────────────────────────────────────────────────────────

const SESSION_KEY = "ct_staff_admin_session";

interface PinCtx {
  isAdminUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

const PinContext = createContext<PinCtx>({
  isAdminUnlocked: false,
  unlock: () => {},
  lock: () => {},
});

function StaffPinProvider({ children }: { children: ReactNode }) {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const unlock = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setIsAdminUnlocked(true);
  }, []);
  const lock = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAdminUnlocked(false);
  }, []);
  return (
    <PinContext.Provider value={{ isAdminUnlocked, unlock, lock }}>
      {children}
    </PinContext.Provider>
  );
}

function useStaffPin() {
  return useContext(PinContext);
}

// ─── Theme ────────────────────────────────────────────────────────────────────

const getSystemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const DARK_VARS: CSSProperties = {
  colorScheme: "dark",
  "--background": "oklch(0.16 0.06 270)",
  "--foreground": "oklch(0.98 0.005 80)",
  "--card": "oklch(0.21 0.07 270)",
  "--card-foreground": "oklch(0.98 0.005 80)",
  "--popover": "oklch(0.21 0.07 270)",
  "--popover-foreground": "oklch(0.98 0.005 80)",
  "--muted": "oklch(0.26 0.06 270)",
  "--muted-foreground": "oklch(0.78 0.02 270)",
  "--border": "oklch(0.30 0.06 270)",
  "--input": "oklch(0.26 0.06 270)",
  "--primary": "oklch(0.72 0.2 48)",
  "--primary-foreground": "oklch(0.16 0.06 270)",
  "--destructive": "oklch(0.6 0.24 27)",
  "--destructive-foreground": "oklch(0.98 0.005 80)",
} as CSSProperties;

const LIGHT_VARS: CSSProperties = {
  colorScheme: "light",
  "--background": "oklch(0.97 0.005 80)",
  "--foreground": "oklch(0.18 0.03 250)",
  "--card": "oklch(0.94 0.005 80)",
  "--card-foreground": "oklch(0.18 0.03 250)",
  "--popover": "oklch(0.94 0.005 80)",
  "--popover-foreground": "oklch(0.18 0.03 250)",
  "--muted": "oklch(0.90 0.01 250)",
  "--muted-foreground": "oklch(0.50 0.03 250)",
  "--border": "oklch(0.84 0.02 250)",
  "--input": "oklch(0.90 0.01 250)",
  "--primary": "oklch(0.72 0.2 48)",
  "--primary-foreground": "oklch(0.97 0.005 80)",
  "--destructive": "oklch(0.55 0.22 27)",
  "--destructive-foreground": "oklch(0.97 0.005 80)",
} as CSSProperties;

// ─── PIN Modal ────────────────────────────────────────────────────────────────

const ADMIN_PIN = "3132";

function PinModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);

  function press(digit: string) {
    if (input.length >= 4) return;
    const next = input + digit;
    setInput(next);
    if (next.length === 4) {
      if (next === ADMIN_PIN) {
        onSuccess();
        onClose();
      } else {
        setShake(true);
        setTimeout(() => { setInput(""); setShake(false); }, 600);
      }
    }
  }

  function backspace() { setInput((p) => p.slice(0, -1)); }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xs rounded-3xl border border-border/60 bg-card p-7 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              Accès Manager
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Entrez votre code PIN</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className={`flex justify-center gap-3 mb-6 ${shake ? "animate-bounce" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < input.length
                ? shake ? "bg-destructive border-destructive" : "bg-primary border-primary"
                : "border-border bg-transparent"
            }`} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {keys.map((key, idx) =>
            key === "" ? (
              <div key={idx} />
            ) : (
              <button
                key={idx}
                type="button"
                onClick={() => (key === "⌫" ? backspace() : press(key))}
                className={`rounded-xl border py-3.5 text-base font-semibold transition-all active:scale-95 ${
                  key === "⌫"
                    ? "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    : "border-border/40 bg-card hover:bg-muted/50 hover:border-primary/30 text-foreground"
                }`}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {key}
              </button>
            )
          )}
        </div>

        {shake && <p className="mt-4 text-center text-xs text-destructive">Code incorrect</p>}
      </div>
    </div>
  );
}

// ─── Staff Page Inner ─────────────────────────────────────────────────────────

function StaffPageInner() {
  const { user, signOut } = useAuth();
  const { isAdminUnlocked, unlock, lock } = useStaffPin();
  const navigate = useNavigate();

  // Theme
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);
  const [currentTheme, setCurrentTheme] = useState<StaffTheme>(() => {
    const s = localStorage.getItem("ct-staff-theme");
    return s === "light" || s === "dark" || s === "auto" ? s : "auto";
  });
  const resolved: "light" | "dark" =
    currentTheme === "auto" ? (systemPrefersDark ? "dark" : "light") : currentTheme;
  const themeVars = resolved === "dark" ? DARK_VARS : LIGHT_VARS;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => setSystemPrefersDark(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => { localStorage.setItem("ct-staff-theme", currentTheme); }, [currentTheme]);
  // Apply theme vars to :root so portals (modals) inherit them
  useEffect(() => {
    const vars = resolved === "dark" ? DARK_VARS : LIGHT_VARS;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      if (key.startsWith("--")) root.style.setProperty(key, value as string);
    });
  }, [resolved]);

  // Layout
  const [activeTab, setActiveTab] = useState<TabValue>("kitchen");
  const [sidebarVisible, setSidebarVisible] = useState(
    () => localStorage.getItem("ct-staff-sidebar") !== "false"
  );
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    { cuisine: true, gestion: true, parametres: false }
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabValue | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Badges
  const [pendingOrders, setPendingOrders] = useState(0);
  const [newMessages, setNewMessages] = useState(0);
  const [newApplications, setNewApplications] = useState(0);

  const fetchBadges = useCallback(async () => {
    const [{ count: pc }, { count: mc }, { count: ac }] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["pending", "preparing"]),
      supabase.from("contacts").select("*", { count: "exact", head: true }).eq("status", "unread"),
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "new"),
    ]);
    setPendingOrders(pc ?? 0);
    setNewMessages(mc ?? 0);
    setNewApplications(ac ?? 0);
  }, []);

  useEffect(() => {
    fetchBadges();
    const ch = supabase
      .channel("ct-staff-badges")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchBadges)
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, fetchBadges)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, fetchBadges)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchBadges]);

  useEffect(() => { localStorage.setItem("ct-staff-sidebar", String(sidebarVisible)); }, [sidebarVisible]);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const notifBadge = newMessages + newApplications;

  const navItems: NavItem[] = [
    // ── Cuisine ──
    { value: "kitchen",          label: "Commandes",          icon: ChefHat,          category: "cuisine", badge: pendingOrders },
    { value: "orders",           label: "Historique",         icon: History,          category: "cuisine" },
    { value: "timetracking",     label: "Pointage",           icon: Clock,            category: "cuisine" },
    // ── Gestion ──
    { value: "messages",         label: "Messages",           icon: MessageSquare,    category: "gestion", adminOnly: true, badge: newMessages },
    { value: "applications",     label: "Candidatures",       icon: Users,            category: "gestion", adminOnly: true, badge: newApplications },
    { value: "dashboard",        label: "Dashboard",          icon: LayoutDashboard,  category: "gestion", adminOnly: true, disabled: true, disabledLabel: "Bientôt" },
    { value: "sales",            label: "Ventes",             icon: Euro,             category: "gestion", adminOnly: true, disabled: true, disabledLabel: "Bientôt" },
    { value: "products",         label: "Produits & Tarifs",  icon: ShoppingBag,      category: "gestion", adminOnly: true },
    { value: "options",          label: "Options produits",   icon: SlidersHorizontal,category: "gestion", adminOnly: true, disabled: true, disabledLabel: "Bientôt" },
    { value: "promotions",       label: "Promos",             icon: Percent,          category: "gestion", adminOnly: true },
    { value: "invoices",         label: "Factures",           icon: FileText,         category: "gestion", adminOnly: true, disabled: true, disabledLabel: "Bientôt" },
    { value: "planning",         label: "Planning",           icon: CalendarDays,     category: "gestion", adminOnly: true },
    { value: "pointage-history", label: "Historique pointage",icon: Clock,            category: "gestion", adminOnly: true },
    { value: "notifications",    label: "Notifications",      icon: Bell,             category: "gestion", adminOnly: true },
    { value: "inventory",        label: "Inventaire",         icon: Package,          category: "gestion", adminOnly: true, disabled: true, disabledLabel: "Bientôt" },
    { value: "users",            label: "Équipe",             icon: Users,            category: "gestion", adminOnly: true },
    { value: "delivery",         label: "Livraisons",         icon: Bike,             category: "gestion", adminOnly: true, disabled: true, disabledLabel: "Bientôt" },
    { value: "email",            label: "Campagnes email",    icon: Mail,             category: "gestion", adminOnly: true, disabled: true, disabledLabel: "Bientôt" },
    { value: "settings-restaurants", label: "Restaurant",    icon: Building2,        category: "gestion", adminOnly: true },
    // ── Paramètres ──
    { value: "theme",            label: "Thème",              icon: Palette,          category: "parametres" },
    { value: "settings-password",label: "Mot de passe",      icon: KeyRound,         category: "parametres", adminOnly: true },
    { value: "game",             label: "Jeu",                icon: Gamepad2,         category: "parametres" },
  ];

  const currentTabInfo = navItems.find((i) => i.value === activeTab);

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function handleTabChange(value: TabValue) {
    const item = navItems.find((i) => i.value === value);
    if (item?.disabled) { setMobileMenuOpen(false); return; }
    if (item?.adminOnly && !isAdminUnlocked) {
      setPendingTab(value);
      setShowPinModal(true);
      return;
    }
    setActiveTab(value);
    setMobileMenuOpen(false);
  }

  function handlePinSuccess() {
    unlock();
    if (pendingTab) { setActiveTab(pendingTab); setPendingTab(null); }
  }

  async function handleSignOut() {
    lock();
    await signOut();
    navigate({ to: "/staff/login" });
  }

  function handleLock() {
    lock();
    setActiveTab("kitchen");
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }

  // ── Nav item ────────────────────────────────────────────────────────────────

  function renderNavItem(item: NavItem, size: "sm" | "lg" = "sm") {
    const Icon = item.icon;
    const isActive = activeTab === item.value;
    const isDisabled = !!item.disabled;
    const base =
      size === "sm"
        ? "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all"
        : "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-base font-medium transition-all";
    return (
      <button
        key={item.value}
        type="button"
        disabled={isDisabled}
        onClick={() => handleTabChange(item.value)}
        className={`${base} ${
          isDisabled
            ? "cursor-not-allowed text-muted-foreground/40 opacity-60"
            : isActive
            ? "bg-primary/15 text-foreground shadow-sm ring-1 ring-primary/20"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }`}
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <Icon size={size === "sm" ? 15 : 18} />
        <span className="flex-1 text-left">{item.label}</span>
        {item.disabledLabel && (
          <span className="ml-auto rounded-full border border-border/50 bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {item.disabledLabel}
          </span>
        )}
        {!item.disabledLabel && item.badge != null && item.badge > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        )}
      </button>
    );
  }

  // ── Nav category ────────────────────────────────────────────────────────────

  function renderNavCategory(
    category: "cuisine" | "gestion" | "parametres",
    emoji: string,
    label: string,
    size: "sm" | "lg" = "sm"
  ) {
    const items = navItems.filter(
      (i) => i.category === category && (!i.adminOnly || isAdminUnlocked)
    );
    if (items.length === 0) return null;
    const open = openCategories[category];
    const totalBadge = items.reduce((acc, i) => acc + (i.badge ?? 0), 0);

    return (
      <div key={category}>
        <button
          type="button"
          onClick={() => toggleCategory(category)}
          className={`flex items-center justify-between w-full rounded-xl bg-muted/40 hover:bg-muted/60 transition-all group ${
            size === "sm" ? "px-3 py-2.5" : "px-4 py-3"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className={size === "sm" ? "text-lg" : "text-xl"}>{emoji}</span>
            <span
              className={`font-semibold text-foreground ${size === "sm" ? "text-sm" : "text-base"}`}
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {label}
            </span>
            {totalBadge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground animate-pulse">
                {totalBadge}
              </span>
            )}
          </div>
          <ChevronDown
            size={size === "sm" ? 15 : 18}
            className={`text-muted-foreground group-hover:text-foreground transition-transform ${open ? "" : "-rotate-90"}`}
          />
        </button>

        {open && (
          <div className="mt-1.5 pl-2">
            <div className="space-y-0.5 border-l-2 border-primary/20 pl-2">
              {items.map((item) => renderNavItem(item, size))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Tab content ─────────────────────────────────────────────────────────────

  function renderContent() {
    switch (activeTab) {
      case "kitchen":       return <KitchenView onCountChange={fetchBadges} />;
      case "orders":        return <OrdersView />;
      case "messages":      return isAdminUnlocked ? <MessagesView onRead={fetchBadges} /> : null;
      case "applications":  return isAdminUnlocked ? <ApplicationsView onRead={fetchBadges} /> : null;
      case "settings-restaurants": return isAdminUnlocked ? <RestaurantPage /> : null;
      case "settings-password":    return isAdminUnlocked ? <PasswordPage /> : null;
      case "timetracking":  return <TimetrackingView onGoToTeam={() => setActiveTab("users")} />;
      case "users":         return isAdminUnlocked ? <TeamView /> : null;
      case "products":      return isAdminUnlocked ? <ProductsView /> : null;
      case "promotions":    return isAdminUnlocked ? <PromotionsManagement /> : null;
      case "pointage-history": return isAdminUnlocked ? <PointageHistory /> : null;
      case "notifications":     return isAdminUnlocked ? <NotificationsHub /> : null;
      case "planning":          return isAdminUnlocked ? <PlanningsPage selectedRestaurant="crazy-toasty" /> : null;
      case "theme":         return <ThemePage currentTheme={currentTheme} setCurrentTheme={setCurrentTheme} />;
      case "game":          return <GamePage />;
      default:              return null;
    }
  }

  const cardBg = resolved === "dark" ? "oklch(0.21 0.07 270)" : "oklch(0.94 0.005 80)";
  const pageBg = resolved === "dark" ? "oklch(0.16 0.06 270)" : "oklch(0.97 0.005 80)";

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen text-foreground flex flex-col md:flex-row"
      style={{ ...themeVars, backgroundColor: pageBg }}
    >
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex flex-col border-r border-border sticky top-0 h-screen transition-all duration-300 overflow-hidden shrink-0"
        style={{ width: sidebarVisible ? "18rem" : "4rem", backgroundColor: cardBg }}
      >
        {/* Sidebar header */}
        <div className="border-b border-border shrink-0" style={{ padding: sidebarVisible ? "1.25rem" : "0.75rem" }}>
          {sidebarVisible ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg text-foreground tracking-widest leading-none">CRAZY TOASTY</p>
                <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-sans)" }}>Espace Staff</p>
              </div>
              {isAdminUnlocked ? (
                <button
                  onClick={handleLock}
                  className="shrink-0 flex flex-col items-center gap-1 px-2 py-1.5 bg-amber-500/15 border border-amber-500/35 rounded-xl text-amber-400 hover:bg-amber-500/25 transition-all"
                >
                  <ShieldCheck size={14} />
                  <span className="text-[9px] font-bold leading-none" style={{ fontFamily: "var(--font-sans)" }}>Manager</span>
                </button>
              ) : (
                <button
                  onClick={() => { setPendingTab(null); setShowPinModal(true); }}
                  className="shrink-0 flex flex-col items-center gap-1 px-2 py-1.5 border border-dashed border-muted-foreground/25 rounded-xl text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all group"
                >
                  <Shield size={14} />
                  <span className="text-[9px] font-medium leading-none group-hover:font-semibold" style={{ fontFamily: "var(--font-sans)" }}>Staff</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles size={15} className="text-primary" />
              </div>
              {isAdminUnlocked ? (
                <button onClick={handleLock} title="Verrouiller Manager" className="p-1.5 bg-amber-500/15 border border-amber-500/35 rounded-lg text-amber-400 hover:bg-amber-500/25 transition-all">
                  <ShieldCheck size={14} />
                </button>
              ) : (
                <button onClick={() => { setPendingTab(null); setShowPinModal(true); }} title="Déverrouiller Manager" className="p-1.5 border border-dashed border-muted-foreground/25 rounded-lg text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
                  <Shield size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar nav */}
        {sidebarVisible ? (
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-3">
              {renderNavCategory("cuisine", "🍳", "Cuisine")}
              {renderNavCategory("gestion", "📊", "Gestion")}
              {renderNavCategory("parametres", "⚙️", "Paramètres")}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-3">
            <div className="flex flex-col items-center gap-1 px-1.5">
              {navItems
                .filter((i) => !i.disabled && (!i.adminOnly || isAdminUnlocked))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      title={item.label}
                      onClick={() => handleTabChange(item.value)}
                      className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-primary/15 text-foreground ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <Icon size={15} />
                      {item.badge != null && item.badge > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                          {item.badge > 9 ? "9+" : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Sidebar footer */}
        <div
          className="border-t border-border shrink-0"
          style={
            sidebarVisible
              ? { padding: "0.625rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.375rem" }
              : { padding: "0.375rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }
          }
        >
          {sidebarVisible ? (
            <>
              <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User size={11} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate leading-tight" style={{ fontFamily: "var(--font-sans)" }}>{user?.email}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight" style={{ fontFamily: "var(--font-sans)" }}>Espace Staff</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center gap-1.5 w-full h-7 rounded-lg border border-border/50 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <LogOut size={12} /> Déconnexion
              </button>
            </>
          ) : (
            <>
              <button title={user?.email ?? "Profil"} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={13} className="text-primary" />
              </button>
              <button title="Déconnexion" onClick={handleSignOut} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
                <LogOut size={13} />
              </button>
            </>
          )}

          <button
            onClick={() => setSidebarVisible((v) => !v)}
            title={sidebarVisible ? "Réduire" : "Agrandir"}
            className="flex items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            style={
              sidebarVisible
                ? { width: "100%", height: "1.5rem", gap: "0.375rem", fontSize: "0.6875rem", fontFamily: "var(--font-sans)" }
                : { width: "2rem", height: "2rem" }
            }
          >
            {sidebarVisible ? (<><ChevronLeft size={13} /><span>Réduire</span></>) : <ChevronRight size={13} />}
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen md:min-h-0">

        {/* Desktop header */}
        <header
          className="hidden md:flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 z-10 backdrop-blur-sm"
          style={{ backgroundColor: resolved === "dark" ? "oklch(0.21 0.07 270 / 0.8)" : "oklch(0.94 0.005 80 / 0.85)" }}
        >
          <div className="flex items-center gap-3">
            {currentTabInfo && (
              <>
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <currentTabInfo.icon size={17} className="text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                    {currentTabInfo.label}
                  </p>
                  <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                    {activeTab === "kitchen" && "Gérez les commandes en cours"}
                    {activeTab === "orders" && "Consultez l'historique des commandes"}
                    {activeTab === "messages" && "Messages des clients"}
                    {activeTab === "applications" && "Candidatures reçues"}
                    {activeTab === "theme" && "Personnalisez l'apparence"}
                    {activeTab === "settings-password" && "Modifier votre mot de passe"}
                    {activeTab === "settings-restaurants" && "Configuration du restaurant"}
                    {activeTab === "game" && "Détendez-vous un peu"}
                  </p>
                </div>
              </>
            )}
          </div>
          {/* Theme toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl border border-border/40 bg-muted/20">
            {(["light", "dark", "auto"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setCurrentTheme(t)}
                title={t === "light" ? "Clair" : t === "dark" ? "Sombre" : "Auto"}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  currentTheme === t
                    ? "bg-primary/15 text-foreground ring-1 ring-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "light" ? "☀️" : t === "dark" ? "🌙" : "🌗"}
              </button>
            ))}
          </div>
        </header>

        {/* Mobile header */}
        <header className="md:hidden border-b border-border sticky top-0 z-50" style={{ backgroundColor: cardBg }}>
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <span className="font-display text-lg text-foreground tracking-widest leading-none">CRAZY TOASTY</span>
            </div>
            <div className="flex items-center gap-2">
              {isAdminUnlocked ? (
                <button
                  onClick={handleLock}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 rounded-full text-[11px] font-semibold text-amber-400 hover:bg-amber-500/25 transition-all"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <ShieldCheck size={13} /> Manager <Lock size={10} className="opacity-70" />
                </button>
              ) : (
                <button
                  onClick={() => { setPendingTab(null); setShowPinModal(true); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-muted-foreground/30 rounded-full text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <Shield size={13} /> Staff <Lock size={10} />
                </button>
              )}
              <button onClick={handleSignOut} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile nav overlay */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 top-[57px] z-40 overflow-auto"
            style={{
              backgroundColor: resolved === "dark" ? "oklch(0.16 0.06 270 / 0.98)" : "oklch(0.97 0.005 80 / 0.98)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="p-4 space-y-3">
              {renderNavCategory("cuisine", "🍳", "Cuisine", "lg")}
              {renderNavCategory("gestion", "📊", "Gestion", "lg")}
              {renderNavCategory("parametres", "⚙️", "Paramètres", "lg")}

              <hr className="border-border/40 my-4" />

              <div className="px-4 py-3 bg-muted/20 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{user?.email}</p>
                  <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Espace Staff</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                {(["light", "dark", "auto"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCurrentTheme(t)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      currentTheme === t
                        ? "bg-primary/15 border-primary/30 text-foreground"
                        : "border-border/50 text-muted-foreground"
                    }`}
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {t === "light" ? "☀️ Clair" : t === "dark" ? "🌙 Sombre" : "🌗 Auto"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile bottom tab bar */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border z-40"
          style={{
            backgroundColor: resolved === "dark" ? "oklch(0.21 0.07 270 / 0.95)" : "oklch(0.94 0.005 80 / 0.95)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex justify-around items-center py-2 px-1">
            {navItems
              .filter((i) => !i.disabled && (!i.adminOnly || isAdminUnlocked))
              .slice(0, 4)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleTabChange(item.value)}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] transition-all ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <div className="relative">
                      <Icon size={20} className={isActive ? "scale-110" : ""} />
                      {item.badge != null && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {item.badge > 9 ? "9+" : item.badge}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`} style={{ fontFamily: "var(--font-sans)" }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] text-muted-foreground"
            >
              <Menu size={20} />
              <span className="text-[10px] font-medium" style={{ fontFamily: "var(--font-sans)" }}>Plus</span>
            </button>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-x-hidden px-4 md:px-8 py-6 pb-24 md:pb-8">
          {/* Notification badge summary if gestion section has badge */}
          {notifBadge > 0 && activeTab === "kitchen" && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{notifBadge}</span>
              {notifBadge === 1 ? "1 nouveau message ou candidature en attente" : `${notifBadge} nouveaux messages ou candidatures en attente`}
            </div>
          )}
          {renderContent()}
        </main>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full border border-border/50 shadow-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          style={{ backgroundColor: cardBg }}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <PinModal
          onClose={() => { setShowPinModal(false); setPendingTab(null); }}
          onSuccess={handlePinSuccess}
        />
      )}

      <Toaster />
    </div>
  );
}

// ─── Theme Page ───────────────────────────────────────────────────────────────

function ThemePage({ currentTheme, setCurrentTheme }: { currentTheme: StaffTheme; setCurrentTheme: (t: StaffTheme) => void }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-4">
        <p className="text-base font-semibold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>Apparence</p>
        <div className="grid grid-cols-3 gap-4">
          {([
            { value: "light" as const, label: "Clair",  preview: "bg-white border-gray-200" },
            { value: "dark"  as const, label: "Sombre", preview: "bg-gray-900 border-gray-700" },
            { value: "auto"  as const, label: "Auto",   preview: "bg-gradient-to-br from-white to-gray-900 border-gray-400" },
          ]).map(({ value, label, preview }) => (
            <button
              key={value}
              onClick={() => setCurrentTheme(value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                currentTheme === value ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/50"
              }`}
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <div className={`w-12 h-12 rounded-full border-2 shadow-inner ${preview}`} />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center pt-2" style={{ fontFamily: "var(--font-sans)" }}>
          Le thème s'applique uniquement à l'interface du portail staff
        </p>
      </div>
    </div>
  );
}

// ─── Password Page ────────────────────────────────────────────────────────────

function PasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) { toast.error("Les mots de passe ne correspondent pas."); return; }
    if (newPassword.length < 8) { toast.error("Minimum 8 caractères."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe mis à jour.");
    setNewPassword(""); setConfirm("");
  }

  return (
    <div className="max-w-md">
      <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
        <p className="mb-5 text-base font-semibold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>Changer le mot de passe</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-foreground outline-none focus:border-primary/40"
              style={{ fontFamily: "var(--font-sans)" }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              Confirmer
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-foreground outline-none focus:border-primary/40"
              style={{ fontFamily: "var(--font-sans)" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {loading ? "Mise à jour..." : "Mettre à jour"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Restaurant Page ──────────────────────────────────────────────────────────

type RestaurantSettings = {
  id: string;
  is_open: boolean;
  opening_time: string;
  closing_time: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  click_collect_enabled: boolean;
  delivery_enabled: boolean;
  delivery_max_km: number;
  delivery_base_fee: number;
  delivery_fee_per_km: number;
  delivery_min_order: number;
};

function RestaurantPage() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState<"info" | "delivery">("info");
  const [saving, setSaving] = useState(false);
  const [ccLoading, setCcLoading] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // edit form fields
  const [openingTime, setOpeningTime] = useState("11:00");
  const [closingTime, setClosingTime] = useState("22:00");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryMaxKm, setDeliveryMaxKm] = useState(5);
  const [deliveryBaseFee, setDeliveryBaseFee] = useState(2.5);
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState(0.5);
  const [deliveryMinOrder, setDeliveryMinOrder] = useState(15);

  useEffect(() => {
    supabase
      .from("restaurant_settings")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          const d = data as RestaurantSettings;
          setSettings(d);
          setOpeningTime(d.opening_time.substring(0, 5));
          setClosingTime(d.closing_time.substring(0, 5));
          setAddress(d.address ?? "");
          setPhone(d.phone ?? "");
          setEmail(d.email ?? "");
          setNotes(d.notes ?? "");
          setDeliveryMaxKm(d.delivery_max_km);
          setDeliveryBaseFee(d.delivery_base_fee);
          setDeliveryFeePerKm(d.delivery_fee_per_km);
          setDeliveryMinOrder(d.delivery_min_order);
        }
        setLoading(false);
      });
  }, []);

  async function toggleCC(value: boolean) {
    if (!settings) return;
    setCcLoading(true);
    setSettings((s) => (s ? { ...s, click_collect_enabled: value } : s));
    const { error } = await supabase
      .from("restaurant_settings")
      .update({ click_collect_enabled: value })
      .eq("id", settings.id);
    setCcLoading(false);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      setSettings((s) => (s ? { ...s, click_collect_enabled: !value } : s));
    } else {
      toast.success(value ? "Click & Collect ouvert" : "Click & Collect fermé");
    }
  }

  async function toggleDelivery(value: boolean) {
    if (!settings) return;
    setDeliveryLoading(true);
    setSettings((s) => (s ? { ...s, delivery_enabled: value } : s));
    const { error } = await supabase
      .from("restaurant_settings")
      .update({ delivery_enabled: value })
      .eq("id", settings.id);
    setDeliveryLoading(false);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      setSettings((s) => (s ? { ...s, delivery_enabled: !value } : s));
    } else {
      toast.success(value ? "Livraison activée" : "Livraison désactivée");
    }
  }

  async function saveInfo() {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("restaurant_settings")
      .update({
        opening_time: openingTime,
        closing_time: closingTime,
        address: address || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
      })
      .eq("id", settings.id);
    if (!error) {
      setSettings((s) => s ? {
        ...s, opening_time: openingTime, closing_time: closingTime,
        address: address || null, phone: phone || null,
        email: email || null, notes: notes || null,
      } : s);
      toast.success("Informations sauvegardées");
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  }

  async function saveDelivery() {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("restaurant_settings")
      .update({
        delivery_max_km: deliveryMaxKm,
        delivery_base_fee: deliveryBaseFee,
        delivery_fee_per_km: deliveryFeePerKm,
        delivery_min_order: deliveryMinOrder,
      })
      .eq("id", settings.id);
    if (!error) {
      setSettings((s) => s ? {
        ...s, delivery_max_km: deliveryMaxKm, delivery_base_fee: deliveryBaseFee,
        delivery_fee_per_km: deliveryFeePerKm, delivery_min_order: deliveryMinOrder,
      } : s);
      toast.success("Paramètres livraison sauvegardés");
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-2xl border border-border/50 bg-card/50 p-8 text-center space-y-2">
          <Building2 size={32} className="text-muted-foreground/40 mx-auto" />
          <p className="font-medium text-foreground">Table non configurée</p>
          <p className="text-xs text-muted-foreground">
            Exécutez le SQL <code className="bg-muted px-1 py-0.5 rounded text-[11px]">restaurant_settings</code> dans Supabase puis rechargez.
          </p>
        </div>
      </div>
    );
  }

  const lbl = "block text-xs font-medium text-muted-foreground mb-1.5";
  const inp = "w-full rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50";
  const Toggle = ({ on, onClick, loading: tLoading }: { on: boolean; onClick: () => void; loading: boolean }) =>
    tLoading
      ? <Loader2 size={16} className="animate-spin text-muted-foreground" />
      : <button type="button" onClick={onClick}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-green-500" : "bg-muted-foreground/30"}`}>
          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
        </button>;

  return (
    <div className="max-w-2xl space-y-5">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
        <p className="text-lg font-bold text-foreground">🏪 Paramètres du Restaurant</p>
        <p className="text-sm text-muted-foreground mt-0.5">Configurez les informations et les services</p>
      </div>

      {/* ── Restaurant card ───────────────────────────────────── */}
      <div className={`rounded-2xl border bg-card/50 transition-all ${editing ? "ring-2 ring-primary border-primary/40" : "border-border/50 hover:border-primary/40"}`}>

        {/* Card header — click to edit */}
        <button type="button" className="w-full text-left px-5 pt-5 pb-3"
          onClick={() => { setEditing((v) => !v); setEditTab("info"); }}>
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-primary shrink-0" />
            <span className="font-semibold text-foreground">Crazy Toasty</span>
          </div>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {settings.address && (
              <p className="flex items-center gap-1.5"><MapPin size={11} className="shrink-0" />{settings.address}</p>
            )}
            {settings.phone && (
              <p className="flex items-center gap-1.5"><Phone size={11} className="shrink-0" />{settings.phone}</p>
            )}
            <p className="flex items-center gap-1.5">
              <Clock size={11} className="shrink-0" />
              {settings.opening_time.substring(0, 5)} — {settings.closing_time.substring(0, 5)}
            </p>
          </div>
        </button>

        {/* Service toggles */}
        <div className="px-5 pb-5 pt-2 border-t border-border/40 mt-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={15} className={settings.click_collect_enabled ? "text-green-500" : "text-muted-foreground"} />
              <div>
                <p className="text-sm font-medium text-foreground">Click &amp; Collect</p>
                <p className="text-xs text-muted-foreground">{settings.click_collect_enabled ? "Ouvert" : "Fermé"}</p>
              </div>
            </div>
            <Toggle on={settings.click_collect_enabled} onClick={() => toggleCC(!settings.click_collect_enabled)} loading={ccLoading} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bike size={15} className={settings.delivery_enabled ? "text-green-500" : "text-muted-foreground"} />
              <div>
                <p className="text-sm font-medium text-foreground">Livraison</p>
                <p className="text-xs text-muted-foreground">{settings.delivery_enabled ? "Activée" : "Désactivée"}</p>
              </div>
            </div>
            <Toggle on={settings.delivery_enabled} onClick={() => toggleDelivery(!settings.delivery_enabled)} loading={deliveryLoading} />
          </div>
        </div>
      </div>

      {/* ── Edit panel (expanded on click) ────────────────────── */}
      {editing && (
        <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-border/50">
            {(["info", "delivery"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setEditTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${editTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {tab === "info" ? <><MapPin size={13} />Informations</> : <><Bike size={13} />Livraison</>}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {editTab === "info" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Heure d'ouverture</label>
                    <input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Heure de fermeture</label>
                    <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} className={inp} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Adresse</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="Ex: 12 rue de la Paix, 75001 Paris" className={inp} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Téléphone</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="06 XX XX XX XX" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@crazytoasty.fr" className={inp} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    placeholder="Informations supplémentaires…" className={`${inp} resize-none`} />
                </div>
                <button type="button" onClick={saveInfo} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </>
            )}

            {editTab === "delivery" && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Rayon max (km)</label>
                    <input type="number" step="0.5" min="1" max="30" value={deliveryMaxKm}
                      onChange={e => setDeliveryMaxKm(parseFloat(e.target.value) || 5)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Frais de base (€)</label>
                    <input type="number" step="0.5" min="0" value={deliveryBaseFee}
                      onChange={e => setDeliveryBaseFee(parseFloat(e.target.value) || 0)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Frais par km (€)</label>
                    <input type="number" step="0.1" min="0" value={deliveryFeePerKm}
                      onChange={e => setDeliveryFeePerKm(parseFloat(e.target.value) || 0)} className={inp} />
                  </div>
                </div>
                <div className="max-w-[180px]">
                  <label className={lbl}>Commande minimum (€)</label>
                  <input type="number" step="1" min="0" value={deliveryMinOrder}
                    onChange={e => setDeliveryMinOrder(parseFloat(e.target.value) || 0)} className={inp} />
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Exemple :</span> livraison à 3 km →{" "}
                  {deliveryBaseFee.toFixed(2)}€ + (3 × {deliveryFeePerKm.toFixed(2)}€) ={" "}
                  <span className="font-semibold text-primary">{(deliveryBaseFee + 3 * deliveryFeePerKm).toFixed(2)}€</span>
                </div>
                <button type="button" onClick={saveDelivery} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Game Page ────────────────────────────────────────────────────────────────

function GamePage() {
  const [showGame, setShowGame] = useState(false);
  const [score, setScore] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const gameUrl = 'https://crazytoasty.fr/jeu';
  const googleReviewUrl = 'https://g.page/r/CczrmSXmCqF0EBM/review';

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); setRunning(false); setActive(null); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const show = () => setActive(Math.floor(Math.random() * 9));
    show();
    const t = setInterval(show, 900);
    return () => clearInterval(t);
  }, [running]);

  function start() { setScore(0); setTimeLeft(30); setRunning(true); }
  function hit(i: number) {
    if (i === active) { setScore((s) => s + 1); setActive(null); }
  }

  if (!showGame) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px' }}>QR Code Client</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Scanne pour accéder au jeu ou laisser un avis</p>
        </div>
        <div id='crazy-qr-code' style={{ padding: '20px', background: 'white', borderRadius: '16px', border: '3px solid #f97316', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
<QRCodeSVG value={gameUrl} size={200} level="H" includeMargin />
        </div>
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>{gameUrl}</p>
        <button onClick={() => {
          const svg = document.querySelector('#crazy-qr-code svg') as SVGElement;
          if (!svg) return;
          const svgData = new XMLSerializer().serializeToString(svg);
          const canvas = document.createElement('canvas');
          canvas.width = 512; canvas.height = 512;
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.onload = () => {
            if (ctx) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, 512, 512);
              ctx.drawImage(img, 0, 0, 512, 512);
              const link = document.createElement('a');
              link.download = 'qr-code-crazytoasty.png';
              link.href = canvas.toDataURL('image/png');
              link.click();
            }
          };
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        }}
          style={{ padding: '10px 20px', background: '#1e293b', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
          ⬇️ Télécharger le QR code
        </button>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => { setShowGame(true); setScore(0); setTimeLeft(30); setRunning(false); }}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
            🎮 Jouer
          </button>
          <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer"
            style={{ padding: '10px 20px', background: '#4285f4', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '700', cursor: 'pointer', textDecoration: 'none' }}>
            ⭐ Avis Google
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-10 gap-6">
      <div className="text-center">
        <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>🍞 Attrape le Toast !</p>
        <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "var(--font-sans)" }}>Un mini-jeu pour se détendre entre deux services</p>
      </div>

      <div className="flex items-center gap-8 text-center">
        <div>
          <p className="text-3xl font-bold text-primary">{score}</p>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Score</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-foreground">{timeLeft}s</p>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Temps</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            onClick={() => hit(i)}
            className={`w-20 h-20 rounded-2xl border-2 text-3xl transition-all active:scale-90 ${
              active === i
                ? "border-primary bg-primary/20 scale-105"
                : "border-border/40 bg-card/40 hover:bg-muted/30"
            }`}
          >
            {active === i ? "🍞" : ""}
          </button>
        ))}
      </div>

      {!running && (
        <button
          onClick={start}
          className="rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition hover:opacity-90"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {timeLeft === 0 ? `Rejouer (score: ${score})` : "Commencer"}
        </button>
      )}
    </div>
  );
}

// ─── Forced Order Notification ───────────────────────────────────────────────

function ForcedOrderNotification({
  orderCount,
  firstOrder,
  onValidate,
  onStartPreparing,
}: {
  orderCount: number;
  firstOrder: Order | null;
  onValidate: () => void;
  onStartPreparing: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-3xl border-4 border-yellow-500 bg-card p-6 shadow-2xl shadow-yellow-500/30">
        <div className="mb-4 flex justify-center">
          <div className="animate-bounce rounded-full bg-yellow-500 p-4">
            <Bell className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mb-1 text-center text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
          🔔 NOUVELLE COMMANDE !
        </h2>
        <p className="mb-4 text-center text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
          {orderCount} commande{orderCount > 1 ? "s" : ""} à traiter
        </p>
        {firstOrder && (
          <div className="mb-4 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4">
            <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{firstOrder.customer_name}</p>
            <a href={`tel:${firstOrder.customer_phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary" style={{ fontFamily: "var(--font-sans)" }}>
              <Phone className="h-4 w-4" /> {firstOrder.customer_phone}
            </a>
            <div className="mt-3 space-y-1.5">
              {(firstOrder.items as OrderItem[]).map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">{item.quantity}</span>
                  <span className="font-semibold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{item.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-right text-2xl font-bold text-primary" style={{ fontFamily: "var(--font-sans)" }}>{formatEuro(firstOrder.total_cents)}</p>
          </div>
        )}
        <div className="grid gap-2">
          {firstOrder && (
            <button
              onClick={() => { onStartPreparing(firstOrder.id); onValidate(); }}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-lg font-bold text-white transition hover:bg-orange-600 active:scale-[0.98]"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <ChefHat className="h-6 w-6" /> Commencer la préparation
            </button>
          )}
          <button
            onClick={onValidate}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-muted/40 text-base font-semibold text-foreground transition hover:bg-muted/60"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Vu !
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kitchen View ─────────────────────────────────────────────────────────────

function KitchenView({ onCountChange }: { onCountChange: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [kitchenTab, setKitchenTab] = useState<"commandes" | "historique">("commandes");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "preparing" | "ready">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newOrderAlert, setNewOrderAlert] = useState<{ count: number; orderIds: string[] } | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const hasInitialized = useRef(false);
  const prevOrderIds = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(async () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      setIsAudioReady(true);
      return true;
    } catch { return false; }
  }, []);

  // Warm up audio on first user interaction
  useEffect(() => {
    const warmup = () => { initAudio(); };
    document.addEventListener("click", warmup, { once: true });
    document.addEventListener("touchstart", warmup, { once: true });
    return () => {
      document.removeEventListener("click", warmup);
      document.removeEventListener("touchstart", warmup);
    };
  }, [initAudio]);

  const playNewOrderSound = useCallback(async () => {
    try {
      await initAudio();
      const ctx = audioCtxRef.current!;
      const tone = (freq: number, t: number, dur: number) => {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + t);
        g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + t + 0.02);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + t + dur);
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + dur + 0.1);
      };
      tone(880, 0, 0.2); tone(1100, 0.25, 0.2); tone(880, 0.5, 0.3);
    } catch {}
  }, [initAudio]);

  const testSound = async () => {
    const ok = await initAudio();
    if (ok) {
      await playNewOrderSound();
      toast.success("🔔 Test sonore joué");
    } else {
      toast.error("Cliquez d'abord quelque part pour activer le son");
    }
  };

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["pending", "preparing", "ready", "completed"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      const all = data as Order[];
      const activeIds = new Set(all.filter(o => o.status !== "completed").map(o => o.id));
      if (hasInitialized.current) {
        const newOnes = [...activeIds].filter(id => !prevOrderIds.current.has(id));
        if (newOnes.length > 0) {
          playNewOrderSound();
          setNewOrderAlert({ count: newOnes.length, orderIds: newOnes });
          toast.success(`🔔 ${newOnes.length} nouvelle${newOnes.length > 1 ? "s" : ""} commande${newOnes.length > 1 ? "s" : ""} !`);
        }
      } else {
        hasInitialized.current = true;
      }
      prevOrderIds.current = activeIds;
      setOrders(all);
    }
    setLoading(false);
    onCountChange();
  }, [onCountChange, playNewOrderSound]);

  useEffect(() => {
    loadOrders();
    const ch = supabase
      .channel("ct-kitchen-v3")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, loadOrders)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, loadOrders)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, loadOrders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadOrders]);

  // 20s polling fallback when tab visible
  useEffect(() => {
    let iv: number | null = null;
    const start = () => { if (iv != null) return; iv = window.setInterval(() => { if (document.visibilityState === "visible") loadOrders(); }, 20000); };
    const stop = () => { if (iv != null) { window.clearInterval(iv); iv = null; } };
    const h = () => (document.visibilityState === "visible" ? (loadOrders(), start()) : stop());
    h();
    document.addEventListener("visibilitychange", h);
    return () => { document.removeEventListener("visibilitychange", h); stop(); };
  }, [loadOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) { toast.error("Impossible de mettre à jour."); return; }
    const statusLabels: Partial<Record<OrderStatus, string>> = {
      preparing: "En cuisine ✓",
      ready:     "Client alerté ✓",
      completed: "Récupérée ✓",
    };
    if (statusLabels[newStatus]) toast.success(`${statusLabels[newStatus]} — #${orderId.slice(0, 6)}`);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    onCountChange();

    if (newStatus === "ready" || newStatus === "completed") {
      const order = orders.find(o => o.id === orderId);
      if (order?.customer_email) {
        supabase.functions.invoke("send-status-email", {
          body: {
            order_id: orderId,
            customer_email: order.customer_email,
            customer_name: order.customer_name,
            status: newStatus,
          },
        }).catch(() => {});
      }
    }
  };

  const archiveCompletedOrders = () => {
    const n = orders.filter(o => o.status === "completed").length;
    if (n === 0) { toast.info("Pas de commandes terminées"); return; }
    setOrders(prev => prev.filter(o => o.status !== "completed"));
    toast.success(`✓ Service terminé — ${n} commande${n > 1 ? "s" : ""} archivée${n > 1 ? "s" : ""}`);
  };

  const activeOrders = orders.filter(o => ["pending", "preparing", "ready"].includes(o.status));
  const historyOrders = orders.filter(o => o.status === "completed");
  const pendingCount = activeOrders.filter(o => o.status === "pending").length;
  const preparingCount = activeOrders.filter(o => o.status === "preparing").length;
  const readyForPickupCount = activeOrders.filter(o => o.status === "ready").length;

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchesSearch = (o: Order) =>
    !normalizedSearch ||
    [o.customer_name, o.customer_phone, o.id].join(" ").toLowerCase().includes(normalizedSearch);

  const filteredActive = activeOrders
    .filter(o => statusFilter === "all" || o.status === statusFilter)
    .filter(matchesSearch)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const filteredHistory = historyOrders.filter(matchesSearch).slice(0, 20);
  const firstPendingOrder = activeOrders.find(o => o.status === "pending") ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Forced fullscreen notification ── */}
      {newOrderAlert && (
        <ForcedOrderNotification
          orderCount={newOrderAlert.count}
          firstOrder={firstPendingOrder}
          onValidate={() => setNewOrderAlert(null)}
          onStartPreparing={(id) => updateOrderStatus(id, "preparing")}
        />
      )}

      {/* ── Sticky control bar ── */}
      <div className="sticky top-0 z-20 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {pendingCount > 0 && (
              <span className="animate-pulse rounded-full bg-destructive px-3 py-1 text-sm font-bold text-destructive-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                {pendingCount} à traiter
              </span>
            )}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setKitchenTab("commandes")}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all ${kitchenTab === "commandes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Commandes</span>
                <span className={`ml-0.5 rounded-full px-1.5 text-xs font-bold ${kitchenTab === "commandes" ? "bg-white/20 text-white" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                  {activeOrders.length}
                </span>
              </button>
              <button
                onClick={() => setKitchenTab("historique")}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all ${kitchenTab === "historique" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Historique</span>
                <span className={`ml-0.5 rounded-full px-1.5 text-xs font-bold ${kitchenTab === "historique" ? "bg-white/20 text-white" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                  {historyOrders.length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Status filters */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setStatusFilter("all")}
                className={`h-8 rounded-lg px-3 text-sm transition-all ${statusFilter === "all" ? "bg-primary text-primary-foreground ring-2 ring-blue-400" : "text-muted-foreground hover:bg-muted/40"}`}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <strong className="mr-1">{activeOrders.length}</strong>Tous
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`flex h-8 items-center gap-1 rounded-lg px-3 text-sm transition-all ${statusFilter === "pending" ? "bg-primary text-primary-foreground ring-2 ring-blue-400" : "text-muted-foreground hover:bg-muted/40"}`}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                <strong className="mx-1">{pendingCount}</strong>Nouvelle
              </button>
              <button
                onClick={() => setStatusFilter("preparing")}
                className={`flex h-8 items-center gap-1 rounded-lg px-3 text-sm transition-all ${statusFilter === "preparing" ? "bg-primary text-primary-foreground ring-2 ring-blue-400" : "text-muted-foreground hover:bg-muted/40"}`}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
                <strong className="mx-1">{preparingCount}</strong>En préparation
              </button>
              <button
                onClick={() => setStatusFilter("ready")}
                className={`flex h-8 items-center gap-1 rounded-lg px-3 text-sm transition-all ${statusFilter === "ready" ? "bg-primary text-primary-foreground ring-2 ring-blue-400" : "text-muted-foreground hover:bg-muted/40"}`}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                <strong className="mx-1">{readyForPickupCount}</strong>Prêtes
              </button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher client ou commande"
                className="h-8 w-56 rounded-lg border border-border bg-background pl-8 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
                style={{ fontFamily: "var(--font-sans)" }}
              />
            </div>

            {/* Audio status */}
            <div
              className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs ${isAudioReady ? "bg-green-500/15 text-green-600" : "bg-yellow-500/15 text-yellow-600"}`}
              title={isAudioReady ? "Son actif" : "Cliquez pour activer le son"}
            >
              <Volume2 className="h-3.5 w-3.5" />
            </div>

            {/* Test sound */}
            <button
              onClick={testSound}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
              title="Tester le son"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>

            {/* Refresh */}
            <button
              onClick={loadOrders}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
              title="Actualiser"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* Archive */}
            {historyOrders.length > 0 && kitchenTab === "historique" && (
              <button
                onClick={archiveCompletedOrders}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 text-xs font-semibold text-destructive transition-all hover:bg-destructive/20"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Archiver</span> ({historyOrders.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Commandes tab ── */}
      {kitchenTab === "commandes" && (
        filteredActive.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-20 text-center">
            <Bell className="mx-auto mb-4 h-20 w-20 text-muted-foreground" />
            <h2 className="mb-2 text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>Aucune commande</h2>
            <p className="text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              {searchQuery.trim() ? "Aucune commande ne correspond à votre recherche." : "Les commandes actives apparaîtront ici."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredActive.map(order => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                onPrepare={() => updateOrderStatus(order.id, "preparing")}
                onReady={() => updateOrderStatus(order.id, "ready")}
                onComplete={() => updateOrderStatus(order.id, "completed")}
              />
            ))}
          </div>
        )
      )}

      {/* ── Historique tab ── */}
      {kitchenTab === "historique" && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-3">
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-sans)" }}>Commandes terminées</h3>
          </div>
          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              Aucune commande terminée
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredHistory.map(order => (
                <div key={order.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-muted-foreground">#{order.id.slice(0, 6)}</span>
                    <span className="font-medium text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                      {(order.items as OrderItem[]).length} article{(order.items as OrderItem[]).length > 1 ? "s" : ""}
                    </span>
                    <span className="text-2xl font-bold text-primary" style={{ fontFamily: "var(--font-sans)" }}>
                      {formatEuro(order.total_cents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KitchenOrderCard({
  order, onPrepare, onReady, onComplete,
}: {
  order: Order;
  onPrepare: () => void;
  onReady: () => void;
  onComplete: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [hasAlerted, setHasAlerted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const status = order.status as OrderStatus;

  const playOverdueAlert = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const beep = (freq: number, t: number, dur: number) => {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
        g.gain.setValueAtTime(0, ctx.currentTime + t);
        g.gain.linearRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
        g.gain.setValueAtTime(0.4, ctx.currentTime + t + dur - 0.05);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + t + dur);
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + dur);
      };
      beep(600, 0, 0.2); beep(400, 0.25, 0.3);
    } catch {}
  }, []);

  useEffect(() => {
    const orderDate = new Date(order.created_at);
    const tick = () => {
      const s = Math.floor((Date.now() - orderDate.getTime()) / 1000);
      setElapsed(s);
      if (s >= 900 && !hasAlerted && ["pending", "preparing"].includes(status)) {
        playOverdueAlert();
        setHasAlerted(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [order.created_at, status, hasAlerted, playOverdueAlert]);

  const fmtElapsed = (s: number): string => {
    const m = Math.floor(s / 60), secs = s % 60;
    if (m >= 60) { const h = Math.floor(m / 60); return `${h}h${String(m % 60).padStart(2, "0")}`; }
    return `${m}:${String(secs).padStart(2, "0")}`;
  };

  const isPending = status === "pending";
  const isOverdue = elapsed >= 900 && ["pending", "preparing"].includes(status);

  const timerColor =
    status === "completed" || status === "ready" ? "text-green-500"
    : elapsed < 300 ? "text-green-500"
    : elapsed < 600 ? "text-yellow-500"
    : elapsed < 900 ? "text-orange-500"
    : "text-red-500";

  const cardClass = ({
    pending:   "border-yellow-500 bg-yellow-500/10",
    preparing: "border-orange-500 bg-orange-500/10",
    ready:     "border-green-500 bg-green-500/10",
    completed: "border-muted bg-muted/50",
    cancelled: "border-muted bg-muted/50",
  } as Record<string, string>)[status] ?? "border-border";

  const statusInfo = ({
    pending:   { label: "NOUVELLE",       Icon: Clock,    color: "text-yellow-500" },
    preparing: { label: "EN PRÉPARATION", Icon: ChefHat,  color: "text-orange-500" },
    ready:     { label: "PRÊTE",          Icon: Package,  color: "text-green-500"  },
    completed: { label: "RÉCUPÉRÉE",      Icon: Check,    color: "text-muted-foreground" },
    cancelled: { label: "ANNULÉE",        Icon: XCircle,  color: "text-muted-foreground" },
  } as Record<string, { label: string; Icon: React.ElementType; color: string }>)[status]
    ?? { label: status.toUpperCase(), Icon: Clock, color: "text-muted-foreground" };

  const statusFullText: Record<string, string> = {
    pending:   "Nouvelle commande",
    preparing: "Commande en cours de préparation",
    ready:     "Commande prête",
    completed: "Commande récupérée",
    cancelled: "Commande annulée",
  };

  const { Icon: StatusIcon } = statusInfo;
  const itemCount = (order.items as OrderItem[]).length;

  return (
    <div className={`overflow-hidden rounded-2xl border-4 transition-all ${cardClass} ${isPending ? "shadow-2xl shadow-yellow-500/30" : ""} ${isOverdue ? "ring-4 ring-red-500 ring-opacity-50" : ""}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${isPending ? "bg-yellow-500" : isOverdue ? "bg-red-500" : "bg-card"}`}>
        <div className={`flex items-center gap-2 font-bold text-lg ${isPending || isOverdue ? "text-white" : statusInfo.color}`} style={{ fontFamily: "var(--font-sans)" }}>
          {isOverdue ? <AlertTriangle className="h-6 w-6" /> : <StatusIcon className="h-6 w-6" />}
          {isOverdue ? "EN RETARD" : statusInfo.label}
        </div>
        <div className={`flex items-center gap-1.5 font-mono text-lg font-bold ${isPending || isOverdue ? "text-white" : timerColor}`}>
          <Timer className="h-5 w-5" /> {fmtElapsed(elapsed)}
        </div>
        <span className={`font-mono text-lg ${isPending || isOverdue ? "text-white/80" : "text-muted-foreground"}`}>
          #{order.id.slice(0, 6).toUpperCase()}
        </span>
      </div>

      {/* Body */}
      <div className="space-y-4 bg-card p-4">
        {/* Client */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{order.customer_name}</p>
            <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary" style={{ fontFamily: "var(--font-sans)" }}>
              <Phone className="h-4 w-4" /> {order.customer_phone}
            </a>
            <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              Statut : {statusFullText[status] ?? statusFullText.pending}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-lg border border-border px-3 py-1 font-mono text-base">
              {fmtTime(order.created_at)}
            </span>
            <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              {itemCount} article{itemCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl bg-muted/50 p-4 space-y-4">
          {(order.items as OrderItem[]).length > 0 ? (
            (order.items as OrderItem[]).map(item => (
              <div key={item.id} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-xl text-primary-foreground">
                  {item.quantity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-lg text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{item.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                    {item.priceLabel} × {item.quantity} = <span className="font-semibold text-foreground">{formatEuro(item.priceCents * item.quantity)}</span>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Aucun article</p>
          )}
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="rounded-r-lg border-l-4 border-primary bg-primary/10 p-3">
            <p className="text-sm font-medium text-primary" style={{ fontFamily: "var(--font-sans)" }}>📝 Note client :</p>
            <p className="text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{order.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-2">
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
            Reçue à {fmtTime(order.created_at)}
          </p>
          <p className="text-2xl font-bold text-primary" style={{ fontFamily: "var(--font-sans)" }}>
            {formatEuro(order.total_cents)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="grid gap-3 pt-2">
          {isPending && (
            <button
              onClick={onPrepare}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-lg font-bold text-white transition hover:bg-orange-600"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <ChefHat className="h-6 w-6" /> Commencer la préparation
            </button>
          )}
          {status === "preparing" && (
            <button
              onClick={onReady}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-green-500 text-lg font-bold text-white transition hover:bg-green-600"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <Package className="h-6 w-6" /> Commande prête
            </button>
          )}
          {status === "ready" && (
            <button
              onClick={onComplete}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-primary-foreground transition hover:opacity-90"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <Check className="h-6 w-6" /> Commande récupérée
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Orders View ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon", pending: "En attente", preparing: "En préparation",
  ready: "Prêt", completed: "Terminé", cancelled: "Annulé",
};

const STATUS_BADGE: Record<string, string> = {
  draft:     "border-border/30 bg-muted/20 text-muted-foreground",
  pending:   "border-yellow-500/40 bg-yellow-500/15 text-yellow-400",
  preparing: "border-blue-500/40 bg-blue-500/15 text-blue-400",
  ready:     "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
  completed: "border-border/30 bg-muted/20 text-muted-foreground",
  cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
};

function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").neq("status", "draft").order("created_at", { ascending: false }).limit(100);
    if (data) setOrders(data as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = orders.filter((o) => {
    const matchSearch = !search || o.customer_name.toLowerCase().includes(search.toLowerCase()) || o.customer_phone.includes(search);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function setStatus(id: string, status: OrderStatus) {
    await supabase.from("orders").update({ status }).eq("id", id);
    loadOrders();
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou tél…"
          className="w-full rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 sm:w-72"
          style={{ fontFamily: "var(--font-sans)" }}
        />
        <select
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/40"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <option value="all">Tous les statuts</option>
          {(["pending", "preparing", "ready", "completed", "cancelled"] as OrderStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button onClick={loadOrders} className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-sm text-muted-foreground transition hover:text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Aucune commande trouvée.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderRow key={order.id} order={order} expanded={expandedId === order.id} onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)} onSetStatus={setStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, expanded, onToggle, onSetStatus }: {
  order: Order; expanded: boolean; onToggle: () => void; onSetStatus: (id: string, status: OrderStatus) => void;
}) {
  const status = order.status as OrderStatus;
  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/3">
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
          <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Client</p><p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{order.customer_name}</p></div>
          <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Date</p><p className="text-sm text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{fmtDate(order.created_at)} · {fmtTime(order.created_at)}</p></div>
          <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Total</p><p className="text-sm font-bold text-emerald-400" style={{ fontFamily: "var(--font-sans)" }}>{formatEuro(order.total_cents)}</p></div>
          <div><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS_BADGE[status]}`} style={{ fontFamily: "var(--font-sans)" }}>{STATUS_LABEL[status]}</span></div>
        </div>
        <Eye size={16} className="shrink-0 text-muted-foreground/50" />
      </button>
      {expanded && (
        <div className="border-t border-border/40 p-4">
          <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Téléphone</p><p className="text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{order.customer_phone}</p></div>
            {order.notes && <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Remarques</p><p className="text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{order.notes}</p></div>}
          </div>
          <ul className="mb-4 space-y-1.5 rounded-xl border border-border/40 bg-background/40 p-3 text-sm">
            {(order.items as OrderItem[]).map((item) => (
              <li key={item.id} className="flex justify-between" style={{ fontFamily: "var(--font-sans)" }}>
                <span className="text-foreground">{item.name} <span className="text-muted-foreground">×{item.quantity}</span></span>
                <span className="font-semibold text-emerald-400">{formatEuro(item.priceCents * item.quantity)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-border/40 pt-2 font-bold" style={{ fontFamily: "var(--font-sans)" }}>
              <span className="text-foreground">Total</span><span className="text-emerald-400">{formatEuro(order.total_cents)}</span>
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            {status === "pending" && (<><button onClick={() => onSetStatus(order.id, "preparing")} className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-400 transition hover:bg-blue-500/20" style={{ fontFamily: "var(--font-sans)" }}>→ Préparer</button><button onClick={() => onSetStatus(order.id, "cancelled")} className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs font-bold text-destructive transition hover:bg-destructive/20" style={{ fontFamily: "var(--font-sans)" }}>✕ Annuler</button></>)}
            {status === "preparing" && <button onClick={() => onSetStatus(order.id, "ready")} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20" style={{ fontFamily: "var(--font-sans)" }}>✓ Prêt à servir</button>}
            {status === "ready"     && <button onClick={() => onSetStatus(order.id, "completed")} className="rounded-lg border border-border/40 bg-muted/30 px-4 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-muted/60" style={{ fontFamily: "var(--font-sans)" }}>✓ Récupérée</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Applications View ────────────────────────────────────────────────────────

const APP_STATUS_LABEL: Record<Application["status"], string> = { new: "Nouveau", reviewed: "Vu", contacted: "Contacté", rejected: "Refusé" };
const APP_STATUS_BADGE: Record<Application["status"], string> = {
  new:      "border-yellow-500/40 bg-yellow-500/15 text-yellow-400",
  reviewed: "border-blue-500/40 bg-blue-500/15 text-blue-400",
  contacted:"border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
};

function ApplicationsView({ onRead }: { onRead: () => void }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
    if (data) setApps(data as Application[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: Application["status"]) {
    await supabase.from("applications").update({ status }).eq("id", id);
    load(); onRead();
  }

  if (loading) return <Spinner />;
  if (apps.length === 0) return <p className="py-12 text-center text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Aucune candidature pour l'instant.</p>;

  return (
    <div className="space-y-3">
      {apps.map((app) => (
        <div key={app.id} className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
          <button
            onClick={() => { setExpandedId(expandedId === app.id ? null : app.id); if (app.status === "new") setStatus(app.id, "reviewed"); }}
            className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/3"
          >
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
              <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Nom</p><p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{app.name}</p></div>
              <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Poste</p><p className="text-sm text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{app.position}</p></div>
              <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Date</p><p className="text-sm text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{fmtDate(app.created_at)}</p></div>
              <div><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${APP_STATUS_BADGE[app.status]}`} style={{ fontFamily: "var(--font-sans)" }}>{APP_STATUS_LABEL[app.status]}</span></div>
            </div>
            <Eye size={16} className="shrink-0 text-muted-foreground/50" />
          </button>
          {expandedId === app.id && (
            <div className="border-t border-border/40 p-4 text-sm">
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Email</p><p className="text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{app.email}</p></div>
                <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Téléphone</p><p className="text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{app.phone}</p></div>
              </div>
              <div className="mb-4"><p className="mb-1 text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Lettre de motivation</p><p className="rounded-xl border border-border/40 bg-background/40 p-3 leading-relaxed text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{app.message}</p></div>
              <div className="flex flex-wrap gap-2">
                {app.cv_url && <a href={app.cv_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/60 px-4 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40" style={{ fontFamily: "var(--font-sans)" }}><Download size={13} /> CV</a>}
                <button onClick={() => setStatus(app.id, "contacted")} className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20" style={{ fontFamily: "var(--font-sans)" }}><CheckCircle size={13} /> Contacté</button>
                <button onClick={() => setStatus(app.id, "rejected")}  className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs font-bold text-destructive transition hover:bg-destructive/20" style={{ fontFamily: "var(--font-sans)" }}><XCircle size={13} /> Refuser</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Messages View ────────────────────────────────────────────────────────────

const CONTACT_STATUS_BADGE: Record<Contact["status"], string> = {
  unread:  "border-yellow-500/40 bg-yellow-500/15 text-yellow-400",
  read:    "border-blue-500/30 bg-blue-500/10 text-blue-400",
  replied: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};
const CONTACT_STATUS_LABEL: Record<Contact["status"], string> = { unread: "Non lu", read: "Lu", replied: "Répondu" };

function MessagesView({ onRead }: { onRead: () => void }) {
  const [messages, setMessages] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
    if (data) setMessages(data as Contact[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) { await supabase.from("contacts").update({ status: "read" }).eq("id", id).eq("status", "unread"); load(); onRead(); }
  async function markReplied(id: string) { await supabase.from("contacts").update({ status: "replied" }).eq("id", id); load(); onRead(); }

  if (loading) return <Spinner />;
  if (messages.length === 0) return <p className="py-12 text-center text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Aucun message pour l'instant.</p>;

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div key={msg.id} className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
          <button
            onClick={() => { setExpandedId(expandedId === msg.id ? null : msg.id); if (msg.status === "unread") markRead(msg.id); }}
            className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/3"
          >
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
              <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Nom</p><p className={`text-sm text-foreground ${msg.status === "unread" ? "font-bold" : "font-semibold"}`} style={{ fontFamily: "var(--font-sans)" }}>{msg.name}</p></div>
              <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Sujet</p><p className="text-sm text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{msg.subject}</p></div>
              <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Date</p><p className="text-sm text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{fmtDate(msg.created_at)}</p></div>
              <div><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${CONTACT_STATUS_BADGE[msg.status]}`} style={{ fontFamily: "var(--font-sans)" }}>{CONTACT_STATUS_LABEL[msg.status]}</span></div>
            </div>
            <Eye size={16} className="shrink-0 text-muted-foreground/50" />
          </button>
          {expandedId === msg.id && (
            <div className="border-t border-border/40 p-4 text-sm">
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Email</p><a href={`mailto:${msg.email}`} className="text-primary hover:underline" style={{ fontFamily: "var(--font-sans)" }}>{msg.email}</a></div>
                {msg.phone && <div><p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Téléphone</p><p className="text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{msg.phone}</p></div>}
              </div>
              <div className="mb-4"><p className="mb-1 text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Message</p><p className="rounded-xl border border-border/40 bg-background/40 p-3 leading-relaxed whitespace-pre-wrap text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{msg.message}</p></div>
              <div className="flex gap-2">
                <a href={`mailto:${msg.email}?subject=Re: ${msg.subject}`} onClick={() => markReplied(msg.id)} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20" style={{ fontFamily: "var(--font-sans)" }}>✉ Répondre</a>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Timetracking View (Pointage Tablette) ───────────────────────────────────

type TabletEntry = {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  status: string | null;
};

type TabletLastAction = {
  employee: StaffMember;
  action: "clock_in" | "clock_out";
  weekHours: number;
  weeklyTarget: number;
  at: Date;
};

function TimetrackingView({ onGoToTeam: _ }: { onGoToTeam?: () => void }) {
  const [now, setNow] = useState(new Date());
  const [todayEntries, setTodayEntries] = useState<TabletEntry[]>([]);
  const [weekEntries, setWeekEntries] = useState<TabletEntry[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState<TabletLastAction | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StaffMember[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [clockStatus, setClockStatus] = useState<"loading" | "in" | "out" | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-clear last action after 8s
  useEffect(() => {
    if (!lastAction) return;
    const id = setTimeout(() => setLastAction(null), 8000);
    return () => clearTimeout(id);
  }, [lastAction]);

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const wkStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const wkEnd   = format(endOfWeek(new Date(),   { weekStartsOn: 1 }), "yyyy-MM-dd");

    const [{ data: activeData }, { data: weekData }, { data: empData }] = await Promise.all([
      supabase
        .from("staff_time_entries")
        .select("*")
        .gte("clock_in", since24h)
        .is("clock_out", null)
        .order("clock_in", { ascending: false }),
      supabase
        .from("staff_time_entries")
        .select("*")
        .gte("clock_in", `${wkStart}T00:00:00`)
        .lte("clock_in", `${wkEnd}T23:59:59`),
      supabase
        .from("staff_members")
        .select("*")
        .eq("is_active", true)
        .order("last_name"),
    ]);

    setTodayEntries((activeData || []) as TabletEntry[]);
    setWeekEntries((weekData || []) as TabletEntry[]);
    setAllStaff((empData || []) as StaffMember[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime sync
  useEffect(() => {
    const ch = supabase
      .channel("pointage-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_time_entries" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  // Name autocomplete — fires after 3 chars, debounced 200ms
  useEffect(() => {
    if (selectedEmployee || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const q = searchQuery.trim();
      const { data } = await supabase
        .from("staff_members")
        .select("*")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .eq("is_active", true)
        .limit(6);
      setSearchResults((data || []) as StaffMember[]);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedEmployee]);

  const selectEmployee = async (emp: StaffMember) => {
    setSelectedEmployee(emp);
    setSearchQuery(`${emp.first_name} ${emp.last_name}`);
    setSearchResults([]);
    setPinError(false);
    setPin("");
    setClockStatus("loading");
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("staff_time_entries")
      .select("id")
      .eq("employee_id", emp.id)
      .is("clock_out", null)
      .gte("clock_in", since24h)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();
    setClockStatus(data ? "in" : "out");
  };

  const clearSelection = () => {
    setSelectedEmployee(null);
    setSearchQuery("");
    setPin("");
    setPinError(false);
    setSearchResults([]);
    setClockStatus(null);
  };

  const computeWeekHours = (empId: string): number => {
    return weekEntries
      .filter(e => e.employee_id === empId)
      .reduce((sum, e) => {
        if (e.clock_out) return sum + differenceInMinutes(parseISO(e.clock_out), parseISO(e.clock_in)) / 60;
        return sum + differenceInMinutes(now, parseISO(e.clock_in)) / 60;
      }, 0);
  };

  const handleAction = async (action: "clock_in" | "clock_out") => {
    if (!selectedEmployee || pin.length !== 4 || isSubmitting) return;
    setIsSubmitting(true);
    setPinError(false);

    try {
      const { data: pinData } = await supabase
        .from("employee_pins")
        .select("id")
        .eq("employee_id", selectedEmployee.id)
        .eq("pin_code", pin)
        .maybeSingle();

      if (!pinData) {
        setPinError(true);
        setPin("");
        toast.error("Code PIN incorrect");
        return;
      }

      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: activeEntry, error: activeError } = await supabase
        .from("staff_time_entries")
        .select("id")
        .eq("employee_id", selectedEmployee.id)
        .is("clock_out", null)
        .gte("clock_in", since24h)
        .order("clock_in", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeError) { toast.error("Erreur de vérification du pointage"); return; }

      const weeklyTarget = selectedEmployee.weekly_hours ?? 35;

      if (action === "clock_in") {
        if (activeEntry) {
          toast.error(`${selectedEmployee.first_name} est déjà pointé — pointez d'abord la sortie.`);
          return;
        }
        const { error } = await supabase.from("staff_time_entries").insert({
          employee_id: selectedEmployee.id,
          clock_in: new Date().toISOString(),
          status: "active",
        });
        if (error) { toast.error("Erreur pointage entrée"); return; }
        toast.success(`✅ Entrée enregistrée — ${selectedEmployee.first_name}`);
      } else {
        if (!activeEntry) {
          toast.error(`${selectedEmployee.first_name} n'a aucun pointage actif aujourd'hui.`);
          return;
        }
        const { error } = await supabase
          .from("staff_time_entries")
          .update({ clock_out: new Date().toISOString(), status: "completed" })
          .eq("id", activeEntry.id);
        if (error) { toast.error("Erreur pointage sortie"); return; }
        toast.success(`✅ Sortie enregistrée — ${selectedEmployee.first_name}`);
      }

      await fetchData();
      const refreshedHours = computeWeekHours(selectedEmployee.id);
      setLastAction({ employee: selectedEmployee, action, weekHours: refreshedHours, weeklyTarget, at: new Date() });
      clearSelection();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmployeeName = (id: string) => {
    const emp = allStaff.find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Inconnu";
  };

  const activeEntries = todayEntries.filter(e => !e.clock_out);
  const canSubmit = !!selectedEmployee && pin.length === 4 && !isSubmitting && clockStatus !== "loading";

  const fmtH = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${hh}h${String(Math.max(0, mm)).padStart(2, "0")}`;
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-display tracking-widest text-foreground flex items-center gap-2">
          ⏱️ Pointage tablette
        </h2>
        <span className="rounded-full border border-border/50 bg-card/50 px-3 py-1 font-mono text-sm text-foreground" style={{ fontFamily: "var(--font-mono, monospace)" }}>
          {format(now, "EEEE d MMM · HH:mm:ss", { locale: fr })}
        </span>
      </div>

      {/* Pointage card */}
      <div className="rounded-2xl border-2 border-border bg-gradient-to-br from-card to-muted/30 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Clock className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>Pointage du personnel</h3>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Recherchez votre nom puis entrez votre code PIN</p>
          </div>
        </div>

        <div className="space-y-4 max-w-md">
          {/* Name search */}
          <div ref={searchRef} className="relative">
            <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2" style={{ fontFamily: "var(--font-sans)" }}>
              <Search className="w-4 h-4 text-muted-foreground" />
              Nom ou prénom
            </label>
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedEmployee) { setSelectedEmployee(null); setClockStatus(null); }
                  setPinError(false);
                }}
                placeholder="Tapez au moins 3 lettres…"
                autoComplete="off"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-card text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 pr-8 transition-all ${selectedEmployee ? "border-primary bg-primary/5 font-medium" : "border-border"}`}
                style={{ fontFamily: "var(--font-sans)" }}
              />
              {(searchQuery || selectedEmployee) && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                {searchResults.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => selectEmployee(emp)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5" style={{ fontFamily: "var(--font-sans)" }}>{emp.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length > 0 && searchQuery.length < 3 && (
              <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-sans)" }}>Encore {3 - searchQuery.length} lettre(s)…</p>
            )}
          </div>

          {/* PIN input */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2" style={{ fontFamily: "var(--font-sans)" }}>
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              Code PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(false); }}
              placeholder="● ● ● ●"
              disabled={!selectedEmployee}
              className={`w-full rounded-xl border px-4 py-2.5 text-center text-xl tracking-[0.5em] font-mono bg-card text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${pinError ? "border-destructive bg-destructive/5" : "border-border"}`}
            />
            {pinError && (
              <p className="text-xs text-destructive mt-1" style={{ fontFamily: "var(--font-sans)" }}>Code PIN incorrect, réessayez.</p>
            )}
          </div>

          {/* Status indicator */}
          {clockStatus && (
            <div
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border ${
                clockStatus === "loading" ? "bg-muted/60 text-muted-foreground border-border" :
                clockStatus === "in"      ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                                            "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              }`}
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {clockStatus === "loading" && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              {clockStatus === "in"      && <Square className="w-4 h-4 shrink-0" />}
              {clockStatus === "out"     && <Play className="w-4 h-4 shrink-0" />}
              {clockStatus === "loading" && "Vérification du statut…"}
              {clockStatus === "in"      && "Déjà en service — pointez votre sortie"}
              {clockStatus === "out"     && "Hors service — pointez votre entrée"}
            </div>
          )}

          {/* Action buttons — only the relevant action is shown */}
          <div className="grid grid-cols-1 gap-3 pt-1">
            {clockStatus !== "in" && (
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => handleAction("clock_in")}
                className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all p-5 text-center"
              >
                <div className="absolute top-1 right-1 opacity-20">
                  <Play className="w-10 h-10 text-emerald-500" />
                </div>
                <p className="text-2xl font-display font-bold text-emerald-500 tracking-widest">ENTRÉE</p>
                <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-sans)" }}>Démarrer ma journée</p>
              </button>
            )}
            {clockStatus !== "out" && (
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => handleAction("clock_out")}
                className="relative overflow-hidden rounded-2xl border-2 border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all p-5 text-center"
              >
                <div className="absolute top-1 right-1 opacity-20">
                  <Square className="w-10 h-10 text-orange-500" />
                </div>
                <p className="text-2xl font-display font-bold text-orange-500 tracking-widest">SORTIE</p>
                <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-sans)" }}>Terminer ma journée</p>
              </button>
            )}
          </div>
        </div>

        {/* Last action confirmation */}
        {lastAction && (
          <div className="mt-5 rounded-xl border-2 border-primary/40 bg-primary/10 p-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserCircle className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-base text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                    {lastAction.employee.first_name} {lastAction.employee.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                    {lastAction.action === "clock_in" ? "✅ Entrée pointée" : "✅ Sortie pointée"} à {format(lastAction.at, "HH:mm")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[200px]">
                <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Cette semaine</span>
                    <span className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                      {fmtH(lastAction.weekHours)}{" "}
                      <span className="text-xs text-muted-foreground font-normal">/ {lastAction.weeklyTarget}h</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        lastAction.weekHours >= lastAction.weeklyTarget ? "bg-emerald-500" :
                        lastAction.weekHours >= lastAction.weeklyTarget * 0.8 ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(100, (lastAction.weekHours / lastAction.weeklyTarget) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* En service maintenant */}
      {activeEntries.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-card/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative">
              <Users className="w-5 h-5 text-emerald-500" />
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h3 className="font-semibold text-emerald-500" style={{ fontFamily: "var(--font-sans)" }}>
              En service maintenant ({activeEntries.length})
            </h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {activeEntries.map(entry => {
              const emp = allStaff.find(e => e.id === entry.employee_id);
              const elapsed = differenceInMinutes(now, parseISO(entry.clock_in)) / 60;
              const weekH = computeWeekHours(entry.employee_id);
              const target = emp?.weekly_hours ?? 35;
              return (
                <div key={entry.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="flex items-start gap-2">
                    <UserCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate" style={{ fontFamily: "var(--font-sans)" }}>
                        {getEmployeeName(entry.employee_id)}
                      </p>
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                        Depuis {format(new Date(entry.clock_in), "HH:mm")} · {fmtH(elapsed)} en service
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Sem:</span>
                        <span className="text-[11px] font-semibold text-foreground">{fmtH(weekH)}/{target}h</span>
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${weekH >= target ? "bg-emerald-500" : weekH >= target * 0.8 ? "bg-amber-500" : "bg-primary"}`}
                            style={{ width: `${Math.min(100, (weekH / target) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Time History View (Historique pointage) ─────────────────────────────────
function TimeHistoryView() {
  const [entries, setEntries] = useState<(TabletEntry & { total_hours?: number | null })[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: entriesData }, { data: staffData }] = await Promise.all([
      supabase
        .from("staff_time_entries")
        .select("*")
        .gte("clock_in", `${dateFilter}T00:00:00`)
        .lte("clock_in", `${dateFilter}T23:59:59`)
        .order("clock_in", { ascending: false }),
      supabase.from("staff_members").select("*").eq("is_active", true).order("last_name"),
    ]);
    setEntries((entriesData || []) as (TabletEntry & { total_hours?: number | null })[]);
    setStaff((staffData || []) as StaffMember[]);
    setLoading(false);
  }, [dateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase
      .channel("pointage-history-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_time_entries" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  const getEmployeeName = (id: string) => {
    const emp = staff.find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Inconnu";
  };

  const completedEntries = entries.filter(e => e.clock_out);
  const activeEntries = entries.filter(e => !e.clock_out);

  const fmtH = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${hh}h${String(Math.max(0, mm)).padStart(2, "0")}`;
  };

  const getDuration = (entry: TabletEntry & { total_hours?: number | null }) => {
    if (entry.total_hours != null) return entry.total_hours;
    if (entry.clock_out) {
      return differenceInMinutes(parseISO(entry.clock_out), parseISO(entry.clock_in)) / 60;
    }
    return differenceInMinutes(new Date(), parseISO(entry.clock_in)) / 60;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <h3 className="font-semibold text-lg">
          {format(parseISO(dateFilter), "EEEE d MMMM yyyy", { locale: fr })}
        </h3>
        {completedEntries.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {completedEntries.length} pointage{completedEntries.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : entries.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Aucun pointage pour cette date
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => {
            const duration = getDuration(entry);
            return (
              <Card key={entry.id} className="p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{getEmployeeName(entry.employee_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.clock_in), "HH:mm")}
                        {entry.clock_out ? ` → ${format(new Date(entry.clock_out), "HH:mm")}` : " → en cours"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.clock_out ? "secondary" : "default"}>
                      {fmtH(duration)}{!entry.clock_out && " (en cours)"}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Team View ────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
];

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function getInitials(first: string, last: string) {
  return `${(first?.[0] || "").toUpperCase()}${(last?.[0] || "").toUpperCase()}`;
}

const EMPTY_MEMBER_FORM = {
  first_name: "", last_name: "", email: "", phone: "",
  role: "equipe" as StaffMember["role"],
  contract_type: "CDI", weekly_hours: "35", hire_date: "",
};

type EmpDrawerTab = "infos" | "contrats" | "temps" | "conges" | "documents" | "permissions";

const EMP_DRAWER_TABS: { id: EmpDrawerTab; label: string }[] = [
  { id: "infos",        label: "Informations personnelles" },
  { id: "contrats",     label: "Contrats" },
  { id: "temps",        label: "Temps et planification" },
  { id: "conges",       label: "Congés et Absences" },
  { id: "documents",    label: "Documents" },
  { id: "permissions",  label: "Rôle et permissions" },
];

function EmployeeDrawer({
  member, open, onClose, onEdit, onToggleActive,
}: { member: StaffMember | null; open: boolean; onClose: () => void; onEdit: (m: StaffMember) => void; onToggleActive?: (m: StaffMember) => void }) {
  const [tab, setTab] = useState<EmpDrawerTab>("infos");
  if (!member) return null;

  const initials  = getInitials(member.first_name, member.last_name);
  const avatarCls = avatarColor(member.id);

  const roleBadgeLabel: Record<string, string> = { admin: "Admin", manager: "Manager", equipe: "Employé" };

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-2xl flex flex-col bg-card shadow-2xl transition-transform duration-300 overflow-y-auto ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Green/primary header */}
        <div className="p-6 text-white" style={{ background: "var(--primary)" }}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold ${avatarCls}`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-2xl tracking-widest truncate">
                {member.first_name} {member.last_name}
              </h2>
              <p className="text-white/80 text-sm capitalize" style={{ fontFamily: "var(--font-sans)" }}>
                {roleBadgeLabel[member.role] ?? member.role}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5 text-xs">
            {[
              { label: "Début contrat",   value: member.hire_date || "—" },
              { label: "Type contrat",    value: member.contract_type || "—" },
              { label: "Heures hebdo",    value: `${member.weekly_hours ?? 35}h` },
            ].map(col => (
              <div key={col.label}>
                <p className="text-white/60 uppercase tracking-wider">{col.label}</p>
                <p className="font-medium mt-0.5 truncate" style={{ fontFamily: "var(--font-sans)" }}>{col.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border/50 bg-card sticky top-0 z-10">
          <div className="px-6 py-2 flex gap-1 overflow-x-auto">
            {EMP_DRAWER_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap rounded-md transition-colors ${
                  tab === t.id
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex-1">
          {tab === "infos" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DrawerCard title="État civil" icon={<Users size={16} />}>
                <DrawerRow label="Prénom" value={member.first_name} />
                <DrawerRow label="Nom" value={member.last_name} />
                <DrawerRow label="Rôle" value={roleBadgeLabel[member.role] ?? member.role} />
              </DrawerCard>
              <DrawerCard title="Coordonnées" icon={<Phone size={16} />}>
                <DrawerRow label="Email" value={member.email || "—"} />
                <DrawerRow label="Mobile" value={member.phone || "—"} />
              </DrawerCard>
            </div>
          )}
          {tab === "contrats" && (
            <DrawerCard title="Contrat actuel" icon={<Briefcase size={16} />}>
              <DrawerRow label="Type" value={member.contract_type || "—"} />
              <DrawerRow label="Date de début" value={member.hire_date || "—"} />
              <DrawerRow label="Heures hebdo" value={`${member.weekly_hours ?? 35}h`} />
            </DrawerCard>
          )}
          {tab === "temps" && (
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              Heures contractuelles, planifiées et pointées (à venir).
            </p>
          )}
          {tab === "conges" && (
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              Solde de congés et absences (à venir).
            </p>
          )}
          {tab === "documents" && (
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              Aucun document pour le moment.
            </p>
          )}
          {tab === "permissions" && (
            <DrawerCard title="Rôle système" icon={<Shield size={16} />}>
              <DrawerRow label="Rôle" value={roleBadgeLabel[member.role] ?? member.role} />
              <DrawerRow label="Statut" value={member.is_active ? "Actif" : "Inactif"} />
              {onToggleActive && (
                <div className="pt-3">
                  <button
                    onClick={() => { onToggleActive(member); onClose(); }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${member.is_active
                      ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"}`}
                    style={{ fontFamily: "var(--font-sans)" }}>
                    {member.is_active ? "Désactiver le compte" : "Réactiver le compte"}
                  </button>
                </div>
              )}
            </DrawerCard>
          )}
        </div>

        {/* Sticky CTA */}
        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-card to-transparent flex justify-center">
          <button
            onClick={() => { onEdit(member); onClose(); }}
            className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background shadow-lg transition hover:opacity-90"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <Pencil size={16} />
            Modifier les informations personnelles
          </button>
        </div>
      </div>
    </>
  );
}

function DrawerCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/40">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DrawerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-3 text-sm py-1.5 border-b border-border/20 last:border-0">
      <span className="text-muted-foreground text-xs" style={{ fontFamily: "var(--font-sans)" }}>{label}</span>
      <span className="font-medium text-right truncate text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{value}</span>
    </div>
  );
}

// ─── Products View ────────────────────────────────────────────────────────────

type ProductOption = { id: string; name: string; price: number; type?: string; };
type Product = {
  id: string; created_at: string; name: string; description: string | null;
  price: number; image_url: string | null; category: string;
  is_new: boolean; is_best_seller: boolean; is_available: boolean;
  is_signature: boolean; is_featured: boolean; display_order: number;
  calories: number | null; options: ProductOption[];
};
type ProductForm = Omit<Product, "id" | "created_at">;

const defaultProductForm: ProductForm = {
  name: "", description: "", price: 0, image_url: "", category: "",
  is_new: false, is_best_seller: false, is_available: true,
  is_signature: false, is_featured: false, display_order: 0,
  calories: null, options: [],
};

function ProductsView() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [searchTerm, setSearchTerm]   = useState("");
  const [catFilter, setCatFilter]     = useState("all");
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [form, setForm]               = useState<ProductForm>(defaultProductForm);
  const [formTab, setFormTab]         = useState<"info" | "pricing" | "options">("info");
  const [inlineEdit, setInlineEdit]   = useState<{ productId: string; field: "price" | "menuPrice"; value: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products").select("*").order("category").order("display_order");
    if (error) toast.error("Erreur chargement produits");
    else setProducts((data || []).map(p => ({ ...p, options: Array.isArray(p.options) ? (p.options as ProductOption[]) : [] })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => [...new Set(products.map(p => p.category))].sort(), [products]);

  const filtered = products.filter(p => {
    const okSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const okCat    = catFilter === "all" || p.category === catFilter;
    return okSearch && okCat;
  });

  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, Product[]>);

  function openNew() { setEditingProd(null); setForm(defaultProductForm); setFormTab("info"); setModalOpen(true); }

  function openEdit(p: Product) {
    setEditingProd(p);
    setForm({ name: p.name, description: p.description || "", price: p.price, image_url: p.image_url || "",
      category: p.category, is_new: p.is_new, is_best_seller: p.is_best_seller, is_available: p.is_available,
      is_signature: p.is_signature, is_featured: p.is_featured, display_order: p.display_order,
      calories: p.calories, options: p.options || [] });
    setFormTab("info"); setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim() || form.price <= 0) { toast.error("Nom et prix requis"); return; }
    if (!form.category.trim()) { toast.error("Catégorie requise"); return; }
    setSaving(true);
    const payload = { name: form.name, description: form.description || null, price: form.price,
      image_url: form.image_url || null, category: form.category.trim(), is_new: form.is_new,
      is_best_seller: form.is_best_seller, is_available: form.is_available, is_signature: form.is_signature,
      is_featured: form.is_featured, display_order: form.display_order, calories: form.calories, options: form.options };
    if (editingProd) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingProd.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Produit mis à jour");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Produit créé");
    }
    setModalOpen(false); await load(); setSaving(false);
  }

  async function handleDelete(p: Product) {
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Produit supprimé");
    setDeleteConfirm(null);
    setProducts(prev => prev.filter(x => x.id !== p.id));
  }

  async function toggleAvail(p: Product) {
    const { error } = await supabase.from("products").update({ is_available: !p.is_available }).eq("id", p.id);
    if (error) { toast.error("Erreur"); return; }
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_available: !p.is_available } : x));
    toast.success(p.is_available ? "Produit indisponible" : "Produit disponible");
  }

  async function saveInlineEdit() {
    if (!inlineEdit) return;
    const p = products.find(x => x.id === inlineEdit.productId);
    if (!p) return;
    const val = parseFloat(inlineEdit.value) || 0;
    setSaving(true);
    if (inlineEdit.field === "price") {
      const { error } = await supabase.from("products").update({ price: val }).eq("id", p.id);
      if (error) { toast.error("Erreur"); setSaving(false); return; }
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, price: val } : x));
    } else {
      const supplement = Math.max(0, val - p.price);
      const updatedOptions = p.options.map(o => o.id === "menu" ? { ...o, price: supplement } : o);
      const { error } = await supabase.from("products").update({ options: updatedOptions }).eq("id", p.id);
      if (error) { toast.error("Erreur"); setSaving(false); return; }
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, options: updatedOptions } : x));
    }
    toast.success("Prix mis à jour");
    setInlineEdit(null); setSaving(false);
  }

  function fToggle(key: keyof ProductForm) { setForm(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] })); }
  function addOpt() { setForm(prev => ({ ...prev, options: [...prev.options, { id: `opt-${Date.now()}`, name: "", price: 0, type: "single" }] })); }
  function updOpt(idx: number, field: keyof ProductOption, val: string | number) {
    setForm(prev => ({ ...prev, options: prev.options.map((o, i) => i === idx ? { ...o, [field]: val } : o) }));
  }
  function remOpt(idx: number) { setForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) })); }

  const pInp = "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50";
  const pLbl = "block text-[11px] font-medium text-muted-foreground mb-1";

  if (loading) return <Spinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package size={22} className="text-primary" />
            Gestion des produits
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {products.length} produits • {products.filter(p => p.is_available).length} disponibles
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-80 transition-opacity shrink-0">
          <Plus size={16} /> Nouveau produit
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-border/50 bg-card/50 p-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Rechercher un produit..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} className={`${pInp} pl-9`} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className={`${pInp} sm:w-52 cursor-pointer`}>
          <option value="all">Toutes les catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={load}
          className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Products grouped by category */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, catProds]) => (
          <div key={cat} className="space-y-3">
            <div className="sticky top-0 z-10 py-2 border-b border-primary/20 bg-background/95 backdrop-blur flex items-center gap-2">
              <Package size={17} className="text-primary" />
              <h3 className="text-base font-bold text-primary">{cat}</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{catProds.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catProds.map(p => {
                const menuOpt = p.options?.find(o => o.id === "menu");
                const menuPrice = menuOpt ? p.price + menuOpt.price : null;
                return (
                  <div key={p.id}
                    className={`relative overflow-hidden bg-card rounded-xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md group ${!p.is_available ? "opacity-60" : ""}`}>
                    {/* Quick actions */}
                    <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(p)}
                        className="h-8 w-8 rounded-lg bg-background/95 border border-border/50 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirm(p)}
                        className="h-8 w-8 rounded-lg bg-destructive shadow-sm flex items-center justify-center text-destructive-foreground hover:opacity-80 transition-opacity">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {/* Product header */}
                    <div className="flex gap-3 mb-3 pr-20 sm:pr-0">
                      <div className="w-[72px] h-[72px] rounded-lg bg-muted overflow-hidden shrink-0 ring-1 ring-border group-hover:scale-[1.03] transition-transform">
                        {(p.image_url || PRODUCT_LOCAL_IMAGES[p.name])
                          ? <img src={p.image_url || PRODUCT_LOCAL_IMAGES[p.name]} alt={p.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={22} className="text-muted-foreground/40" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground leading-tight line-clamp-2">{p.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.is_featured && <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white"><Star size={9} />AVANT</span>}
                          {p.is_new && <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500 text-white"><Sparkles size={9} />NEW</span>}
                          {p.is_best_seller && <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground"><Flame size={9} />BEST</span>}
                        </div>
                      </div>
                    </div>
                    {/* Inline price edit */}
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/35 px-3 py-2">
                      <div className="flex-1">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Seul</p>
                        {inlineEdit?.productId === p.id && inlineEdit.field === "price" ? (
                          <div className="flex items-center gap-1">
                            <input type="number" step="0.10" min="0" value={inlineEdit.value}
                              onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                              className="h-7 w-20 text-sm font-bold px-1 rounded border border-primary/40 bg-background text-foreground outline-none"
                              autoFocus
                              onKeyDown={e => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") setInlineEdit(null); }} />
                            <button onClick={saveInlineEdit} className="text-emerald-600 hover:text-emerald-700"><Check size={13} /></button>
                            <button onClick={() => setInlineEdit(null)} className="text-destructive"><X size={13} /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setInlineEdit({ productId: p.id, field: "price", value: String(p.price) })}
                            className="flex items-center gap-1 rounded px-1 py-0.5 text-lg font-bold hover:bg-background hover:text-primary transition-colors group/price">
                            {p.price.toFixed(2)}€
                            <Pencil size={10} className="opacity-0 group-hover/price:opacity-40 transition-opacity" />
                          </button>
                        )}
                      </div>
                      {menuOpt && (
                        <div className="flex-1 text-right">
                          <p className="text-[10px] uppercase text-primary font-semibold">🍟 Menu</p>
                          {inlineEdit?.productId === p.id && inlineEdit.field === "menuPrice" ? (
                            <div className="flex items-center gap-1 justify-end">
                              <input type="number" step="0.10" min="0" value={inlineEdit.value}
                                onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                                className="h-7 w-20 text-sm font-bold px-1 rounded border border-primary/40 bg-background text-foreground outline-none text-right"
                                autoFocus
                                onKeyDown={e => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") setInlineEdit(null); }} />
                              <button onClick={saveInlineEdit} className="text-emerald-600 hover:text-emerald-700"><Check size={13} /></button>
                              <button onClick={() => setInlineEdit(null)} className="text-destructive"><X size={13} /></button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setInlineEdit({ productId: p.id, field: "menuPrice", value: String(menuPrice || 0) })}
                              className="flex items-center gap-1 justify-end w-full rounded px-1 py-0.5 text-lg font-bold text-primary hover:bg-background transition-colors group/menu">
                              {menuPrice?.toFixed(2)}€
                              <Pencil size={10} className="opacity-0 group-hover/menu:opacity-40 transition-opacity" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Unavailable banner */}
                    {!p.is_available && (
                      <div className="absolute inset-x-0 bottom-0 bg-destructive/10 px-3 py-1 text-center text-[10px] font-semibold uppercase text-destructive">
                        Indisponible
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package size={44} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucun produit trouvé</p>
            <p className="text-sm mt-1 opacity-60">Modifiez vos filtres ou créez un nouveau produit</p>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="pt-4 border-t border-border/40 flex items-center justify-between text-sm text-muted-foreground">
        <span><span className="font-semibold text-foreground">{filtered.length}</span> produit(s)</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{filtered.filter(p => p.is_available).length} dispo</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" />{filtered.filter(p => !p.is_available).length} indispo</span>
        </div>
      </div>

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <h2 className="text-lg font-bold text-foreground">{editingProd ? "Modifier le produit" : "Nouveau produit"}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground"><X size={16} /></button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-border/50">
              {(["info", "pricing", "options"] as const).map(tab => (
                <button key={tab} onClick={() => setFormTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${formTab === tab ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {tab === "info" ? "Informations" : tab === "pricing" ? "Prix & Options" : "Personnalisation"}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto max-h-[55vh] px-6 py-5 space-y-4">
              {formTab === "info" && (
                <>
                  <div>
                    <label className={pLbl}>Nom du produit *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ex: Toast Jambon Fromage" className={pInp} />
                  </div>
                  <div>
                    <label className={pLbl}>Description</label>
                    <textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Description courte..." rows={3} className={`${pInp} resize-none`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={pLbl}>Catégorie *</label>
                      <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        placeholder="Ex: Toasts" list="ct-cats" className={pInp} />
                      <datalist id="ct-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
                    </div>
                    <div>
                      <label className={pLbl}>Calories</label>
                      <input type="number" value={form.calories || ""} onChange={e => setForm(f => ({ ...f, calories: parseInt(e.target.value) || null }))}
                        placeholder="Ex: 650" className={pInp} />
                    </div>
                  </div>
                  <div>
                    <label className={pLbl}>URL de l'image</label>
                    <input value={form.image_url || ""} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                      placeholder="https://..." className={pInp} />
                    {(form.image_url || (editingProd && PRODUCT_LOCAL_IMAGES[editingProd.name])) && (
                      <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-border/50">
                        <img src={form.image_url || (editingProd ? PRODUCT_LOCAL_IMAGES[editingProd.name] : undefined)} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className={pLbl}>Badges et mise en avant</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: "is_featured" as const, label: "Mise en avant", icon: <Star size={14} className="text-amber-500" /> },
                        { key: "is_new" as const, label: "Nouveau", icon: <Sparkles size={14} className="text-green-500" /> },
                        { key: "is_best_seller" as const, label: "Best-seller", icon: <Flame size={14} className="text-primary" /> },
                        { key: "is_available" as const, label: "Disponible", icon: <Check size={14} className="text-emerald-600" /> },
                      ]).map(({ key, label, icon }) => (
                        <div key={key} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">{icon}<span>{label}</span></div>
                          <button type="button" onClick={() => fToggle(key)}
                            className={`relative w-9 h-5 rounded-full transition-colors ${form[key] ? "bg-primary" : "bg-muted-foreground/30"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[key] ? "translate-x-4" : ""}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {formTab === "pricing" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={pLbl}>Prix unitaire (€) *</label>
                      <div className="relative">
                        <input type="number" step="0.10" min="0" value={form.price}
                          onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                          className={`${pInp} text-xl font-bold pr-8`} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                      </div>
                    </div>
                    <div>
                      <label className={pLbl}>Ordre d'affichage</label>
                      <input type="number" value={form.display_order}
                        onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                        className={pInp} />
                    </div>
                  </div>
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">🍟 Option Menu</p>
                        <p className="text-xs text-muted-foreground">Frites + boisson inclus</p>
                      </div>
                      <button type="button"
                        onClick={() => {
                          const has = form.options.some(o => o.id === "menu");
                          setForm(f => ({
                            ...f,
                            options: has
                              ? f.options.filter(o => o.id !== "menu")
                              : [...f.options.filter(o => o.id !== "menu"), { id: "menu", name: "En Menu", price: 4.50, type: "menu" }],
                          }));
                        }}
                        className={`relative w-9 h-5 rounded-full transition-colors ${form.options.some(o => o.id === "menu") ? "bg-primary" : "bg-muted-foreground/30"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.options.some(o => o.id === "menu") ? "translate-x-4" : ""}`} />
                      </button>
                    </div>
                    {form.options.some(o => o.id === "menu") && (
                      <div className="flex items-center gap-2">
                        <label className={`${pLbl} mb-0 whitespace-nowrap`}>Supplément menu :</label>
                        <div className="relative w-24">
                          <input type="number" step="0.10" min="0"
                            value={form.options.find(o => o.id === "menu")?.price ?? 4.50}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setForm(f => ({ ...f, options: f.options.map(o => o.id === "menu" ? { ...o, price: val } : o) }));
                            }}
                            className={`${pInp} pr-6 text-sm`} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              {formTab === "options" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Options personnalisables</p>
                      <p className="text-xs text-muted-foreground">Suppléments, sauces...</p>
                    </div>
                    <button onClick={addOpt}
                      className="flex items-center gap-1 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                      <Plus size={13} /> Ajouter
                    </button>
                  </div>
                  {form.options.filter(o => o.id !== "menu").map((opt) => {
                    const idx = form.options.indexOf(opt);
                    return (
                      <div key={opt.id} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                        <input placeholder="Nom de l'option" value={opt.name}
                          onChange={e => updOpt(idx, "name", e.target.value)} className={`${pInp} flex-1`} />
                        <div className="relative w-20">
                          <input type="number" step="0.10" min="0" value={opt.price}
                            onChange={e => updOpt(idx, "price", parseFloat(e.target.value) || 0)}
                            className={`${pInp} pr-6 text-sm`} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
                        </div>
                        <button onClick={() => remOpt(idx)} className="p-1.5 text-destructive hover:bg-red-50 rounded-lg transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                  {form.options.filter(o => o.id !== "menu").length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground/60">Aucune option personnalisée</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border/50 px-6 py-4">
              <button onClick={() => setModalOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Annuler</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-80 transition-opacity disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingProd ? "Enregistrer" : "Créer le produit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Supprimer ce produit ?</p>
                <p className="text-xs text-muted-foreground mt-0.5">"{deleteConfirm.name}" sera définitivement supprimé.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-full border border-border/50 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-full bg-destructive py-2 text-sm font-semibold text-destructive-foreground hover:opacity-80 transition-opacity">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamView() {
  const [members, setMembers]       = useState<StaffMember[]>([]);
  const [pinMap, setPinMap]         = useState<Record<string, boolean>>({});
  const [clockedInSet, setClockedInSet] = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(true);
  const [addOpen, setAddOpen]   = useState(false);
  const [addRole, setAddRole]   = useState<"equipe" | "livreur">("equipe");
  const [nameInput, setNameInput] = useState("");
  const [addPin, setAddPin]     = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    const [{ data: emps }, { data: pinData }, { data: activeEntries }] = await Promise.all([
      supabase.from("staff_members").select("*").order("last_name"),
      supabase.from("employee_pins").select("employee_id"),
      supabase.from("staff_time_entries").select("employee_id").is("clock_out", null),
    ]);
    if (emps) setMembers(emps as StaffMember[]);
    const map: Record<string, boolean> = {};
    (pinData || []).forEach((p: any) => { map[p.employee_id] = true; });
    setPinMap(map);
    const clockedIn = new Set<string>((activeEntries || []).map((e: any) => e.employee_id));
    setClockedInSet(clockedIn);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const staffList  = members.filter(m => m.role !== "livreur");
  const livreurs   = members.filter(m => m.role === "livreur");

  async function handleAdd() {
    const trimmed = nameInput.trim();
    if (!trimmed) { toast.error("Nom complet requis"); return; }
    const parts = trimmed.split(/\s+/);
    const first_name = parts[0];
    const last_name  = parts.slice(1).join(" ") || parts[0];
    if (addRole === "equipe" && addPin.length !== 4) {
      toast.error("Code PIN de 4 chiffres requis"); return;
    }
    setSaving(true);
    const { data: emp, error } = await supabase
      .from("staff_members")
      .insert({ first_name, last_name, email: addEmail.trim() || null, phone: addPhone.trim() || null, role: addRole, is_active: true })
      .select()
      .single();
    if (error || !emp) { toast.error("Erreur : " + (error?.message ?? "inconnue")); setSaving(false); return; }
    if (addRole === "equipe" && addPin) {
      await supabase.from("employee_pins").insert({ employee_id: (emp as StaffMember).id, pin_code: addPin });
    }
    toast.success(`${first_name} ${last_name} ajouté(e) !`);
    setAddOpen(false);
    setNameInput(""); setAddPin(""); setAddEmail(""); setAddPhone(""); setAddRole("equipe");
    await load();
    setSaving(false);
  }

  async function deleteMember(m: StaffMember) {
    if (!window.confirm(`Supprimer ${m.first_name} ${m.last_name} ?`)) return;
    await supabase.from("staff_members").delete().eq("id", m.id);
    setMembers(prev => prev.filter(x => x.id !== m.id));
    toast.success("Supprimé");
  }

  async function toggleActive(m: StaffMember) {
    await supabase.from("staff_members").update({ is_active: !m.is_active }).eq("id", m.id);
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !m.is_active } : x));
    toast.success(m.is_active ? "Mis hors service" : "Remis en service");
  }

  const statusBadge = (active: boolean) => (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {active ? "En service" : "Hors service"}
    </span>
  );

  const thCls = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
  const tdCls = "px-4 py-3";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Équipe</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérez votre équipe</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {staffList.length} staff · {livreurs.length} livreur(s)
          </span>
          <button
            onClick={() => setAddOpen(true)}
            className="rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-80 transition-opacity"
          >
            Ajouter un membre
          </button>
        </div>
      </div>

      {/* Staff section */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50">
        <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">Staff</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-foreground text-background">{staffList.length}</span>
        </div>
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-background/30">
                  <th className={thCls}>Nom</th>
                  <th className={thCls}>Restaurant</th>
                  <th className={thCls}>PIN pointage</th>
                  <th className={thCls}>Statut</th>
                  <th className={thCls}>Ajouté le</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(m => (
                  <tr key={m.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(m.id)}`}>
                          {getInitials(m.first_name, m.last_name)}
                        </div>
                        <span className="font-medium text-foreground">{m.first_name} {m.last_name}</span>
                      </div>
                    </td>
                    <td className={`${tdCls} text-muted-foreground`}>Crazy Toasty</td>
                    <td className={tdCls}>
                      {pinMap[m.id]
                        ? <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 tracking-[0.25em] text-[11px]">● ● ● ●</span>
                        : <span className="text-xs italic text-muted-foreground/50">Non défini</span>
                      }
                    </td>
                    <td className={tdCls}>{statusBadge(clockedInSet.has(m.id))}</td>
                    <td className={`${tdCls} text-muted-foreground text-xs`}>
                      {format(new Date(m.created_at), "d MMM yyyy", { locale: fr })}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => toggleActive(m)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                          title={m.is_active ? "Mettre hors service" : "Remettre en service"}>
                          {m.is_active
                            ? <XCircle size={15} className="text-amber-500" />
                            : <CheckCircle size={15} className="text-emerald-500" />}
                        </button>
                        <button onClick={() => deleteMember(m)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Supprimer">
                          <Trash2 size={15} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {staffList.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Aucun membre staff</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Livreurs section */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50">
        <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">Livreurs</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-foreground text-background">{livreurs.length}</span>
        </div>
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-background/30">
                  <th className={thCls}>Nom</th>
                  <th className={thCls}>Email</th>
                  <th className={thCls}>Restaurant</th>
                  <th className={thCls}>Ajouté le</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {livreurs.map(m => (
                  <tr key={m.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(m.id)}`}>
                          {getInitials(m.first_name, m.last_name)}
                        </div>
                        <span className="font-medium text-foreground">{m.first_name} {m.last_name}</span>
                      </div>
                    </td>
                    <td className={`${tdCls} text-muted-foreground`}>{m.email || <span className="italic opacity-60">—</span>}</td>
                    <td className={`${tdCls} text-muted-foreground`}>Crazy Toasty</td>
                    <td className={`${tdCls} text-muted-foreground text-xs`}>
                      {format(new Date(m.created_at), "d MMM yyyy", { locale: fr })}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => toggleActive(m)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                          title={m.is_active ? "Désactiver" : "Réactiver"}>
                          {m.is_active
                            ? <XCircle size={15} className="text-amber-500" />
                            : <CheckCircle size={15} className="text-emerald-500" />}
                        </button>
                        <button onClick={() => deleteMember(m)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Supprimer">
                          <Trash2 size={15} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {livreurs.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">Aucun livreur</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <h2 className="text-lg font-bold text-foreground">Nouveau membre</h2>
              <button onClick={() => setAddOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
              {/* Role selector */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Rôle</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["equipe", "livreur"] as const).map(r => {
                    const active = addRole === r;
                    const isStaff = r === "equipe";
                    return (
                      <button key={r} type="button" onClick={() => setAddRole(r)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                          active ? "border-foreground bg-foreground text-background" : "border-border/50 text-foreground hover:border-foreground/40"
                        }`}>
                        {isStaff ? <Clock size={20} /> : <Bike size={20} />}
                        <span>{isStaff ? "Staff" : "Livreur"}</span>
                        <span className={`text-[11px] font-normal ${active ? "text-background/70" : "text-muted-foreground"}`}>
                          {isStaff ? "Pointage PIN" : "Accès appli"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nom complet */}
              <TeamField label="Nom complet">
                <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                  placeholder="Prénom Nom" className={teamInput} />
              </TeamField>

              {/* Code PIN – staff only */}
              {addRole === "equipe" && (
                <TeamField label="Code PIN">
                  <div className="relative">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={addPin}
                      onChange={e => setAddPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="• • • •"
                      className={`${teamInput} tracking-widest pr-12`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {addPin.length}/4
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">4 chiffres pour le pointage</p>
                </TeamField>
              )}

              {/* Email */}
              <TeamField label="Email">
                <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
                  placeholder="marie@crazytoasty.fr" className={teamInput} />
              </TeamField>

              {/* Téléphone */}
              <TeamField label="Téléphone">
                <input value={addPhone} onChange={e => setAddPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78" className={teamInput} />
              </TeamField>

              {/* Restaurant (single, static) */}
              <TeamField label="Restaurant">
                <input value="Crazy Toasty" readOnly disabled
                  className={`${teamInput} opacity-60 cursor-not-allowed bg-muted`} />
                <p className="mt-1 text-[11px] text-muted-foreground">À insérer ultérieurement</p>
              </TeamField>
            </div>

            <div className="flex items-center justify-between border-t border-border/50 px-6 py-4">
              <button onClick={() => setAddOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Close
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-80 transition-opacity disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Ajouter le membre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const teamInput = "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/20";

function TeamField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted-foreground"
        style={{ fontFamily: "var(--font-sans)" }}>{label}</label>
      {children}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Spinner() {
  return <div className="flex justify-center py-16"><div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" /></div>;
}

function formatEuro(cents: number) { return `${(cents / 100).toFixed(2).replace(".", ",")} €`; }
function fmtTime(dt: string) { return new Date(dt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(dt: string) { return new Date(dt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); }
