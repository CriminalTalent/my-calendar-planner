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

/* ---------------- 유틸 ---------------- */
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

const STORAGE_KEY = "MCP_v7";

/* -------- ICS 파서(SUMMARY 유지) -------- */
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

/* ---------------- 컴포넌트 ---------------- */
const CalendarPlanner: React.FC = () => {
  /* 핵심 상태 */
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, TEvent[]>>({});
  const [todos, setTodos] = useState<TTodo[]>([]);
  const [newEvent, setNewEvent] = useState("");
  const [newTodo, setNewTodo] = useState("");
  const [editingEvent, setEditingEvent] = useState<number | null>(null);

  /* 테마/전역 */
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [globalBg1, setGlobalBg1] = useState("#667eea");
  const [globalBg2, setGlobalBg2] = useState("#764ba2");
  const [globalBgImage, setGlobalBgImage] = useState("");
  const [containerOpacity, setContainerOpacity] = useState(0.92);
  const [radius, setRadius] = useState(8);
  const [fontScale, setFontScale] = useState(1);
  const [showBorders, setShowBorders] = useState(true);
  const [isDark, setIsDark] = useState(false);

  /* 헤더(제목만) */
  const [headerTitle, setHeaderTitle] = useState("나의 플래너");
  const [headerImage, setHeaderImage] = useState("");
  const [headerBg, setHeaderBg] = useState("#ffffff");
  const [headerText, setHeaderText] = useState("#1f2937");
  const [headerAlign, setHeaderAlign] =
    useState<"left" | "center" | "right">("left");
  const [editHeader, setEditHeader] = useState(false);
  const [showHeaderSettings, setShowHeaderSettings] = useState(false);

  /* 현재 시각 (표시만) */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const [timeCardBgColor, setTimeCardBgColor] = useState("#f3f4f6");
  const [timeCardBgImg, setTimeCardBgImg] = useState("");
  const [timeBoxColor, setTimeBoxColor] = useState("#3b82f6");
  const [timeBoxImg, setTimeBoxImg] = useState("");

  /* 꾸미기 이미지(현재 시각 카드 상단, 표시만) */
  const [timeDecorImg, setTimeDecorImg] = useState("");
  const [timeDecorRatio, setTimeDecorRatio] =
    useState<"3/1" | "21/9" | "16/9">("3/1");

  /* TODO 카드 */
  const [todoBgColor, setTodoBgColor] = useState("#f3f4f6");
  const [todoBgImg, setTodoBgImg] = useState("");

  /* 달력 */
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
  const [startOnMonday, setStartOnMonday] = useState<boolean>(false);

  /* 휴일/주말 */
  const [holidayText, setHolidayText] = useState<string>("");
  const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
  const [saturdayBlue, setSaturdayBlue] = useState<boolean>(true);
  const [expandLunarBlocks, setExpandLunarBlocks] = useState<boolean>(true);
  const [useAltHolidays, setUseAltHolidays] = useState<boolean>(true);

  /* ICS 자동 불러오기 */
  const [holidayYear, setHolidayYear] =
    useState<number>(new Date().getFullYear());
  const [icsUrl, setIcsUrl] = useState<string>(
    "https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics"
  );
  const [loadingICS, setLoadingICS] = useState(false);

  /* 하단 설정 패널 토글(클릭으로만 열림) */
  const [showSettings, setShowSettings] = useState(false);

  /* 다크모드 적용 */
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
      version: 7,
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
  const refImportJson = useRef<HTMLInputElement | null>(null);
  const refIcsFile = useRef<HTMLInputElement | null>(null);
  const refTimeDecorImg = useRef<HTMLInputElement | null>(null);
  const refTimeCardImg = useRef<HTMLInputElement | null>(null);
  const refTimeBoxImg = useRef<HTMLInputElement | null>(null);
  const refTodoImg = useRef<HTMLInputElement | null>(null);
  const refCalendarImg = useRef<HTMLInputElement | null>(null);

  /* 파일 로더 */
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
    if (!confirm("모든 데이터가 초기화됩니다. 계속하시겠습니까?")) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  /* ICS 가져오기 */
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
      alert("실패(CORS 등). 링크에서 .ics 저장 후 ‘ICS 파일 업로드’를 이용하세요.");
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

  /* 달력 날짜 */
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

  /* 휴일 계산 */
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
    // 설/추석 전·후 1일 확장
    if (expandLunarBlocks) {
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
  }, [baseHolidayMap, expandLunarBlocks, useAltHolidays]);

  const isSunday = (d: Date) => d.getDay() === 0;
  const isSaturday = (d: Date) => d.getDay() === 6;
  const isHoliday = (d: Date) => effectiveHolidaySet.has(keyOf(d)) || isSunday(d);

  /* 선택된 날짜 */
  const selectedKey = keyOf(selectedDate);
  const selectedList = events[selectedKey] || [];

  /* 일정/할일 CRUD */
  const addEvent = () => {
    if (!newEvent.trim()) return;
    const k = keyOf(selectedDate);
    setEvents((p) => ({
      ...p,
      [k]: [
        ...(p[k] || []),
        { id: Date.now(), text: newEvent.trim(), color: accentColor },
      ],
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

  /* 공통 스타일 */
  const border = showBorders
    ? `1px solid ${hexToRgba(accentColor, 0.6)}`
    : "1px solid transparent";
  const cardBg = (hex: string) => hexToRgba(hex, containerOpacity);

  /* 헤더 2.5배 */
  const headerCardStyle: React.CSSProperties = {
    border,
    borderRadius: radius,
    minHeight: 200,
    backgroundColor: headerImage ? undefined : cardBg(headerBg),
    backgroundImage: headerImage ? `url(${headerImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
  const timeCardStyle: React.CSSProperties = {
    border,
    borderRadius: radius,
    backgroundColor: timeCardBgImg ? undefined : cardBg(timeCardBgColor),
    backgroundImage: timeCardBgImg ? `url(${timeCardBgImg})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    minHeight: 170,
  };
  const todoCardStyle: React.CSSProperties = {
    border,
    borderRadius: radius,
    backgroundColor: todoBgImg ? undefined : cardBg(todoBgColor),
    backgroundImage: todoBgImg ? `url(${todoBgImg})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    minHeight: 260,
  };
  const calendarCardStyle: React.CSSProperties = {
    border,
    borderRadius: radius,
    backgroundColor: calendarBgImg ? undefined : cardBg(calendarBgColor),
    backgroundImage: calendarBgImg ? `url(${calendarBgImg})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  /* 렌더 */
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
        {/* ---------------- 헤더 ---------------- */}
        <div className="relative mb-3 sm:mb-4">
          <div className="relative overflow-hidden shadow-sm" style={headerCardStyle}>
            {headerImage && <div className="absolute inset-0 bg-black/15 dark:bg-black/30" />}
            <div className="relative z-10 px-3 py-4 sm:px-6 sm:py-6">
              <div
                className="w-full flex items-start justify-between gap-3"
                style={{ textAlign: headerAlign }}
              >
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
                  aria-label="다크 모드 전환"
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* 헤더 설정(클릭으로만 열림) */}
          <div className="absolute -top-2 -right-2 z-30">
            <button
              onClick={() => setShowHeaderSettings((v) => !v)}
              className="p-2 text-white shadow-sm hover:shadow transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                border,
                borderRadius: radius,
              }}
              aria-label="헤더 설정 열기"
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
                      onChange={(e) =>
                        e.target.files?.[0] && loadAsDataURL(e.target.files[0], setHeaderImage)
                      }
                      className="hidden"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setShowHeaderSettings(false)}
                  className="w-full px-2.5 py-2 bg-gray-100 hover:bg-gray-200"
                  style={{ border, borderRadius: radius }}
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---------------- 메인 그리드 ---------------- */}
        <div className="grid grid-cols-12 gap-3">
          {/* 좌측: 현재 시각 + 할 일 */}
          <div className="col-span-12 lg:col-span-4">
            {/* 현재 시각 카드 (표시만, 상단 꾸미기 상자 포함) */}
            <div className="relative overflow-hidden p-4 mb-3" style={timeCardStyle}>
              {timeCardBgImg && <div className="absolute inset-0 bg-black/25" />}
              <div className="relative z-10">
                <h3 className="font-semibold flex items-center gap-2 mb-3" style={{ fontSize: "1.2em" }}>
                  <Calendar size={20} /> 현재 시각
                </h3>

                {/* 꾸미기 상자 (이미지 표시만) */}
                <div
                  className="w-full overflow-hidden mb-3"
                  style={{
                    aspectRatio: timeDecorRatio,
                    border,
                    borderRadius: radius,
                    backgroundColor: "#ffffff",
                    backgroundImage: timeDecorImg ? `url(${timeDecorImg})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  aria-label="꾸미기 이미지 영역"
                />

                {/* 시간 박스 (HH:MM:SS만) */}
                <div
                  className="mx-auto flex items-center justify-center text-white font-mono font-bold"
                  style={{
                    minHeight: 70,
                    padding: "14px 16px",
                    letterSpacing: 1,
                    border,
                    borderRadius: radius,
                    backgroundColor: timeBoxImg ? undefined : timeBoxColor,
                    backgroundImage: timeBoxImg ? `url(${timeBoxImg})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    width: "100%",
                    fontSize: "2.2em",
                  }}
                  aria-label="현재 시각"
                >
                  {pad2(now.getHours())}:{pad2(now.getMinutes())}:{pad2(now.getSeconds())}
                </div>
              </div>
            </div>

            {/* 할 일 */}
            <div className="relative overflow-hidden p-4" style={todoCardStyle}>
              {todoBgImg && <div className="absolute inset-0 bg-black/25" />}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2" style={{ fontSize: "1.2em" }}>
                    <CheckSquare size={20} /> 할 일
                  </h3>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTodo()}
                    placeholder="새 할 일을 입력하세요"
                    className="flex-1 px-3 py-2 bg-white/95 dark:bg-slate-800"
                    style={{ border, borderRadius: radius }}
                  />
                  <button
                    onClick={addTodo}
                    className="px-3 py-2 text-white hover:opacity-90"
                    style={{ backgroundColor: accentColor, border, borderRadius: radius }}
                    aria-label="할 일 추가"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {todos.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-2 bg-white/95 dark:bg-slate-800"
                      style={{ border, borderRadius: radius }}
                    >
                      <button
                        onClick={() => toggleTodo(t.id)}
                        className="w-6 h-6 flex items-center justify-center"
                        style={{
                          border,
                          borderRadius: radius,
                          backgroundColor: t.completed ? t.color : "transparent",
                          color: t.completed ? "#fff" : "inherit",
                        }}
                      >
                        {t.completed && <CheckSquare size={14} />}
                      </button>
                      <span className={`flex-1 text-sm ${t.completed ? "line-through opacity-70" : ""}`}>
                        {t.text}
                      </span>
                      <button
                        onClick={() => delTodo(t.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        style={{ border, borderRadius: radius }}
                        aria-label="할 일 삭제"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {!todos.length && (
                    <div className="text-center py-8 opacity-70 text-sm">할 일을 추가해보세요!</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 달력 */}
          <div className="col-span-12 lg:col-span-8">
            <div className="p-3 sm:p-4" style={calendarCardStyle}>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold flex items-center gap-2" style={{ fontSize: "1.3em" }}>
                  <Calendar size={18} />
                  {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentDate((d) => addMonths(d, -1))}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                    style={{ border, borderRadius: radius }}
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                    style={{ border, borderRadius: radius }}
                  >
                    오늘
                  </button>
                  <button
                    onClick={() => setCurrentDate((d) => addMonths(d, +1))}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                    style={{ border, borderRadius: radius }}
                  >
                    다음
                  </button>
                </div>
              </div>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 mb-2" style={{ gap: calendarGap }}>
                {weekdayNames.map((d) => (
                  <div
                    key={d}
                    className="text-center py-1.5 font-medium bg-gray-50 dark:bg-slate-800"
                    style={{ border, borderRadius: radius, fontSize: `${weekdaySize}em` }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="grid grid-cols-7 mb-3" style={{ gap: calendarGap }}>
                {days.map((day) => {
                  const k = keyOf(day);
                  const list = events[k] || [];
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  const isCurMonth = day.getMonth() === currentDate.getMonth();

                  const baseBg = isCurMonth ? "rgba(255,255,255,0.8)" : "rgba(245,245,245,0.7)";
                  const numberColor =
                    isHoliday(day)
                      ? "#dc2626"
                      : isSaturday(day) && saturdayBlue
                      ? "#2563eb"
                      : isToday && highlightToday
                      ? accentColor
                      : "inherit";

                  return (
                    <button
                      key={k}
                      onClick={() => setSelectedDate(new Date(day))}
                      className="text-left transition-all relative"
                      style={{
                        minHeight: cellHeight,
                        padding: 8,
                        border,
                        borderRadius: radius,
                        background: highlightToday && isToday ? hexToRgba(accentColor, 0.12) : baseBg,
                        boxShadow: isSelected ? `0 0 0 2px ${accentColor} inset` : "none",
                        opacity: isCurMonth ? 1 : 0.7,
                      }}
                    >
                      <div
                        className="font-medium mb-1"
                        style={{ color: numberColor, fontSize: `${dateNumSize}em` }}
                      >
                        {day.getDate()}
                      </div>

                      <div className="space-y-0.5">
                        {list.slice(0, maxEventsPerCell).map((ev) => {
                          if (badgeStyle === "dot") {
                            return (
                              <div
                                key={ev.id}
                                className="flex items-center gap-1 truncate"
                                style={{ fontSize: `${eventTextSize}em` }}
                                title={ev.text}
                              >
                                <span
                                  className="inline-block w-2 h-2 rounded-full"
                                  style={{ backgroundColor: ev.color }}
                                />
                                <span className="truncate">{ev.text}</span>
                              </div>
                            );
                          }
                          if (badgeStyle === "pill") {
                            return (
                              <div
                                key={ev.id}
                                className="truncate px-1 py-[2px] text-white"
                                style={{
                                  backgroundColor: ev.color,
                                  borderRadius: Math.max(6, radius),
                                  fontSize: `${eventTextSize}em`,
                                }}
                                title={ev.text}
                              >
                                {ev.text}
                              </div>
                            );
                          }
                          // strip
                          return (
                            <div
                              key={ev.id}
                              className="truncate px-1 py-[2px] bg-white"
                              style={{
                                borderLeft: `4px solid ${ev.color}`,
                                border: showBorders
                                  ? `1px solid ${hexToRgba(accentColor, 0.4)}`
                                  : "1px solid transparent",
                                borderRadius: radius,
                                fontSize: `${eventTextSize}em`,
                              }}
                              title={ev.text}
                            >
                              {ev.text}
                            </div>
                          );
                        })}
                        {list.length > maxEventsPerCell && (
                          <div className="opacity-70" style={{ fontSize: `${eventTextSize}em` }}>
                            +{list.length - maxEventsPerCell}
                          </div>
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 선택 날짜 편집 */}
              <div style={{ borderTop: border }} className="pt-3">
                <h3 className="font-semibold mb-2" style={{ fontSize: "1.15em" }}>
                  {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 일정
                </h3>

                <div className="flex gap-2 mb-2.5">
                  <input
                    type="text"
                    value={newEvent}
                    onChange={(e) => setNewEvent(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEvent()}
                    placeholder="새 일정을 입력하세요"
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800"
                    style={{ border, borderRadius: radius }}
                  />
                  <button
                    onClick={addEvent}
                    className="px-3 py-2 text-white hover:opacity-90"
                    style={{ backgroundColor: accentColor, border, borderRadius: radius }}
                  >
                    추가
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedList.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800"
                      style={{ border, borderRadius: radius }}
                    >
                      {editingEvent === ev.id ? (
                        <input
                          type="text"
                          defaultValue={ev.text}
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            editEventText(selectedKey, ev.id, (e.target as HTMLInputElement).value)
                          }
                          onBlur={(e) =>
                            editEventText(selectedKey, ev.id, (e.target as HTMLInputElement).value)
                          }
                          className="flex-1 px-2 py-1 bg-white dark:bg-slate-700"
                          style={{ border, borderRadius: radius }}
                          autoFocus
                        />
                      ) : (
                        <div
                          className="flex-1 px-2 py-1 text-white"
                          style={{ backgroundColor: ev.color, border, borderRadius: radius }}
                        >
                          {ev.text}
                        </div>
                      )}
                      <button
                        onClick={() =>
                          setEditingEvent(editingEvent === ev.id ? null : ev.id)
                        }
                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700"
                        style={{ border, borderRadius: radius }}
                        aria-label="일정 편집"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => delEvent(selectedKey, ev.id)}
                        className="p-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                        style={{ border, borderRadius: radius }}
                        aria-label="일정 삭제"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {!selectedList.length && (
                    <p className="text-center opacity-70 py-5 text-sm">일정이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 하단 설정(클릭으로만 열림, 컴팩트) ---------------- */}
        <div className="mt-4">
          <button
            onClick={() => setShowSettings((s) => !s)}
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
              style={{
                border,
                borderRadius: radius,
                backgroundColor: hexToRgba("#ffffff", containerOpacity),
              }}
            >
              {/* 빠른 동작 */}
              <div className="grid gap-2 md:grid-cols-4 mb-3">
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem(
                        STORAGE_KEY,
                        localStorage.getItem(STORAGE_KEY) ?? "{}"
                      );
                      alert("현재 상태를 저장했습니다.");
                    } catch {}
                  }}
                  className="px-2 py-2 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2"
                  style={{ border, borderRadius: radius }}
                >
                  <SaveIcon size={16} /> 저장
                </button>
                <button
                  onClick={exportJSON}
                  className="px-2 py-2 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2"
                  style={{ border, borderRadius: radius }}
                >
                  <Download size={16} /> 내보내기
                </button>
                <button
                  onClick={() => refImportJson.current?.click()}
                  className="px-2 py-2 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2"
                  style={{ border, borderRadius: radius }}
                >
                  <FileUp size={16} /> 가져오기
                </button>
                <button
                  onClick={resetAll}
                  className="px-2 py-2 bg-red-50 hover:bg-red-100 text-red-700 flex items-center justify-center gap-2"
                  style={{ border, borderRadius: radius }}
                >
                  <RotateCcw size={16} /> 초기화
                </button>
              </div>

              {/* 1) 전체 테마 (컴팩트) */}
              <div className="grid gap-2 md:grid-cols-2 mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <Palette size={14} />
                    <span className="text-sm">테마색</span>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">투명도</span>
                    <input
                      type="range"
                      min={0.5}
                      max={1}
                      step={0.01}
                      value={containerOpacity}
                      onChange={(e) => setContainerOpacity(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-10 text-right">
                      {Math.round(containerOpacity * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">라운드</span>
                    <input
                      type="range"
                      min={0}
                      max={24}
                      step={1}
                      value={radius}
                      onChange={(e) => setRadius(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-10 text-right">{radius}px</span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">글자 크기</span>
                    <input
                      type="range"
                      min={0.9}
                      max={1.3}
                      step={0.01}
                      value={fontScale}
                      onChange={(e) => setFontScale(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-10 text-right">
                      {Math.round(fontScale * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">보더</span>
                    <input
                      type="checkbox"
                      checked={showBorders}
                      onChange={(e) => setShowBorders(e.target.checked)}
                      className="ml-auto w-4 h-4"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">배경 그라데이션 1</span>
                    <input
                      type="color"
                      value={globalBg1}
                      onChange={(e) => setGlobalBg1(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">배경 그라데이션 2</span>
                    <input
                      type="color"
                      value={globalBg2}
                      onChange={(e) => setGlobalBg2(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <button
                      onClick={() => refGlobalBg.current?.click()}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200"
                      style={{ border, borderRadius: radius }}
                    >
                      <Upload size={12} className="inline mr-1" />
                      전체 배경 이미지
                    </button>
                    {globalBgImage && (
                      <button
                        onClick={() => setGlobalBgImage("")}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 ml-2"
                        style={{ border, borderRadius: radius }}
                      >
                        제거
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 2) 현재 시각/꾸미기(컴팩트) */}
              <div className="grid gap-2 md:grid-cols-2 mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">꾸미기 이미지</span>
                    <button
                      onClick={() => refTimeDecorImg.current?.click()}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 ml-auto"
                      style={{ border, borderRadius: radius }}
                    >
                      <ImageIcon size={12} className="inline mr-1" />
                      업로드
                    </button>
                    {timeDecorImg && (
                      <button
                        onClick={() => setTimeDecorImg("")}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700"
                        style={{ border, borderRadius: radius }}
                      >
                        제거
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">꾸미기 비율</span>
                    <select
                      value={timeDecorRatio}
                      onChange={(e) => setTimeDecorRatio(e.target.value as any)}
                      className="px-2 py-1 bg-white dark:bg-slate-800"
                      style={{ border, borderRadius: radius }}
                    >
                      <option value="3/1">3:1</option>
                      <option value="21/9">21:9</option>
                      <option value="16/9">16:9</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">카드 배경색</span>
                    <input
                      type="color"
                      value={timeCardBgColor}
                      onChange={(e) => setTimeCardBgColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                    <button
                      onClick={() => refTimeCardImg.current?.click()}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200"
                      style={{ border, borderRadius: radius }}
                    >
                      <Upload size={12} /> 이미지
                    </button>
                    {timeCardBgImg && (
                      <button
                        onClick={() => setTimeCardBgImg("")}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700"
                        style={{ border, borderRadius: radius }}
                      >
                        제거
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">시간 박스 색상</span>
                    <input
                      type="color"
                      value={timeBoxColor}
                      onChange={(e) => setTimeBoxColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer ml-auto"
                    />
                    <button
                      onClick={() => refTimeBoxImg.current?.click()}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200"
                      style={{ border, borderRadius: radius }}
                    >
                      <Upload size={12} /> 이미지
                    </button>
                    {timeBoxImg && (
                      <button
                        onClick={() => setTimeBoxImg("")}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700"
                        style={{ border, borderRadius: radius }}
                      >
                        제거
                      </button>
                    )}
                  </div>
                </div>

                {/* 3) 달력/주간/이벤트 크기 */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">칸 높이</span>
                    <input
                      type="range"
                      min={64}
                      max={140}
                      step={2}
                      value={cellHeight}
                      onChange={(e) => setCellHeight(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-12 text-right">{cellHeight}px</span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">칸 간격</span>
                    <input
                      type="range"
                      min={2}
                      max={14}
                      step={1}
                      value={calendarGap}
                      onChange={(e) => setCalendarGap(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-12 text-right">{calendarGap}px</span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">요일 크기</span>
                    <input
                      type="range"
                      min={0.8}
                      max={1.3}
                      step={0.01}
                      value={weekdaySize}
                      onChange={(e) => setWeekdaySize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-12 text-right">
                      {Math.round(weekdaySize * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">날짜 크기</span>
                    <input
                      type="range"
                      min={0.8}
                      max={1.4}
                      step={0.01}
                      value={dateNumSize}
                      onChange={(e) => setDateNumSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-12 text-right">
                      {Math.round(dateNumSize * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">이벤트 글자</span>
                    <input
                      type="range"
                      min={0.8}
                      max={1.2}
                      step={0.01}
                      value={eventTextSize}
                      onChange={(e) => setEventTextSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-12 text-right">
                      {Math.round(eventTextSize * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">칸당 이벤트</span>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      step={1}
                      value={maxEventsPerCell}
                      onChange={(e) => setMaxEventsPerCell(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-12 text-right">
                      {maxEventsPerCell}개
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">주 시작 요일</span>
                    <label className="text-xs ml-auto flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={startOnMonday}
                        onChange={(e) => setStartOnMonday(e.target.checked)}
                      />
                      월요일 시작
                    </label>
                  </div>
                </div>
              </div>

              {/* 4) 휴일/주말/자동 불러오기 (컴팩트) */}
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">휴일 목록 (YYYY-MM-DD)</span>
                  </div>
                  <div className="col-span-2">
                    <textarea
                      value={holidayText}
                      onChange={(e) => setHolidayText(e.target.value)}
                      placeholder="예) 2025-01-01, 2025-03-01"
                      className="w-full p-2 bg-white dark:bg-slate-800"
                      rows={3}
                      style={{ border, borderRadius: radius }}
                    />
                  </div>

                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">토요일 파란색</span>
                    <input
                      type="checkbox"
                      checked={saturdayBlue}
                      onChange={(e) => setSaturdayBlue(e.target.checked)}
                      className="ml-auto w-4 h-4"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">대체공휴일</span>
                    <input
                      type="checkbox"
                      checked={useAltHolidays}
                      onChange={(e) => setUseAltHolidays(e.target.checked)}
                      className="ml-auto w-4 h-4"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">설/추석 전·후 1일 포함</span>
                    <input
                      type="checkbox"
                      checked={expandLunarBlocks}
                      onChange={(e) => setExpandLunarBlocks(e.target.checked)}
                      className="ml-auto w-4 h-4"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">대한민국 공휴일 불러오기</span>
                  </div>

                  <div className="flex items-center gap-2 p-2" style={{ border, borderRadius: radius }}>
                    <span className="text-sm">연도</span>
                    <input
                      type="number"
                      min={1900}
                      max={2100}
                      value={holidayYear}
                      onChange={(e) => setHolidayYear(Number(e.target.value))}
                      className="w-28 px-2 py-1 bg-white dark:bg-slate-800 ml-auto"
                      style={{ border, borderRadius: radius }}
                    />
                  </div>

                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <LinkIcon size={14} />
                    <input
                      type="text"
                      value={icsUrl}
                      onChange={(e) => setIcsUrl(e.target.value)}
                      className="flex-1 px-2 py-1 bg-white dark:bg-slate-800"
                      style={{ border, borderRadius: radius }}
                      placeholder="ICS 주소"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-2 col-span-2" style={{ border, borderRadius: radius }}>
                    <button
                      onClick={importHolidaysFromUrl}
                      disabled={loadingICS}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 flex items-center gap-2 disabled:opacity-60"
                      style={{ border, borderRadius: radius }}
                      title="주소에서 불러오기"
                    >
                      <Globe size={14} /> {loadingICS ? "불러오는 중..." : "주소에서 불러오기"}
                    </button>
                    <button
                      onClick={() => refIcsFile.current?.click()}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 flex items-center gap-2 ml-2"
                      style={{ border, borderRadius: radius }}
                      title="ICS 파일 업로드"
                    >
                      <FileUp size={14} /> 파일 업로드
                    </button>
                  </div>
                </div>
              </div>

              {/* 숨김 input들 */}
              <input
                ref={refGlobalBg}
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] && loadAsDataURL(e.target.files[0], setGlobalBgImage)
                }
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
                onChange={(e) => e.target.files?.[0] && importHolidaysFromFile(e.target.files[0])}
                className="hidden"
              />
              <input
                ref={refTimeDecorImg}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setTimeDecorImg)}
                className="hidden"
              />
              <input
                ref={refTimeCardImg}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setTimeCardBgImg)}
                className="hidden"
              />
              <input
                ref={refTimeBoxImg}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setTimeBoxImg)}
                className="hidden"
              />
              <input
                ref={refTodoImg}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setTodoBgImg)}
                className="hidden"
              />
              <input
                ref={refCalendarImg}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && loadAsDataURL(e.target.files[0], setCalendarBgImg)}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPlanner;
