// src/CalendarPlanner.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Edit3,
  Palette,
  Plus,
  Settings,
  Upload,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Save as SaveIcon,
  RotateCcw,
  Download,
  FileUp,
  ChevronDown,
  ChevronUp,
  Globe,
  Link as LinkIcon,
} from "lucide-react";

/* ───────── utils ───────── */
type TEvent = { id: number; text: string; color: string };
type TTodo = { id: number; text: string; completed: boolean; color: string };

const pad2 = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addMonths = (d: Date, m: number) =>
  new Date(d.getFullYear(), d.getMonth() + m, 1);
const addDays = (d: Date, n: number) => {
  const t = new Date(d);
  t.setDate(t.getDate() + n);
  return t;
};
const hexToRgba = (hex: string, a = 1) => {
  const s = hex.startsWith("#") ? hex.slice(1) : hex;
  const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const v = parseInt(f, 16);
  const r = (v >> 16) & 255,
    g = (v >> 8) & 255,
    b = v & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const STORAGE_KEY = "MCP_v14";

/* ───────── component ───────── */
const CalendarPlanner: React.FC = () => {
  /* core data */
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, TEvent[]>>({});
  const [todos, setTodos] = useState<TTodo[]>([]);
  const [newEvent, setNewEvent] = useState("");
  const [newTodo, setNewTodo] = useState("");
  const [editingEvent, setEditingEvent] = useState<number | null>(null);

  /* header (settings panel only) */
  const [headerTitle, setHeaderTitle] = useState("나의 플래너");
  const [headerImage, setHeaderImage] = useState("");
  const [headerBgColor, setHeaderBgColor] = useState("#ffffff");
  const [headerTextColor, setHeaderTextColor] = useState("#1f2937");
  const [headerTextAlign, setHeaderTextAlign] =
    useState<"left" | "center" | "right">("left");

  /* global theme */
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [containerOpacity, setContainerOpacity] = useState(0.92);
  const [borderRadius, setBorderRadius] = useState(8);
  const [borderEnabled, setBorderEnabled] = useState(true);
  const [fontScale, setFontScale] = useState(1.0);

  /* 페이지 배경 그라데이션 */
  const [gradientStart, setGradientStart] = useState("#667eea");
  const [gradientEnd, setGradientEnd] = useState("#764ba2");

  /* containers background */
  const [decorCardBgColor, setDecorCardBgColor] = useState("#f3f4f6");
  const [decorCardBgImg, setDecorCardBgImg] = useState("");
  const [timeCardBgColor, setTimeCardBgColor] = useState("#f3f4f6");
  const [timeCardBgImg, setTimeCardBgImg] = useState("");
  const [todoBgColor, setTodoBgColor] = useState("#f3f4f6");
  const [todoBgImg, setTodoBgImg] = useState("");
  const [calendarBgColor, setCalendarBgColor] = useState("#ffffff");
  const [calendarBgImg, setCalendarBgImg] = useState("");

  /* 달력 디자인/사이즈 조절 (추가) */
  const [calCellMinH, setCalCellMinH] = useState(84); // 셀 최소 높이
  const [calHeaderH, setCalHeaderH] = useState(36);   // 요일 헤더 높이
  const [calGap, setCalGap] = useState(8);            // 셀 간격(px)
  const [calLineColor, setCalLineColor] = useState("#e5e7eb"); // 라인색

  /* 새로 추가: 일정/투두 개별 색 선택 */
  const [newEventColor, setNewEventColor] = useState(accentColor);
  const [newTodoColor, setNewTodoColor] = useState(accentColor);

  /* holidays (simple manual) */
  const [holidayText, setHolidayText] = useState(""); // YYYY-MM-DD, 공백/줄바꿈/쉼표 구분

  /* Google Calendar(ICS) 연동 */
  const [gcalIcsUrl, setGcalIcsUrl] = useState(
    "https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics"
  );
  const [isImportingIcs, setIsImportingIcs] = useState(false);

  /* UI */
  const [showSettings, setShowSettings] = useState(false);
  const [now, setNow] = useState(new Date());

  /* refs for uploads */
  const refGlobalBg = useRef<HTMLInputElement>(null);
  const refHeaderImg = useRef<HTMLInputElement>(null);
  const refDecorImg = useRef<HTMLInputElement>(null);
  const refTimeImg = useRef<HTMLInputElement>(null);
  const refTodoImg = useRef<HTMLInputElement>(null);
  const refCalImg = useRef<HTMLInputElement>(null);
  const refImportJson = useRef<HTMLInputElement>(null);
  const refIcsFile = useRef<HTMLInputElement>(null);

  /* clock */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* load */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);

      setEvents(d.events || {});
      setTodos(d.todos || []);
      setHeaderTitle(d.headerTitle ?? "나의 플래너");
      setHeaderImage(d.headerImage ?? "");
      setHeaderBgColor(d.headerBgColor ?? "#ffffff");
      setHeaderTextColor(d.headerTextColor ?? "#1f2937");
      setHeaderTextAlign(d.headerTextAlign ?? "left");

      setAccentColor(d.accentColor ?? "#3b82f6");
      setBackgroundImage(d.backgroundImage ?? "");
      setContainerOpacity(d.containerOpacity ?? 0.92);
      setBorderRadius(d.borderRadius ?? 8);
      setBorderEnabled(d.borderEnabled ?? true);
      setFontScale(d.fontScale ?? 1.0);

      setGradientStart(d.gradientStart ?? "#667eea");
      setGradientEnd(d.gradientEnd ?? "#764ba2");

      setDecorCardBgColor(d.decorCardBgColor ?? "#f3f4f6");
      setDecorCardBgImg(d.decorCardBgImg ?? "");
      setTimeCardBgColor(d.timeCardBgColor ?? "#f3f4f6");
      setTimeCardBgImg(d.timeCardBgImg ?? "");
      setTodoBgColor(d.todoBgColor ?? "#f3f4f6");
      setTodoBgImg(d.todoBgImg ?? "");
      setCalendarBgColor(d.calendarBgColor ?? "#ffffff");
      setCalendarBgImg(d.calendarBgImg ?? "");
      setHolidayText(d.holidayText ?? "");

      setGcalIcsUrl(d.gcalIcsUrl ?? gcalIcsUrl);

      setCalCellMinH(d.calCellMinH ?? 84);
      setCalHeaderH(d.calHeaderH ?? 36);
      setCalGap(d.calGap ?? 8);
      setCalLineColor(d.calLineColor ?? "#e5e7eb");

      setNewEventColor(d.newEventColor ?? (d.accentColor ?? "#3b82f6"));
      setNewTodoColor(d.newTodoColor ?? (d.accentColor ?? "#3b82f6"));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* auto-save */
  useEffect(() => {
    const payload = {
      events,
      todos,
      headerTitle,
      headerImage,
      headerBgColor,
      headerTextColor,
      headerTextAlign,
      accentColor,
      backgroundImage,
      containerOpacity,
      borderRadius,
      borderEnabled,
      fontScale,
      gradientStart,
      gradientEnd,
      decorCardBgColor,
      decorCardBgImg,
      timeCardBgColor,
      timeCardBgImg,
      todoBgColor,
      todoBgImg,
      calendarBgColor,
      calendarBgImg,
      holidayText,
      gcalIcsUrl,
      calCellMinH,
      calHeaderH,
      calGap,
      calLineColor,
      newEventColor,
      newTodoColor,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [
    events,
    todos,
    headerTitle,
    headerImage,
    headerBgColor,
    headerTextColor,
    headerTextAlign,
    accentColor,
    backgroundImage,
    containerOpacity,
    borderRadius,
    borderEnabled,
    fontScale,
    gradientStart,
    gradientEnd,
    decorCardBgColor,
    decorCardBgImg,
    timeCardBgColor,
    timeCardBgImg,
    todoBgColor,
    todoBgImg,
    calendarBgColor,
    calendarBgImg,
    holidayText,
    gcalIcsUrl,
    calCellMinH,
    calHeaderH,
    calGap,
    calLineColor,
    newEventColor,
    newTodoColor,
  ]);

  /* helpers */
  const loadDataUrl = (f: File, setter: (s: string) => void) => {
    const r = new FileReader();
    r.onload = (e) => setter(String(e.target?.result || ""));
    r.readAsDataURL(f);
  };

  const exportJSON = () => {
    const raw = localStorage.getItem(STORAGE_KEY) ?? "{}";
    const blob = new Blob([raw], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planner-backup-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJSON = (file: File) => {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const data = JSON.parse(String(e.target?.result || "{}"));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        window.location.reload();
      } catch {
        alert("가져오기 실패: JSON 형식 확인");
      }
    };
    r.readAsText(file, "utf-8");
  };
  const resetAll = () => {
    if (!confirm("모든 설정/데이터가 초기화됩니다. 계속할까요?")) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  /* ICS -> events */
  type IcsEvent = { dtstart?: string; summary?: string };
  const parseICS = (txt: string): IcsEvent[] => {
    const out: IcsEvent[] = [];
    const lines = txt.replace(/\r/g, "").split("\n");
    let cur: IcsEvent | null = null;
    for (const line of lines) {
      if (line === "BEGIN:VEVENT") cur = {};
      else if (line === "END:VEVENT") {
        if (cur && cur.dtstart) out.push(cur);
        cur = null;
      } else if (cur) {
        if (line.startsWith("DTSTART")) cur.dtstart = line.split(":").pop() || "";
        if (line.startsWith("SUMMARY"))
          cur.summary = line.split(":").slice(1).join(":").trim();
      }
    }
    return out;
  };

  const toLocalDateFromIcs = (v?: string) => {
    if (!v) return null;
    if (/^\d{8}$/.test(v)) {
      const y = +v.slice(0, 4);
      const m = +v.slice(4, 6) - 1;
      const d = +v.slice(6, 8);
      return new Date(y, m, d, 12, 0, 0);
    }
    const iso = v
      .replace(/(\d{8})T(\d{6})Z?/, (m, d8, t6) => {
        const y = d8.slice(0, 4);
        const m2 = d8.slice(4, 6);
        const d2 = d8.slice(6, 8);
        const h = t6.slice(0, 2);
        const mi = t6.slice(2, 4);
        const s = t6.slice(4, 6);
        return `${y}-${m2}-${d2}T${h}:${mi}:${s}Z`;
      })
      .replace(/(\d{8})T(\d{6})$/, (m, d8, t6) => {
        const y = d8.slice(0, 4);
        const m2 = d8.slice(4, 6);
        const d2 = d8.slice(6, 8);
        const h = t6.slice(0, 2);
        const mi = t6.slice(2, 4);
        const s = t6.slice(4, 6);
        return `${y}-${m2}-${d2}T${h}:${mi}:${s}`;
      });
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };

  const importEventsFromICSString = (txt: string) => {
    const list = parseICS(txt);
    let added = 0;
    const next: Record<string, TEvent[]> = { ...events };
    for (const item of list) {
      const dt = toLocalDateFromIcs(item.dtstart);
      if (!dt) continue;
      const k = dateKey(dt);
      const text = item.summary || "이벤트";
      const ev: TEvent = {
        id: Date.now() + Math.floor(Math.random() * 1e6),
        text,
        color: accentColor,
      };
      next[k] = [...(next[k] || []), ev];
      added++;
    }
    setEvents(next);
    return added;
  };

  const importIcsFromUrl = async () => {
    if (!gcalIcsUrl) return;
    setIsImportingIcs(true);
    try {
      const res = await fetch(gcalIcsUrl);
      if (!res.ok) throw new Error(String(res.status));
      const txt = await res.text();
      const n = importEventsFromICSString(txt);
      alert(`${n}개의 이벤트를 불러왔습니다.`);
    } catch {
      alert("불러오기 실패(CORS 또는 URL 확인). .ics 파일 업로드를 사용해보세요.");
    } finally {
      setIsImportingIcs(false);
    }
  };

  const importIcsFromFile = (file: File) => {
    const r = new FileReader();
    r.onload = (e) => {
      const txt = String(e.target?.result || "");
      const n = importEventsFromICSString(txt);
      alert(`${n}개의 이벤트를 불러왔습니다.`);
    };
    r.readAsText(file, "utf-8");
  };

  /* calendar array */
  const calendarDays = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const start = addDays(first, -first.getDay()); // Sun start
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const holidaySet = useMemo(() => {
    const set = new Set<string>();
    (holidayText || "")
      .split(/[,\s\n]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .forEach((d) => set.add(d));
    return set;
  }, [holidayText]);

  /* CRUD with color */
  const addEventLocal = () => {
    const text = newEvent.trim();
    if (!text) return;
    const k = dateKey(selectedDate);
    setEvents((p) => ({
      ...p,
      [k]: [...(p[k] || []), { id: Date.now(), text, color: newEventColor }],
    }));
    setNewEvent("");
  };
  const deleteEventLocal = (k: string, id: number) => {
    setEvents((p) => ({ ...p, [k]: (p[k] || []).filter((e) => e.id !== id) }));
  };
  const editEventText = (k: string, id: number, text: string) => {
    setEvents((p) => ({
      ...p,
      [k]: (p[k] || []).map((e) => (e.id === id ? { ...e, text } : e)),
    }));
    setEditingEvent(null);
  };
  const setEventColor = (k: string, id: number, color: string) => {
    setEvents((p) => ({
      ...p,
      [k]: (p[k] || []).map((e) => (e.id === id ? { ...e, color } : e)),
    }));
  };

  const addTodoLocal = () => {
    const text = newTodo.trim();
    if (!text) return;
    setTodos((p) => [
      ...p,
      { id: Date.now(), text, completed: false, color: newTodoColor },
    ]);
    setNewTodo("");
  };
  const toggleTodo = (id: number) =>
    setTodos((p) =>
      p.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  const deleteTodo = (id: number) => setTodos((p) => p.filter((t) => t.id !== id));
  const setTodoColorLocal = (id: number, color: string) =>
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, color } : t)));

  /* styles */
  const border = borderEnabled
    ? `1px solid ${calLineColor || hexToRgba("#000", 0.12)}`
    : "1px solid transparent";
  const cardBg = (hex: string) => hexToRgba(hex, containerOpacity);

  const headerStyle: React.CSSProperties = {
    backgroundColor: headerImage ? undefined : headerBgColor,
    backgroundImage: headerImage ? `url(${headerImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    minHeight: 200,
    borderRadius,
    border,
  };
  const decorStyle: React.CSSProperties = {
    backgroundColor: decorCardBgImg ? undefined : cardBg(decorCardBgColor),
    backgroundImage: decorCardBgImg ? `url(${decorCardBgImg})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderRadius,
    border,
    minHeight: 140,
  };
  const timeStyle: React.CSSProperties = {
    backgroundColor: timeCardBgImg ? undefined : cardBg(timeCardBgColor),
    backgroundImage: timeCardBgImg ? `url(${timeCardBgImg})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderRadius,
    border,
  };
  const todoStyle: React.CSSProperties = {
    backgroundColor: todoBgImg ? undefined : cardBg(todoBgColor),
    backgroundImage: todoBgImg ? `url(${todoBgImg})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderRadius,
    border,
  };
  const calStyle: React.CSSProperties = {
    backgroundColor: calendarBgImg ? undefined : cardBg(calendarBgColor),
    backgroundImage: calendarBgImg ? `url(${calendarBgImg})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderRadius,
    border,
  };

  const selectedKey = dateKey(selectedDate);
  const selectedEvents = events[selectedKey] || [];

  /* render */
  return (
    <div
      className="min-h-screen p-3 sm:p-4"
      style={{
        backgroundImage: backgroundImage
          ? `url(${backgroundImage})`
          : `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        fontSize: `${fontScale}rem`,
      }}
    >
      <div className="max-w-7xl mx-auto space-y-4">
        {/* header */}
        <div className="shadow overflow-hidden" style={headerStyle}>
          <div className="p-6 sm:p-8" style={{ textAlign: headerTextAlign }}>
            <h1
              className="font-bold"
              style={{ color: headerTextColor, fontSize: "2.5rem" }}
            >
              {headerTitle}
            </h1>
          </div>
        </div>

        {/* layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* left column */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* 꾸미기 컨테이너 */}
            <div className="p-4 shadow" style={decorStyle}>
              <p className="text-sm opacity-70"></p>
            </div>

            {/* 현재시각 컨테이너 */}
            <div className="p-5 shadow text-center" style={timeStyle}>
              <div
                className="font-mono font-bold text-3xl"
                style={{ color: accentColor }}
              >
                {now.getFullYear()}-{pad2(now.getMonth() + 1)}-
                {pad2(now.getDate())}
              </div>
              <div className="font-mono text-2xl mt-2">
                {pad2(now.getHours())}:{pad2(now.getMinutes())}:
                {pad2(now.getSeconds())}
              </div>
            </div>

            {/* todo */}
            <div className="p-4 shadow" style={todoStyle}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckSquare size={18} /> 할 일
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTodoLocal()}
                  placeholder="새 할 일…"
                  className="flex-1 px-3 py-2 bg-white/95"
                  style={{ border, borderRadius }}
                />
                <input
                  type="color"
                  value={newTodoColor}
                  onChange={(e) => setNewTodoColor(e.target.value)}
                  title="투두 색상"
                  className="w-10 h-10 p-0 cursor-pointer"
                  style={{ border, borderRadius, background: "#fff" }}
                />
                <button
                  onClick={addTodoLocal}
                  className="px-3 py-2 text-white"
                  style={{ backgroundColor: newTodoColor, border, borderRadius }}
                  aria-label="추가"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {todos.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 p-2 bg-white/95"
                    style={{ border, borderRadius }}
                  >
                    <button
                      onClick={() => toggleTodo(t.id)}
                      className="w-6 h-6 flex items-center justify-center"
                      style={{
                        border,
                        borderRadius,
                        backgroundColor: t.completed ? t.color : "transparent",
                        color: t.completed ? "#fff" : "inherit",
                      }}
                      aria-label="완료 토글"
                    >
                      {t.completed && <CheckSquare size={14} />}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        t.completed ? "line-through opacity-70" : ""
                      }`}
                    >
                      {t.text}
                    </span>
                    <input
                      type="color"
                      value={t.color}
                      onChange={(e) => setTodoColorLocal(t.id, e.target.value)}
                      title="색상 변경"
                      className="w-8 h-8 p-0 cursor-pointer"
                      style={{ border, borderRadius, background: "#fff" }}
                    />
                    <button
                      onClick={() => deleteTodo(t.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50"
                      style={{ border, borderRadius }}
                      aria-label="삭제"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* right column — calendar */}
          <div className="col-span-12 lg:col-span-8 p-4 shadow" style={calStyle}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentDate((d) => addMonths(d, -1))}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200"
                  style={{ border, borderRadius }}
                >
                  이전
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200"
                  style={{ border, borderRadius }}
                >
                  오늘
                </button>
                <button
                  onClick={() => setCurrentDate((d) => addMonths(d, 1))}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200"
                  style={{ border, borderRadius }}
                >
                  다음
                </button>
              </div>
            </div>

            {/* weekdays */}
            <div
              className="grid grid-cols-7 mb-2"
              style={{ gap: calGap }}
            >
              {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
                <div
                  key={w}
                  className="text-center font-medium bg-gray-50 flex items-center justify-center"
                  style={{
                    border,
                    borderRadius,
                    height: calHeaderH,
                    lineHeight: `${calHeaderH}px`,
                  }}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* cells */}
            <div className="grid grid-cols-7" style={{ gap: calGap }}>
              {calendarDays.map((day) => {
                const k = dateKey(day);
                const dayEvents = events[k] || [];
                const isToday = k === dateKey(new Date());
                const isSelected = k === dateKey(selectedDate);
                const isCurMonth = day.getMonth() === currentDate.getMonth();
                const dow = day.getDay();
                const isSun = dow === 0;
                const isSat = dow === 6;
                const isHoliday = isSun || holidaySet.has(k);

                const numberColor = isHoliday
                  ? "#dc2626"
                  : isSat
                  ? "#2563eb"
                  : isToday
                  ? accentColor
                  : "inherit";

                return (
                  <button
                    key={k}
                    onClick={() => setSelectedDate(new Date(day))}
                    className="text-left transition-all relative"
                    style={{
                      minHeight: calCellMinH,
                      padding: 8,
                      border,
                      borderRadius,
                      background: isToday
                        ? hexToRgba(accentColor, 0.1)
                        : "rgba(255,255,255,0.85)",
                      boxShadow: isSelected
                        ? `0 0 0 2px ${accentColor} inset`
                        : "none",
                      opacity: isCurMonth ? 1 : 0.65,
                    }}
                  >
                    <div className="font-medium mb-1" style={{ color: numberColor }}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className="truncate px-1 py-[2px] text-white"
                          style={{
                            backgroundColor: ev.color,
                            borderRadius: Math.max(6, borderRadius),
                          }}
                          title={ev.text}
                        >
                          {ev.text}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs opacity-70">
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* selected day editor */}
            <div className="pt-3 mt-3" style={{ borderTop: border }}>
              <h3 className="font-semibold mb-2">
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 일정
              </h3>
              <div className="flex gap-2 mb-2">
                <input
                  value={newEvent}
                  onChange={(e) => setNewEvent(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addEventLocal()}
                  placeholder="새 일정…"
                  className="flex-1 px-3 py-2 bg-white"
                  style={{ border, borderRadius }}
                />
                <input
                  type="color"
                  value={newEventColor}
                  onChange={(e) => setNewEventColor(e.target.value)}
                  title="일정 색상"
                  className="w-10 h-10 p-0 cursor-pointer"
                  style={{ border, borderRadius, background: "#fff" }}
                />
                <button
                  onClick={addEventLocal}
                  className="px-3 py-2 text-white"
                  style={{ backgroundColor: newEventColor, border, borderRadius }}
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-2 p-2 bg-gray-50"
                    style={{ border, borderRadius }}
                  >
                    {editingEvent === ev.id ? (
                      <input
                        defaultValue={ev.text}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          editEventText(
                            selectedKey,
                            ev.id,
                            (e.target as HTMLInputElement).value
                          )
                        }
                        onBlur={(e) =>
                          editEventText(
                            selectedKey,
                            ev.id,
                            (e.target as HTMLInputElement).value
                          )
                        }
                        className="flex-1 px-2 py-1 bg-white"
                        style={{ border, borderRadius }}
                        autoFocus
                      />
                    ) : (
                      <div
                        className="flex-1 px-2 py-1 text-white"
                        style={{ backgroundColor: ev.color, border, borderRadius }}
                      >
                        {ev.text}
                      </div>
                    )}
                    <input
                      type="color"
                      defaultValue={ev.color}
                      onChange={(e) =>
                        setEventColor(selectedKey, ev.id, e.target.value)
                      }
                      title="색상 변경"
                      className="w-8 h-8 p-0 cursor-pointer"
                      style={{ border, borderRadius, background: "#fff" }}
                    />
                    <button
                      onClick={() =>
                        setEditingEvent(editingEvent === ev.id ? null : ev.id)
                      }
                      className="p-1 hover:bg-gray-100"
                      style={{ border, borderRadius }}
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => deleteEventLocal(selectedKey, ev.id)}
                      className="p-1 text-red-700 hover:bg-red-50"
                      style={{ border, borderRadius }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {!selectedEvents.length && (
                  <p className="text-center opacity-70 py-5 text-sm">
                    일정이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* settings (toggle at bottom) */}
        <div className="mt-4">
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="mx-auto flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white shadow"
            style={{ border, borderRadius }}
          >
            <Settings size={16} />
            {showSettings ? "설정 접기" : "설정 펼치기"}
            {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showSettings && (
            <div
              className="mt-3 p-4 bg-white/95 shadow space-y-4 text-sm"
              style={{ border, borderRadius }}
            >
              {/* 빠른 동작 */}
              <div className="grid gap-2 md:grid-cols-4">
                <button
                  onClick={() =>
                    alert("변경 시 자동 저장됩니다. (로컬 저장소)")
                  }
                  className="px-2 py-2 bg-gray-100 hover:bg-gray-200"
                  style={{ border, borderRadius }}
                >
                  <SaveIcon className="inline mr-1" size={14} />
                  저장 알림
                </button>
                <button
                  onClick={exportJSON}
                  className="px-2 py-2 bg-gray-100 hover:bg-gray-200"
                  style={{ border, borderRadius }}
                >
                  <Download className="inline mr-1" size={14} />
                  백업 내보내기
                </button>
                <button
                  onClick={() => refImportJson.current?.click()}
                  className="px-2 py-2 bg-gray-100 hover:bg-gray-200"
                  style={{ border, borderRadius }}
                >
                  <FileUp className="inline mr-1" size={14} />
                  백업 가져오기
                </button>
                <button
                  onClick={resetAll}
                  className="px-2 py-2 bg-red-50 hover:bg-red-100 text-red-700"
                  style={{ border, borderRadius }}
                >
                  <RotateCcw className="inline mr-1" size={14} />
                  전체 초기화
                </button>
              </div>

              {/* 전체 설정 */}
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="flex items-center gap-2 p-2"
                    style={{ border, borderRadius }}
                  >
                    <Palette size={14} />
                    <span>테마색</span>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div
                    className="flex items-center gap-2 p-2"
                    style={{ border, borderRadius }}
                  >
                    <span>투명도</span>
                    <input
                      type="range"
                      min={0.5}
                      max={1}
                      step={0.01}
                      value={containerOpacity}
                      onChange={(e) => setContainerOpacity(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-10 text-right">
                      {Math.round(containerOpacity * 100)}%
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2 p-2 col-span-2"
                    style={{ border, borderRadius }}
                  >
                    <span>라운드</span>
                    <input
                      type="range"
                      min={0}
                      max={24}
                      step={1}
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-right">{borderRadius}px</span>
                  </div>
                  <div
                    className="flex items-center gap-2 p-2"
                    style={{ border, borderRadius }}
                  >
                    <span>보더 표시</span>
                    <input
                      type="checkbox"
                      checked={borderEnabled}
                      onChange={(e) => setBorderEnabled(e.target.checked)}
                      className="ml-auto"
                    />
                  </div>
                  <div
                    className="flex items-center gap-2 p-2"
                    style={{ border, borderRadius }}
                  >
                    <span>글자 크기</span>
                    <input
                      type="range"
                      min={0.9}
                      max={1.3}
                      step={0.01}
                      value={fontScale}
                      onChange={(e) => setFontScale(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-right">
                      {Math.round(fontScale * 100)}%
                    </span>
                  </div>
                </div>

                {/* 페이지 배경: 그라데이션/이미지 */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="flex items-center gap-2 p-2"
                    style={{ border, borderRadius }}
                  >
                    <span>그라데이션 시작</span>
                    <input
                      type="color"
                      value={gradientStart}
                      onChange={(e) => setGradientStart(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div
                    className="flex items-center gap-2 p-2"
                    style={{ border, borderRadius }}
                  >
                    <span>그라데이션 끝</span>
                    <input
                      type="color"
                      value={gradientEnd}
                      onChange={(e) => setGradientEnd(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div
                    className="flex items-center gap-2 p-2 col-span-2"
                    style={{ border, borderRadius }}
                  >
                    <span>전체 배경 이미지</span>
                    <button
                      onClick={() => refGlobalBg.current?.click()}
                      className="ml-auto px-2 py-1 bg-gray-100 hover:bg-gray-200"
                      style={{ border, borderRadius }}
                    >
                      <Upload size={12} className="inline mr-1" />
                      업로드
                    </button>
                    {backgroundImage && (
                      <button
                        onClick={() => setBackgroundImage("")}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700"
                        style={{ border, borderRadius }}
                      >
                        제거
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 헤더 설정 */}
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 col-span-2" style={{ border, borderRadius }}>
                    <label className="block text-xs mb-1">제목</label>
                    <input
                      value={headerTitle}
                      onChange={(e) => setHeaderTitle(e.target.value)}
                      className="w-full px-2 py-1 bg-white"
                      style={{ border, borderRadius }}
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius }}>
                    <span>글자색</span>
                    <input
                      type="color"
                      value={headerTextColor}
                      onChange={(e) => setHeaderTextColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius }}>
                    <span>배경색</span>
                    <input
                      type="color"
                      value={headerBgColor}
                      onChange={(e) => setHeaderBgColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius }}>
                    <span>정렬</span>
                    <div className="ml-auto grid grid-cols-3 gap-1">
                      {[
                        { v: "left" as const, I: AlignLeft },
                        { v: "center" as const, I: AlignCenter },
                        { v: "right" as const, I: AlignRight },
                      ].map(({ v, I }) => (
                        <button
                          key={v}
                          onClick={() => setHeaderTextAlign(v)}
                          className="px-2 py-1"
                          style={{
                            border,
                            borderRadius,
                            background:
                              headerTextAlign === v ? accentColor : "transparent",
                            color: headerTextAlign === v ? "#fff" : "inherit",
                          }}
                        >
                          <I size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius }}>
                    <span>헤더 배경 이미지</span>
                    <button
                      onClick={() => refHeaderImg.current?.click()}
                      className="ml-auto px-2 py-1 bg-gray-100 hover:bg-gray-200"
                      style={{ border, borderRadius }}
                    >
                      <ImageIcon size={12} className="inline mr-1" />
                      업로드
                    </button>
                    {headerImage && (
                      <button
                        onClick={() => setHeaderImage("")}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700"
                        style={{ border, borderRadius }}
                      >
                        제거
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 꾸미기/현재시각 컨테이너 */}
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius }}>
                    <span>꾸미기 배경색</span>
                    <input
                      type="color"
                      value={decorCardBgColor}
                      onChange={(e) => setDecorCardBgColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius }}>
                    <span>현재시각 배경색</span>
                    <input
                      type="color"
                      value={timeCardBgColor}
                      onChange={(e) => setTimeCardBgColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius }}>
                    <span>꾸미기 배경 이미지</span>
                    <button
                      onClick={() => refDecorImg.current?.click()}
                      className="ml-auto px-2 py-1 bg-gray-100 hover:bg-gray-200"
                      style={{ border, borderRadius }}
                    >
                      <Upload size={12} /> 업로드
                    </button>
                    {decorCardBgImg && (
                      <button
                        onClick={() => setDecorCardBgImg("")}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700"
                        style={{ border, borderRadius }}
                      >
                        제거
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius }}>
                    <span>현재시각 배경 이미지</span>
                    <button
                      onClick={() => refTimeImg.current?.click()}
                      className="ml-auto px-2 py-1 bg-gray-100 hover:bg-gray-200"
                      style={{ border, borderRadius }}
                    >
                      <Upload size={12} /> 업로드
                    </button>
                    {timeCardBgImg && (
                      <button
                        onClick={() => setTimeCardBgImg("")}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700"
                        style={{ border, borderRadius }}
                      >
                        제거
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius }}>
                    <span>투두 배경색</span>
                    <input
                      type="color"
                      value={todoBgColor}
                      onChange={(e) => setTodoBgColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius }}>
                    <span>달력 배경색</span>
                    <input
                      type="color"
                      value={calendarBgColor}
                      onChange={(e) => setCalendarBgColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius }}>
                    <span>투두 배경 이미지</span>
                    <button
                      onClick={() => refTodoImg.current?.click()}
                      className="ml-auto px-2 py-1 bg-gray-100 hover:bg-gray-200"
                      style={{ border, borderRadius }}
                    >
                      <Upload size={12} /> 업로드
                    </button>
                    {todoBgImg && (
                      <button
                        onClick={() => setTodoBgImg("")}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700"
                        style={{ border, borderRadius }}
                      >
                        제거
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius }}>
                    <span>달력 배경 이미지</span>
                    <button
                      onClick={() => refCalImg.current?.click()}
                      className="ml-auto px-2 py-1 bg-gray-100 hover:bg-gray-200"
                      style={{ border, borderRadius }}
                    >
                      <Upload size={12} /> 업로드
                    </button>
                    {calendarBgImg && (
                      <button
                        onClick={() => setCalendarBgImg("")}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700"
                        style={{ border, borderRadius }}
                      >
                        제거
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 달력 디자인/사이즈 조절 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-2" style={{ border, borderRadius }}>
                  <label className="block text-xs mb-1">셀 최소 높이</label>
                  <input
                    type="range"
                    min={60}
                    max={150}
                    step={2}
                    value={calCellMinH}
                    onChange={(e) => setCalCellMinH(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-right text-xs mt-1">{calCellMinH}px</div>
                </div>
                <div className="p-2" style={{ border, borderRadius }}>
                  <label className="block text-xs mb-1">요일 헤더 높이</label>
                  <input
                    type="range"
                    min={28}
                    max={64}
                    step={1}
                    value={calHeaderH}
                    onChange={(e) => setCalHeaderH(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-right text-xs mt-1">{calHeaderH}px</div>
                </div>
                <div className="p-2" style={{ border, borderRadius }}>
                  <label className="block text-xs mb-1">격자 간격</label>
                  <input
                    type="range"
                    min={0}
                    max={16}
                    step={1}
                    value={calGap}
                    onChange={(e) => setCalGap(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-right text-xs mt-1">{calGap}px</div>
                </div>
                <div className="p-2" style={{ border, borderRadius }}>
                  <label className="block text-xs mb-1">라인 색상</label>
                  <input
                    type="color"
                    value={calLineColor}
                    onChange={(e) => setCalLineColor(e.target.value)}
                    className="w-8 h-8 cursor-pointer"
                  />
                </div>
              </div>

              {/* 휴일(수동) */}
              <div className="p-2" style={{ border, borderRadius }}>
                <label className="block text-xs mb-1">
                  휴일(YYYY-MM-DD, 공백/줄바꿈/쉼표 구분)
                </label>
                <textarea
                  value={holidayText}
                  onChange={(e) => setHolidayText(e.target.value)}
                  rows={3}
                  className="w-full p-2 bg-white"
                  style={{ border, borderRadius }}
                  placeholder="예) 2025-01-01, 2025-03-01  2025-05-05"
                />
                <p className="text-[11px] mt-1 opacity-70">
                  일요일은 자동 빨간색, 토요일은 파란색으로 표시됩니다.
                </p>
              </div>

              {/* Google Calendar(ICS) 이벤트 불러오기 */}
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="flex items-center gap-2 p-2 col-span-2"
                    style={{ border, borderRadius }}
                  >
                    <LinkIcon size={14} />
                    <input
                      type="text"
                      value={gcalIcsUrl}
                      onChange={(e) => setGcalIcsUrl(e.target.value)}
                      className="flex-1 px-2 py-1 bg-white"
                      style={{ border, borderRadius }}
                      placeholder="Google Calendar 공개 ICS 주소"
                    />
                  </div>
                  <div
                    className="flex items-center gap-2 p-2"
                    style={{ border, borderRadius }}
                  >
                    <button
                      onClick={importIcsFromUrl}
                      disabled={isImportingIcs}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 flex items-center gap-2 disabled:opacity-60"
                      style={{ border, borderRadius }}
                      title="주소에서 불러오기"
                    >
                      <Globe size={14} />{" "}
                      {isImportingIcs ? "불러오는 중…" : "URL에서 불러오기"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="flex items-center gap-2 p-2 col-span-2"
                    style={{ border, borderRadius }}
                  >
                    <span>ICS 파일 업로드</span>
                    <button
                      onClick={() => refIcsFile.current?.click()}
                      className="ml-auto px-2 py-1 bg-gray-100 hover:bg-gray-200"
                      style={{ border, borderRadius }}
                    >
                      <FileUp size={12} /> 업로드
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* hidden inputs */}
      <input
        ref={refGlobalBg}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && loadDataUrl(e.target.files[0], setBackgroundImage)}
        className="hidden"
      />
      <input
        ref={refHeaderImg}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && loadDataUrl(e.target.files[0], setHeaderImage)}
        className="hidden"
      />
      <input
        ref={refDecorImg}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && loadDataUrl(e.target.files[0], setDecorCardBgImg)}
        className="hidden"
      />
      <input
        ref={refTimeImg}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && loadDataUrl(e.target.files[0], setTimeCardBgImg)}
        className="hidden"
      />
      <input
        ref={refTodoImg}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && loadDataUrl(e.target.files[0], setTodoBgImg)}
        className="hidden"
      />
      <input
        ref={refCalImg}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && loadDataUrl(e.target.files[0], setCalendarBgImg)}
        className="hidden"
      />
      <input
        ref={refImportJson}
        type="file"
        accept="application/json"
        onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])}
        className="hidden"
      />
      <input
        ref={refIcsFile}
        type="file"
        accept=".ics,text/calendar"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importIcsFromFile(f);
        }}
        className="hidden"
      />
    </div>
  );
};

export default CalendarPlanner;

