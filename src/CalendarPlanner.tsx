// src/CalendarPlanner.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Edit3,
  Moon,
  Palette,
  Plus,
  Settings,
  Sun,
  Upload,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Download,
  FileUp,
  RotateCcw,
  Save as SaveIcon,
  Globe,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ---------------- helpers ---------------- */
type TEvent = { id: number; text: string; color: string };
type TTodo = { id: number; text: string; completed: boolean; color: string };

const pad2 = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);
const addDays = (d: Date, n: number) => {
  const t = new Date(d);
  t.setDate(t.getDate() + n);
  return t;
};
const hexToRgba = (hex: string, a = 1) => {
  const s = hex.replace("#", "");
  const full = s.length === 3 ? s.split("").map(c => c + c).join("") : s;
  const v = parseInt(full, 16);
  const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const STORAGE_KEY = "MCP_v6";

/* -------- ICS parsing (SUMMARY 포함) -------- */
type IcsEvent = { dtstart: string; dtend?: string; summary?: string };
function parseICS(text: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let cur: any = null;
  for (let line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") {
      if (cur?.dtstart) events.push(cur);
      cur = null;
    } else if (cur) {
      if (/^[ \t]/.test(line)) {
        const last = Object.keys(cur).pop();
        if (last) cur[last] += line.trim();
        continue;
      }
      if (line.startsWith("DTSTART")) {
        const v = line.split(":").pop() || "";
        cur.dtstart = v.trim();
      } else if (line.startsWith("DTEND")) {
        const v = line.split(":").pop() || "";
        cur.dtend = v.trim();
      } else if (line.startsWith("SUMMARY")) {
        const v = line.split(":").slice(1).join(":");
        cur.summary = (v || "").trim();
      }
    }
  }
  return events;
}
function holidayMapFromICS(icsText: string, year: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of parseICS(icsText)) {
    const ymd = (e.dtstart || "").slice(0, 8);
    if (ymd.length !== 8) continue;
    const y = Number(ymd.slice(0, 4));
    if (y !== year) continue;
    const mm = ymd.slice(4, 6);
    const dd = ymd.slice(6, 8);
    out[`${y}-${mm}-${dd}`] = e.summary || "휴일";
  }
  return out;
}

/* ---------------- component ---------------- */
const CalendarPlanner: React.FC = () => {
  /* core */
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, TEvent[]>>({});
  const [todos, setTodos] = useState<TTodo[]>([]);
  const [newEvent, setNewEvent] = useState("");
  const [newTodo, setNewTodo] = useState("");
  const [editingEvent, setEditingEvent] = useState<number | null>(null);

  /* theme/global */
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [globalBg1, setGlobalBg1] = useState("#667eea");
  const [globalBg2, setGlobalBg2] = useState("#764ba2");
  const [globalBgImage, setGlobalBgImage] = useState("");
  const [containerOpacity, setContainerOpacity] = useState(0.92);
  const [radius, setRadius] = useState(8);
  const [fontScale, setFontScale] = useState(1);
  const [showBorders, setShowBorders] = useState(true);
  const [isDark, setIsDark] = useState(false);

  /* header (제목만) */
  const [headerTitle, setHeaderTitle] = useState("나의 플래너");
  const [headerImage, setHeaderImage] = useState("");
  const [headerBg, setHeaderBg] = useState("#ffffff");
  const [headerText, setHeaderText] = useState("#1f2937");
  const [headerAlign, setHeaderAlign] = useState<"left" | "center" | "right">("left");
  const [editHeader, setEditHeader] = useState(false);
  const [showHeaderSettings, setShowHeaderSettings] = useState(false);

  /* 현재 시간 카드 */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const [timeCardBgColor, setTimeCardBgColor] = useState("#f3f4f6");
  const [timeCardBgImg, setTimeCardBgImg] = useState("");
  const [timeBoxColor, setTimeBoxColor] = useState("#3b82f6");
  const [timeBoxImg, setTimeBoxImg] = useState("");

  /* NEW: 꾸미기 이미지(현재시간 카드 상단) */
  const [timeDecorImg, setTimeDecorImg] = useState("");
  // 3:1(기본), 21:9, 16:9 중 선택 가능
  const [timeDecorRatio, setTimeDecorRatio] = useState<"3/1" | "21/9" | "16/9">("3/1");

  /* todo 카드 */
  const [todoBgColor, setTodoBgColor] = useState("#f3f4f6");
  const [todoBgImg, setTodoBgImg] = useState("");

  /* calendar 카드 & 세부 옵션 */
  const [calendarBgColor, setCalendarBgColor] = useState("#ffffff");
  const [calendarBgImg, setCalendarBgImg] = useState("");
  const [cellHeight, setCellHeight] = useState(86);
  const [weekdaySize, setWeekdaySize] = useState(0.95);
  const [dateNumSize, setDateNumSize] = useState(1.0);
  const [eventTextSize, setEventTextSize] = useState(0.9);
  const [maxEventsPerCell, setMaxEventsPerCell] = useState(3);
  const [highlightToday, setHighlightToday] = useState(true);
  const [calendarGap, setCalendarGap] = useState(6);
  type BadgeStyle = "dot" | "pill" | "strip";
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>("dot");

  /* 휴일(수동/ICS) + 고급 토글 */
  const [holidayText, setHolidayText] = useState<string>("");
  const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
  const [saturdayBlue, setSaturdayBlue] = useState<boolean>(true);
  const [startOnMonday, setStartOnMonday] = useState<boolean>(false);
  const [expandLunarBlocks, setExpandLunarBlocks] = useState<boolean>(true);
  const [useAltHolidays, setUseAltHolidays] = useState<boolean>(true);

  /* ICS 자동 불러오기 */
  const [holidayYear, setHolidayYear] = useState<number>(new Date().getFullYear());
  const [icsUrl, setIcsUrl] = useState<string>(
    "https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics"
  );
  const [loadingICS, setLoadingICS] = useState(false);

  /* 하단 설정 패널 토글 */
  const [showSettings, setShowSettings] = useState(false);

  /* theme effect */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  /* 로드 */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      if (data.events) setEvents(data.events);
      if (data.todos) setTodos(data.todos);
      if (data.selectedDate) setSelectedDate(new Date(data.selectedDate));
      if (data.currentDate) setCurrentDate(new Date(data.currentDate));

      if (data.theme) {
        const t = data.theme;
        setAccentColor(t.accentColor ?? accentColor);
        setGlobalBg1(t.globalBg1 ?? globalBg1);
        setGlobalBg2(t.globalBg2 ?? globalBg2);
        setGlobalBgImage(t.globalBgImage ?? "");
        setContainerOpacity(t.containerOpacity ?? containerOpacity);
        setRadius(t.radius ?? radius);
        setFontScale(t.fontScale ?? fontScale);
        setShowBorders(t.showBorders ?? showBorders);
        setIsDark(t.isDark ?? isDark);
      }

      if (data.header) {
        const h = data.header;
        setHeaderTitle(h.headerTitle ?? headerTitle);
        setHeaderImage(h.headerImage ?? "");
        setHeaderBg(h.headerBg ?? headerBg);
        setHeaderText(h.headerText ?? headerText);
        setHeaderAlign(h.headerAlign ?? headerAlign);
      }

      if (data.cards) {
        const c = data.cards;
        setTimeCardBgColor(c.timeCardBgColor ?? timeCardBgColor);
        setTimeCardBgImg(c.timeCardBgImg ?? "");
        setTimeBoxColor(c.timeBoxColor ?? timeBoxColor);
        setTimeBoxImg(c.timeBoxImg ?? "");
        setTodoBgColor(c.todoBgColor ?? todoBgColor);
        setTodoBgImg(c.todoBgImg ?? "");
        setTimeDecorImg(c.timeDecorImg ?? "");
        setTimeDecorRatio(c.timeDecorRatio ?? "3/1");
      }

      if (data.calendar) {
        const cal = data.calendar;
        setCalendarBgColor(cal.calendarBgColor ?? calendarBgColor);
        setCalendarBgImg(cal.calendarBgImg ?? "");
        setCellHeight(cal.cellHeight ?? cellHeight);
        setWeekdaySize(cal.weekdaySize ?? weekdaySize);
        setDateNumSize(cal.dateNumSize ?? dateNumSize);
        setEventTextSize(cal.eventTextSize ?? eventTextSize);
        setMaxEventsPerCell(cal.maxEventsPerCell ?? maxEventsPerCell);
        setHighlightToday(cal.highlightToday ?? highlightToday);
        setCalendarGap(cal.calendarGap ?? calendarGap);
        setBadgeStyle(cal.badgeStyle ?? "dot");
        setStartOnMonday(cal.startOnMonday ?? startOnMonday);
      }

      if (data.holidays) {
        setHolidayText(data.holidays.holidayText ?? "");
        setSaturdayBlue(data.holidays.saturdayBlue ?? true);
        setHolidayYear(data.holidays.holidayYear ?? new Date().getFullYear());
        setIcsUrl(data.holidays.icsUrl ?? icsUrl);
        setExpandLunarBlocks(data.holidays.expandLunarBlocks ?? true);
        setUseAltHolidays(data.holidays.useAltHolidays ?? true);
        setHolidayMap(data.holidays.holidayMap ?? {});
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 저장 */
  useEffect(() => {
    const payload = {
      version: 6,
      currentDate: currentDate.toISOString(),
      selectedDate: selectedDate.toISOString(),
      events,
      todos,
      theme: {
        accentColor,
        globalBg1,
        globalBg2,
        globalBgImage,
        containerOpacity,
        radius,
        fontScale,
        showBorders,
        isDark,
      },
      header: {
        headerTitle,
        headerImage,
        headerBg,
        headerText,
        headerAlign,
      },
      cards: {
        timeCardBgColor,
        timeCardBgImg,
        timeBoxColor,
        timeBoxImg,
        todoBgColor,
        todoBgImg,
        timeDecorImg,
        timeDecorRatio,
      },
      calendar: {
        calendarBgColor,
        calendarBgImg,
        cellHeight,
        weekdaySize,
        dateNumSize,
        eventTextSize,
        maxEventsPerCell,
        highlightToday,
        calendarGap,
        badgeStyle,
        startOnMonday,
      },
      holidays: {
        holidayText,
        saturdayBlue,
        holidayYear,
        icsUrl,
        expandLunarBlocks,
        useAltHolidays,
        holidayMap,
      },
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [
    currentDate, selectedDate, events, todos,
    accentColor, globalBg1, globalBg2, globalBgImage, containerOpacity, radius, fontScale, showBorders, isDark,
    headerTitle, headerImage, headerBg, headerText, headerAlign,
    timeCardBgColor, timeCardBgImg, timeBoxColor, timeBoxImg, todoBgColor, todoBgImg, timeDecorImg, timeDecorRatio,
    calendarBgColor, calendarBgImg, cellHeight, weekdaySize, dateNumSize, eventTextSize, maxEventsPerCell, highlightToday, calendarGap, badgeStyle, startOnMonday,
    holidayText, saturdayBlue, holidayYear, icsUrl, expandLunarBlocks, useAltHolidays, holidayMap
  ]);

  /* refs */
  const refGlobalBg = useRef<HTMLInputElement | null>(null);
  const refHeaderImg = useRef<HTMLInputElement | null>(null);
  const refTimeCardImg = useRef<HTMLInputElement | null>(null);
  const refTimeBoxImg = useRef<HTMLInputElement | null>(null);
  const refTimeDecorImg = useRef<HTMLInputElement | null>(null);
  const refTodoImg = useRef<HTMLInputElement | null>(null);
  const refCalendarImg = useRef<HTMLInputElement | null>(null);
  const refImportJson = useRef<HTMLInputElement | null>(null);
  const refIcsFile = useRef<HTMLInputElement | null>(null);

  /* utils */
  const loadAsDataURL = (f: File, setter: (v: string) => void) => {
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
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `planner-backup-${ts}.json`;
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
        alert("가져오기 실패: 잘못된 JSON 파일입니다.");
      }
    };
    r.readAsText(file, "utf-8");
  };
  const resetAll = () => {
    if (!confirm("모든 설정/일정/할 일이 초기화됩니다. 계속할까요?")) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  /* ICS import */
  const importHolidaysFromUrl = async () => {
    if (!icsUrl) return;
    setLoadingICS(true);
    try {
      const res = await fetch(icsUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const fetched = holidayMapFromICS(text, holidayYear);
      if (!Object.keys(fetched).length) {
        alert("해당 연도 이벤트가 없거나 ICS에 포함되지 않았습니다.");
        return;
      }
      setHolidayMap((prev) => ({ ...prev, ...fetched }));
      alert(`불러오기 완료: ${Object.keys(fetched).length}건`);
    } catch {
      alert("가져오기 실패(CORS 등). 링크에서 .ics 파일을 저장 후 'ICS 파일 업로드'를 사용하세요.");
    } finally {
      setLoadingICS(false);
    }
  };
  const importHolidaysFromFile = (file: File) => {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const text = String(e.target?.result || "");
        const fetched = holidayMapFromICS(text, holidayYear);
        if (!Object.keys(fetched).length) {
          alert("해당 연도 이벤트가 없거나 파일 형식이 올바르지 않습니다.");
          return;
        }
        setHolidayMap((prev) => ({ ...prev, ...fetched }));
        alert(`불러오기 완료: ${Object.keys(fetched).length}건`);
      } catch {
        alert("ICS 파싱 실패: 유효한 파일인지 확인하세요.");
      }
    };
    r.readAsText(file, "utf-8");
  };

  /* 달력 생성 (주 시작 요일 반영) */
  const weekdayNames = startOnMonday
    ? ["월", "화", "수", "목", "금", "토", "일"]
    : ["일", "월", "화", "수", "목", "금", "토"];

  const makeDays = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const firstIndex = startOnMonday ? (first.getDay() + 6) % 7 : first.getDay();
    const start = new Date(first);
    start.setDate(start.getDate() - firstIndex);
    const arr: Date[] = [];
    const end = new Date(start);
    end.setDate(end.getDate() + 41);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      arr.push(new Date(d));
    }
    return arr;
  };
  const days = makeDays();

  /* 휴일 계산(수동 + ICS + 확장 + 대체) */
  const manualMap = useMemo(() => {
    const out: Record<string, string> = {};
    (holidayText || "")
      .split(/[,\n\s]+/)
      .map((v) => v.trim())
      .filter(Boolean)
      .forEach((d) => (out[d] = out[d] || "휴일"));
    return out;
  }, [holidayText]);

  const baseHolidayMap = useMemo(
    () => ({ ...manualMap, ...holidayMap }),
    [manualMap, holidayMap]
  );

  const effectiveHolidaySet = useMemo(() => {
    const set = new Set<string>(Object.keys(baseHolidayMap));
    // 설/추석 블록 확장
    if (true /* expandLunarBlocks default true */) {
      Object.entries(baseHolidayMap).forEach(([d, name]) => {
        if (!name) return;
        if (/(설날|설|추석)/.test(name)) {
          const [y, m, dd] = d.split("-").map(Number);
          const base = new Date(y, (m ?? 1) - 1, dd ?? 1);
          [addDays(base, -1), addDays(base, +1)].forEach((x) =>
            set.add(keyOf(x))
          );
        }
      });
    }
    // 대체공휴일(간이)
    if (useAltHolidays) {
      const isWeekend = (dt: Date) => [0, 6].includes(dt.getDay());
      const nextWeekday = (dt: Date) => {
        let t = new Date(dt);
        do t = addDays(t, 1);
        while ([0, 6].includes(t.getDay()));
        return t;
      };
      Object.entries(baseHolidayMap).forEach(([d, name]) => {
        const [y, m, dd] = d.split("-").map(Number);
        const date = new Date(y, (m ?? 1) - 1, dd ?? 1);
        if (date.getDay() === 0) set.add(keyOf(nextWeekday(date))); // 일요일
        if (/어린이날/.test(name) || (m === 5 && dd === 5)) {
          if (isWeekend(date)) set.add(keyOf(nextWeekday(date)));
        }
        if (/(설날|설|추석)/.test(name) && isWeekend(date)) {
          set.add(keyOf(nextWeekday(date)));
        }
      });
    }
    return set;
  }, [baseHolidayMap, useAltHolidays]);

  const isSunday = (d: Date) => d.getDay() === 0;
  const isSaturday = (d: Date) => d.getDay() === 6;
  const isHoliday = (d: Date) => effectiveHolidaySet.has(keyOf(d)) || isSunday(d);

  /* selected day */
  const selectedKey = keyOf(selectedDate);
  const selectedList = events[selectedKey] || [];

  /* CRUD */
  const addEvent = () => {
    if (!newEvent.trim()) return;
    const k = keyOf(selectedDate);
    setEvents((p) => ({
      ...p,
      [k]: [...(p[k] || []), { id: Date.now(), text: newEvent.trim(), color: accentColor }],
    }));
    setNewEvent("");
  };
  const delEvent = (k: string, id: number) =>
    setEvents((p) => {
      const next = { ...p };
      next[k] = (p[k] || []).filter((e) => e.id !== id);
      if (!next[k]?.length) delete next[k];
      return next;
    });
  const editEventText = (k: string, id: number, text: string) => {
    setEvents((p) => ({
      ...p,
      [k]: (p[k] || []).map((e) => (e.id === id ? { ...e, text } : e)),
    }));
    setEditingEvent(null);
  };
  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos((p) => [
      ...p,
      { id: Date.now(), text: newTodo.trim(), completed: false, color: accentColor },
    ]);
    setNewTodo("");
  };
  const toggleTodo = (id: number) =>
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const delTodo = (id: number) => setTodos((p) => p.filter((t) => t.id !== id));

  /* styles */
  const border = showBorders ? `1px solid ${hexToRgba(accentColor, 0.6)}` : "1px solid transparent";
  const cardBg = (hex: string) => hexToRgba(hex, containerOpacity);

  // 헤더 높이 2.5배 (기존 80 -> 200)
  const headerCardStyle: React.CSSProperties = {
    border, borderRadius: radius, minHeight: 200,
    backgroundColor: headerImage ? undefined : cardBg(headerBg),
    backgroundImage: headerImage ? `url(${headerImage})` : undefined,
    backgroundSize: "cover", backgroundPosition: "center",
  };
  const timeCardStyle: React.CSSProperties = {
    border, borderRadius: radius,
    backgroundColor: timeCardBgImg ? undefined : cardBg(timeCardBgColor),
    backgroundImage: timeCardBgImg ? `url(${timeCardBgImg})` : undefined,
    backgroundSize: "cover", backgroundPosition: "center",
    minHeight: 170,
  };
  const todoCardStyle: React.CSSProperties = {
    border, borderRadius: radius,
    backgroundColor: todoBgImg ? undefined : cardBg(todoBgColor),
    backgroundImage: todoBgImg ? `url(${todoBgImg})` : undefined,
    backgroundSize: "cover", backgroundPosition: "center",
    minHeight: 260,
  };
  const calendarCardStyle: React.CSSProperties = {
    border, borderRadius: radius,
    backgroundColor: calendarBgImg ? undefined : cardBg(calendarBgColor),
    backgroundImage: calendarBgImg ? `url(${calendarBgImg})` : undefined,
    backgroundSize: "cover", backgroundPosition: "center",
  };

  /* render */
  return (
    <div
      className="min-h-screen p-3 sm:p-4 dark:bg-slate-900"
      style={{
        backgroundImage: globalBgImage
          ? `url(${globalBgImage})`
          : `linear-gradient(135deg, ${globalBg1} 0%, ${globalBg2} 100%)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        fontSize: `${fontScale}rem`,
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* ---------------- HEADER ---------------- */}
        <div className="relative mb-3 sm:mb-4">
          <div className="relative overflow-hidden shadow-sm" style={headerCardStyle}>
            {headerImage && <div className="absolute inset-0 bg-black/15 dark:bg-black/30" />}
            <div className="relative z-10 px-3 py-4 sm:px-6 sm:py-6">
              <div className="w-full flex items-start justify-between gap-3" style={{ textAlign: headerAlign }}>
                <div className="flex-1">
                  {editHeader ? (
                    <input
                      value={headerTitle}
                      onChange={(e) => setHeaderTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && setEditHeader(false)}
                      onBlur={() => setEditHeader(false)}
                      className="font-semibold bg-transparent border-2 border-dashed border-white/40 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      style={{ color: headerText, fontSize: "2em", borderRadius: radius }}
                      autoFocus
                      type="text"
                    />
                  ) : (
                    <h1
                      className="font-semibold cursor-pointer hover:opacity-80 transition-opacity leading-tight"
                      style={{ color: headerText, fontSize: "2em" }}
                      onClick={() => setEditHeader(true)}
                    >
                      {headerTitle}
                    </h1>
                  )}
                </div>

                <button
                  onClick={() => setIsDark((v) => !v)}
                  className="px-3 py-2 bg-white/90 dark:bg-slate-800 dark:text-gray-100 hover:bg-white"
                  style={{ border, borderRadius: radius }}
                  aria-label="다크 모드"
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Header settings button */}
          <div className="absolute -top-2 -right-2 z-30">
            <button
              onClick={() => setShowHeaderSettings((v) => !v)}
              className="p-2 text-white shadow-sm hover:shadow transition-transform hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`, border, borderRadius: radius }}
              aria-label="헤더 설정"
            >
              <Settings size={16} />
            </button>

            {showHeaderSettings && (
              <div
                className="absolute right-0 top-full mt-3 bg-white/98 dark:bg-slate-800 dark:text-gray-100 backdrop-blur-md shadow-2xl p-3 min-w-[260px] z-40"
                style={{ border, borderRadius: radius }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Settings size={14} />
                  <h3 className="text-sm font-semibold">헤더 설정</h3>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium mb-2">정렬</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { v: "left", I: AlignLeft },
                      { v: "center", I: AlignCenter },
                      { v: "right", I: AlignRight },
                    ].map(({ v, I }) => (
                      <button
                        key={v}
                        onClick={() => setHeaderAlign(v as any)}
                        className="p-2"
                        style={{
                          background: headerAlign === v ? accentColor : "transparent",
                          color: headerAlign === v ? "#fff" : "inherit",
                          border,
                          borderRadius: radius,
                        }}
                      >
                        <I size={14} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-xs">글자색</span>
                    <input type="color" value={headerText} onChange={(e) => setHeaderText(e.target.value)} className="w-7 h-7 cursor-pointer" />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-xs">배경색</span>
                    <input type="color" value={headerBg} onChange={(e) => setHeaderBg(e.target.value)} className="w-7 h-7 cursor-pointer" />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs mb-2">배경 이미지</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => refHeaderImg.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600"
                      style={{ border, borderRadius: radius }}
                    >
                      <Upload size={12} /> 업로드
                    </button>
                    {headerImage && (
                      <button
                        onClick={() => setHeaderImage("")}
                        className="px-2 py-2 bg-red-50 hover:bg-red-100 text-red-600"
                        style={{ border, borderRadius: radius }}
                      >
                        <X size={12} />
                      </button>
                    )}
                    <input
                      ref={refHeaderImg}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setHeaderImage)}
                      className="hidden"
                    />
                  </div>
                </div>

                <button onClick={() => setShowHeaderSettings(false)} className="w-full px-2.5 py-2 bg-gray-100 hover:bg-gray-200" style={{ border, borderRadius: radius }}>
                  완료
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---------------- GRID ---------------- */}
        <div className="grid grid-cols-12 gap-3">
          {/* LEFT: time + todos */}
          <div className="col-span-12 lg:col-span-4">
            {/* TIME */}
            <div className="relative overflow-hidden p-4 mb-3" style={timeCardStyle}>
              {timeCardBgImg && <div className="absolute inset-0 bg-black/25" />}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2" style={{ fontSize: "1.2em" }}>
                    <Calendar size={20} /> 현재 시각
                  </h3>
                  <div className="flex items-center gap-2 bg-white/85 dark:bg-slate-800 p-1.5" style={{ border, borderRadius: radius }}>
                    <span className="text-[11px]">배경</span>
                    <input type="color" value={timeCardBgColor} onChange={(e) => setTimeCardBgColor(e.target.value)} className="w-6 h-6 cursor-pointer" />
                    <button onClick={() => refTimeCardImg.current?.click()} className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700" style={{ border, borderRadius: radius }}>
                      <Upload size={12} />
                    </button>
                    <input ref={refTimeCardImg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setTimeCardBgImg)} className="hidden" />
                    {timeCardBgImg && (
                      <button onClick={() => setTimeCardBgImg("")} className="p-1 bg-red-50 hover:bg-red-100 text-red-700" style={{ border, borderRadius: radius }}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* NEW: 꾸미기용 이미지 슬롯 (컨테이너 비율에 맞춰 고정 비율) */}
                <div className="mb-2">
                  <div
                    className="w-full overflow-hidden"
                    style={{
                      aspectRatio: timeDecorRatio,
                      border, borderRadius: radius,
                      backgroundColor: "#ffffff",
                      backgroundImage: timeDecorImg ? `url(${timeDecorImg})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px]">꾸미기 이미지</span>
                    <button
                      onClick={() => refTimeDecorImg.current?.click()}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200"
                      style={{ border, borderRadius: radius }}
                    >
                      <ImageIcon size={12} className="inline mr-1" />
                      업로드
                    </button>
                    {timeDecorImg && (
                      <button
                        onClick={() => setTimeDecorImg("")}
                        className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700"
                        style={{ border, borderRadius: radius }}
                      >
                        제거
                      </button>
                    )}
                    <label className="text-[11px] ml-2">비율</label>
                    <select
                      value={timeDecorRatio}
                      onChange={(e) => setTimeDecorRatio(e.target.value as any)}
                      className="px-2 py-1 text-xs bg-white dark:bg-slate-800"
                      style={{ border, borderRadius: radius }}
                      title="이미지 박스 비율"
                    >
                      <option value="3/1">3:1</option>
                      <option value="21/9">21:9</option>
                      <option value="16/9">16:9</option>
                    </select>
                  </div>
                </div>

                <div className="text-center mb-2" style={{ fontSize: "1.05em" }}>
                  {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일
                </div>

                {/* TIME BOX */}
                <div
                  className="mx-auto flex items-center justify-center text-white font-mono font-bold"
                  style={{
                    minHeight: 70, padding: "14px 16px", letterSpacing: 1,
                    border, borderRadius: radius,
                    backgroundColor: timeBoxImg ? undefined : timeBoxColor,
                    backgroundImage: timeBoxImg ? `url(${timeBoxImg})` : undefined,
                    backgroundSize: "cover", backgroundPosition: "center",
                    width: "100%", fontSize: "2.2em",
                  }}
                >
                  {pad2(now.getHours())}:{pad2(now.getMinutes())}:{pad2(now.getSeconds())}
                </div>

                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px]">시간 박스</span>
                  <input type="color" value={timeBoxColor} onChange={(e) => setTimeBoxColor(e.target.value)} className="w-6 h-6 cursor-pointer" />
                  <button onClick={() => refTimeBoxImg.current?.click()} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200" style={{ border, borderRadius: radius }}>
                    <ImageIcon size={12} className="inline mr-1" /> 이미지
                  </button>
                  <input ref={refTimeBoxImg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setTimeBoxImg)} className="hidden" />
                  {timeBoxImg && (
                    <button onClick={() => setTimeBoxImg("")} className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700" style={{ border, borderRadius: radius }}>
                      제거
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* TODOS */}
            <div className="relative overflow-hidden p-4" style={todoCardStyle}>
              {todoBgImg && <div className="absolute inset-0 bg-black/25" />}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2" style={{ fontSize: "1.2em" }}>
                    <CheckSquare size={20} /> 할 일 리스트
                  </h3>
                  <div className="flex items-center gap-2 bg-white/85 dark:bg-slate-800 p-1.5" style={{ border, borderRadius: radius }}>
                    <span className="text-[11px]">배경</span>
                    <input type="color" value={todoBgColor} onChange={(e) => setTodoBgColor(e.target.value)} className="w-6 h-6 cursor-pointer" />
                    <button onClick={() => refTodoImg.current?.click()} className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700" style={{ border, borderRadius: radius }}>
                      <Upload size={12} />
                    </button>
                    <input ref={refTodoImg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setTodoBgImg)} className="hidden" />
                    {todoBgImg && (
                      <button onClick={() => setTodoBgImg("")} className="p-1 bg-red-50 hover:bg-red-100 text-red-700" style={{ border, borderRadius: radius }}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text" value={newTodo} onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTodo()} placeholder="새 할 일을 입력하세요..."
                    className="flex-1 px-3 py-2 bg-white/95 dark:bg-slate-800" style={{ border, borderRadius: radius }}
                  />
                  <button onClick={addTodo} className="px-3 py-2 text-white hover:opacity-90" style={{ backgroundColor: accentColor, border, borderRadius: radius }} aria-label="할 일 추가">
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {todos.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 p-2 bg-white/95 dark:bg-slate-800" style={{ border, borderRadius: radius }}>
                      <button
                        onClick={() => toggleTodo(t.id)} className="w-6 h-6 flex items-center justify-center"
                        style={{ border, borderRadius: radius, backgroundColor: t.completed ? t.color : "transparent", color: t.completed ? "#fff" : "inherit" }}
                      >
                        {t.completed && <CheckSquare size={14} />}
                      </button>
                      <span className={`flex-1 text-sm ${t.completed ? "line-through opacity-70" : ""}`}>{t.text}</span>
                      <button onClick={() => delTodo(t.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" style={{ border, borderRadius: radius }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {!todos.length && <div className="text-center py-8 opacity-70 text-sm">할 일을 추가해보세요!</div>}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Calendar */}
          <div className="col-span-12 lg:col-span-8">
            <div className="p-3 sm:p-4" style={calendarCardStyle}>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold flex items-center gap-2" style={{ fontSize: "1.3em" }}>
                  <Calendar size={18} />
                  {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </h2>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentDate((d) => addMonths(d, -1))} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600" style={{ border, borderRadius: radius }}>
                    ←
                  </button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600" style={{ border, borderRadius: radius }}>
                    오늘
                  </button>
                  <button onClick={() => setCurrentDate((d) => addMonths(d, +1))} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600" style={{ border, borderRadius: radius }}>
                    →
                  </button>
                </div>
              </div>

              {/* weekday header */}
              <div className="grid grid-cols-7 mb-2" style={{ gap: calendarGap }}>
                {(startOnMonday ? ["월","화","수","목","금","토","일"] : ["일","월","화","수","목","금","토"]).map((d, idx) => (
                  <div
                    key={d}
                    className="text-center py-1.5 font-medium bg-gray-50 dark:bg-slate-800"
                    style={{ border, borderRadius: radius, fontSize: `${weekdaySize}em` }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* days */}
              <div className="grid grid-cols-7 mb-3" style={{ gap: calendarGap }}>
                {days.map((day) => {
                  const k = keyOf(day);
                  const list = events[k] || [];
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  const isCurMonth = day.getMonth() === currentDate.getMonth();

                  const baseBg = isCurMonth ? "rgba(255,255,255,0.8)" : "rgba(245,245,245,0.7)";
                  const numberColor =
                    (effectiveHolidaySet.has(k) || day.getDay() === 0) ? "#dc2626"
                      : (saturdayBlue && day.getDay() === 6) ? "#2563eb"
                      : (isToday && highlightToday) ? accentColor
                      : "inherit";

                  return (
                    <button
                      key={k} onClick={() => setSelectedDate(new Date(day))}
                      className="text-left transition-all relative"
                      style={{
                        minHeight: cellHeight, padding: 8, border, borderRadius: radius,
                        background: (highlightToday && isToday) ? hexToRgba(accentColor, 0.12) : baseBg,
                        boxShadow: isSelected ? `0 0 0 2px ${accentColor} inset` : "none",
                        opacity: isCurMonth ? 1 : 0.7,
                      }}
                    >
                      <div className="font-medium mb-1" style={{ color: numberColor, fontSize: `${dateNumSize}em` }}>
                        {day.getDate()}
                      </div>

                      <div className="space-y-0.5">
                        {list.slice(0, maxEventsPerCell).map((ev) => {
                          if (badgeStyle === "dot") {
                            return (
                              <div key={ev.id} className="flex items-center gap-1 truncate" style={{ fontSize: `${eventTextSize}em` }} title={ev.text}>
                                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: ev.color }} />
                                <span className="truncate">{ev.text}</span>
                              </div>
                            );
                          }
                          if (badgeStyle === "pill") {
                            return (
                              <div key={ev.id} className="truncate px-1 py-[2px] text-white"
                                   style={{ backgroundColor: ev.color, borderRadius: Math.max(6, radius), fontSize: `${eventTextSize}em` }}
                                   title={ev.text}>
                                {ev.text}
                              </div>
                            );
                          }
                          // strip
                          return (
                            <div key={ev.id} className="truncate px-1 py-[2px] bg-white"
                                 style={{ borderLeft: `4px solid ${ev.color}`, border: showBorders ? `1px solid ${hexToRgba(accentColor, 0.4)}` : "1px solid transparent", borderRadius: radius, fontSize: `${eventTextSize}em` }}
                                 title={ev.text}>
                              {ev.text}
                            </div>
                          );
                        })}
                        {list.length > maxEventsPerCell && (
                          <div className="opacity-70" style={{ fontSize: `${eventTextSize}em` }}>
                            +{list.length - maxEventsPerCell}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* selected day editor */}
              <div style={{ borderTop: border }} className="pt-3">
                <h3 className="font-semibold mb-2" style={{ fontSize: "1.15em" }}>
                  {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 일정
                </h3>

                <div className="flex gap-2 mb-2.5">
                  <input
                    type="text" value={newEvent} onChange={(e) => setNewEvent(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEvent()} placeholder="새 일정 추가..."
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800" style={{ border, borderRadius: radius }}
                  />
                  <button onClick={addEvent} className="px-3 py-2 text-white hover:opacity-90" style={{ backgroundColor: accentColor, border, borderRadius: radius }}>
                    <Plus size={14} />
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedList.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800" style={{ border, borderRadius: radius }}>
                      {editingEvent === ev.id ? (
                        <input
                          type="text" defaultValue={ev.text}
                          onKeyDown={(e) => e.key === "Enter" && editEventText(selectedKey, ev.id, (e.target as HTMLInputElement).value)}
                          onBlur={(e) => editEventText(selectedKey, ev.id, (e.target as HTMLInputElement).value)}
                          className="flex-1 px-2 py-1 bg-white dark:bg-slate-700" style={{ border, borderRadius: radius }} autoFocus
                        />
                      ) : (
                        <div className="flex-1 px-2 py-1 text-white" style={{ backgroundColor: ev.color, border, borderRadius: radius }}>
                          {ev.text}
                        </div>
                      )}
                      <button onClick={() => setEditingEvent(editingEvent === ev.id ? null : ev.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700" style={{ border, borderRadius: radius }}>
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => delEvent(selectedKey, ev.id)} className="p-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20" style={{ border, borderRadius: radius }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {!selectedList.length && <p className="text-center opacity-70 py-5 text-sm">일정이 없습니다.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- SETTINGS TOGGLE (bottom) ---------------- */}
        <div className="mt-4">
          <button
            onClick={() => setShowSettings(s => !s)}
            className="mx-auto flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-slate-800 hover:bg-white"
            style={{ border, borderRadius: radius }}
            aria-expanded={showSettings}
          >
            <Settings size={16} />
            {showSettings ? "설정 접기" : "설정 펼치기"}
            {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showSettings && (
            <div
              className="mt-3 p-3 sm:p-4"
              style={{ border, borderRadius: radius, backgroundColor: hexToRgba("#ffffff", containerOpacity) }}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ fontSize: "1.1em" }}>
                <Settings size={16} /> 전체 설정
              </h3>

              {/* 저장/복구 퀵 액션 */}
              <div className="grid gap-2 md:grid-cols-4 mb-3">
                <button
                  onClick={() => { try { localStorage.setItem(STORAGE_KEY, localStorage.getItem(STORAGE_KEY) ?? "{}"); alert("현재 상태를 로컬에 저장했습니다."); } catch {} }}
                  className="px-2 py-2 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2"
                  style={{ border, borderRadius: radius }}
                >
                  <SaveIcon size={16} /> 저장
                </button>
                <button onClick={exportJSON} className="px-2 py-2 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2" style={{ border, borderRadius: radius }}>
                  <Download size={16} /> 내보내기(JSON)
                </button>
                <button onClick={() => refImportJson.current?.click()} className="px-2 py-2 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2" style={{ border, borderRadius: radius }}>
                  <FileUp size={16} /> 가져오기(JSON)
                </button>
                <button onClick={resetAll} className="px-2 py-2 bg-red-50 hover:bg-red-100 text-red-700 flex items-center justify-center gap-2" style={{ border, borderRadius: radius }}>
                  <RotateCcw size={16} /> 초기화
                </button>
              </div>

              {/* 1) 전체 테마 */}
              <div className="grid gap-2 md:grid-cols-2 mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <Palette size={14} />
                    <span className="text-sm">테마색</span>
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-7 h-7 cursor-pointer ml-auto" />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">컨테이너 투명도</span>
                    <input type="range" min={0.5} max={1} step={0.01} value={containerOpacity} onChange={(e) => setContainerOpacity(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs w-10 text-right">{Math.round(containerOpacity * 100)}%</span>
                  </div>

                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">라운드</span>
                    <input type="range" min={0} max={24} step={1} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs w-10 text-right">{radius}px</span>
                  </div>

                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">글자 크기</span>
                    <input type="range" min={0.9} max={1.3} step={0.01} value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs w-10 text-right">{Math.round(fontScale * 100)}%</span>
                  </div>

                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">보더 표시</span>
                    <input type="checkbox" checked={showBorders} onChange={(e) => setShowBorders(e.target.checked)} className="ml-auto w-4 h-4" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">배경 그라데이션 1</span>
                    <input type="color" value={globalBg1} onChange={(e) => setGlobalBg1(e.target.value)} className="w-7 h-7 cursor-pointer ml-auto" />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">배경 그라데이션 2</span>
                    <input type="color" value={globalBg2} onChange={(e) => setGlobalBg2(e.target.value)} className="w-7 h-7 cursor-pointer ml-auto" />
                  </div>

                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <button onClick={() => refGlobalBg.current?.click()} className="px-2 py-1 bg-gray-100 hover:bg-gray-200" style={{ border, borderRadius: radius }}>
                      <Upload size={12} className="inline mr-1" />
                      전체 배경 이미지
                    </button>
                    <input ref={refGlobalBg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setGlobalBgImage)} className="hidden" />
                    {globalBgImage && (
                      <button onClick={() => setGlobalBgImage("")} className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 ml-2" style={{ border, borderRadius: radius }}>
                        제거
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 2) 캘린더/휴일/토글 */}
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">달력 칸 높이</span>
                    <input type="range" min={64} max={140} step={2} value={cellHeight} onChange={(e) => setCellHeight(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs w-12 text-right">{cellHeight}px</span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">칸 간격</span>
                    <input type="range" min={2} max={14} step={1} value={calendarGap} onChange={(e) => setCalendarGap(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs w-12 text-right">{calendarGap}px</span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">요일 글자</span>
                    <input type="range" min={0.8} max={1.3} step={0.01} value={weekdaySize} onChange={(e) => setWeekdaySize(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs w-12 text-right">{Math.round(weekdaySize * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">날짜 숫자</span>
                    <input type="range" min={0.8} max={1.4} step={0.01} value={dateNumSize} onChange={(e) => setDateNumSize(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs w-12 text-right">{Math.round(dateNumSize * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">이벤트 글자</span>
                    <input type="range" min={0.8} max={1.2} step={0.01} value={eventTextSize} onChange={(e) => setEventTextSize(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs w-12 text-right">{Math.round(eventTextSize * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">칸당 이벤트</span>
                    <input type="range" min={1} max={6} step={1} value={maxEventsPerCell} onChange={(e) => setMaxEventsPerCell(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs w-12 text-right">{maxEventsPerCell}개</span>
                  </div>

                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">주 시작 요일</span>
                    <label className="text-xs ml-auto flex items-center gap-2">
                      <input type="checkbox" checked={startOnMonday} onChange={(e) => setStartOnMonday(e.target.checked)} />
                      월요일 시작
                    </label>
                  </div>
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">설/추석 연휴 전·후 1일 포함</span>
                    <input type="checkbox" className="ml-auto" checked={expandLunarBlocks} onChange={(e) => setExpandLunarBlocks(e.target.checked)} />
                  </div>
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">대체공휴일 자동 반영</span>
                    <input type="checkbox" className="ml-auto" checked={useAltHolidays} onChange={(e) => setUseAltHolidays(e.target.checked)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">달력 배경색</span>
                    <input type="color" value={calendarBgColor} onChange={(e) => setCalendarBgColor(e.target.value)} className="w-7 h-7 cursor-pointer ml-auto" />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">달력 배경 이미지</span>
                    <button onClick={() => refCalendarImg.current?.click()} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 ml-auto" style={{ border, borderRadius: radius }}>
                      <Upload size={12} className="inline mr-1" /> 업로드
                    </button>
                    <input ref={refCalendarImg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setCalendarBgImg)} className="hidden" />
                    {calendarBgImg && (
                      <button onClick={() => setCalendarBgImg("")} className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700" style={{ border, borderRadius: radius }}>
                        제거
                      </button>
                    )}
                  </div>

                  {/* 휴일 입력 & 자동 불러오기 */}
                  <div className="flex items-start gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <div className="flex-1">
                      <label className="text-sm block mb-1">
                        휴일(빨간색) 날짜 목록 <span className="text-xs opacity-70">(YYYY-MM-DD, 줄바꿈/콤마 구분)</span>
                      </label>
                      <textarea
                        value={holidayText} onChange={(e) => setHolidayText(e.target.value)}
                        placeholder="예) 2025-01-01, 2025-02-10, 2025-03-01"
                        className="w-full p-2 bg-white dark:bg-slate-800" rows={3} style={{ border, borderRadius: radius }}
                      />
                    </div>
                    <div className="w-full md:w-72">
                      <label className="text-sm block mb-1">주말 강조</label>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800" style={{ border, borderRadius: radius }}>
                        <span className="text-xs">토요일 파란색</span>
                        <input type="checkbox" checked={saturdayBlue} onChange={(e) => setSaturdayBlue(e.target.checked)} className="ml-auto w-4 h-4" />
                      </div>

                      <div className="mt-3">
                        <label className="text-sm block mb-1">대한민국 공휴일 자동 불러오기</label>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="number" min={1900} max={2100} value={holidayYear}
                            onChange={(e) => setHolidayYear(Number(e.target.value))}
                            className="w-28 px-2 py-1 bg-white dark:bg-slate-800" style={{ border, borderRadius: radius }} title="연도"
                          />
                          <span className="text-xs opacity-70">연도</span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <LinkIcon size={14} />
                          <input
                            type="text" value={icsUrl} onChange={(e) => setIcsUrl(e.target.value)}
                            className="flex-1 px-2 py-1 bg-white dark:bg-slate-800" style={{ border, borderRadius: radius }}
                            placeholder="ICS 주소를 입력하세요"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={importHolidaysFromUrl} disabled={loadingICS}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 flex items-center gap-2 disabled:opacity-60"
                            style={{ border, borderRadius: radius }}
                            title="ICS 주소에서 직접 불러오기"
                          >
                            <Globe size={14} /> {loadingICS ? "불러오는 중..." : "주소에서 불러오기"}
                          </button>

                          <button
                            onClick={() => refIcsFile.current?.click()}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 flex items-center gap-2"
                            style={{ border, borderRadius: radius }}
                            title=".ics 파일 업로드"
                          >
                            <FileUp size={14} /> ICS 파일 업로드
                          </button>
                        </div>

                        <div className="text-xs opacity-70 mt-2 leading-relaxed">
                          * 주소에서 불러오기가 CORS로 실패하면, 링크를 새 탭에서 열어 <b>.ics</b> 파일을 저장한 뒤 “ICS 파일 업로드”로 불러오세요.  
                          * ICS 휴일은 이름(SUMMARY)을 보존하며, 설정의 확장/대체 규칙에 사용됩니다.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 숨김용 파일 input 모음 */}
              <input ref={refGlobalBg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setGlobalBgImage)} className="hidden" />
              <input ref={refImportJson} type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} className="hidden" />
              <input ref={refIcsFile} type="file" accept=".ics,text/calendar" onChange={(e) => e.target.files?.[0] && importHolidaysFromFile(e.target.files[0])} className="hidden" />
            </div>
          )}
        </div>
      </div>

      {/* hidden inputs (상단 컨트롤용) */}
      <input ref={refHeaderImg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setHeaderImage)} className="hidden" />
      <input ref={refTimeCardImg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setTimeCardBgImg)} className="hidden" />
      <input ref={refTimeBoxImg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setTimeBoxImg)} className="hidden" />
      <input ref={refTimeDecorImg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setTimeDecorImg)} className="hidden" />
      <input ref={refTodoImg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setTodoBgImg)} className="hidden" />
      <input ref={refCalendarImg} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setCalendarBgImg)} className="hidden" />
    </div>
  );
};

export default CalendarPlanner;
