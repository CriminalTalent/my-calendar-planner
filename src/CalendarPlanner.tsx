// src/CalendarPlanner.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, CheckSquare, Plus, X, Edit3,
  Upload, Palette, Settings, AlignLeft, AlignCenter, AlignRight, Moon, Sun
} from 'lucide-react';

/* ---------- helpers ---------- */
const pad2 = (n: number) => String(n).padStart(2, '0');
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addMonthsSafe = (d: Date, delta: number) => new Date(d.getFullYear(), d.getMonth() + delta, 1);
const hexToRgba = (hex: string, alpha: number) => {
  const s = hex.replace('#', '');
  const bigint = parseInt(s.length === 3 ? s.split('').map(c => c + c).join('') : s, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type TEvent = { id: number; text: string; color: string };

const CalendarPlanner = () => {
  // 캘린더/이벤트/투두
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, TEvent[]>>({});
  const [todos, setTodos] = useState<{ id: number; text: string; completed: boolean; color: string }[]>([]);
  const [newEvent, setNewEvent] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [editingEvent, setEditingEvent] = useState<number | null>(null);

  // 테마/스타일
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [containerOpacity, setContainerOpacity] = useState(0.92); // 컨테이너 투명도(0.5~1.0)
  const [isDark, setIsDark] = useState(false);

  // 헤더
  const [headerTitle, setHeaderTitle] = useState('나의 플래너');
  const [headerImage, setHeaderImage] = useState('');
  const [headerBgColor, setHeaderBgColor] = useState('#ffffff');
  const [headerTextColor, setHeaderTextColor] = useState('#1f2937');
  const [headerTextAlign, setHeaderTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [showHeaderSettings, setShowHeaderSettings] = useState(false);
  const [headerTimeColor, setHeaderTimeColor] = useState('#1f2937');

  // 왼쪽 패널(시간/투두) 배경
  const [timeBgImage, setTimeBgImage] = useState('');
  const [timeBgColor, setTimeBgColor] = useState('#f3f4f6');
  const [todoBgImage, setTodoBgImage] = useState('');
  const [todoBgColor, setTodoBgColor] = useState('#f3f4f6');

  // 현재 시각(실시간)
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // 다크 모드 토글
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // 파일 인풋 ref
  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const headerImageInputRef = useRef<HTMLInputElement | null>(null);
  const timeImageInputRef = useRef<HTMLInputElement | null>(null);
  const todoImageInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------- 캘린더 ---------- */
  const getCalendarDays = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay());
    const days: Date[] = [];
    const end = new Date(start);
    end.setDate(end.getDate() + 41);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    return days;
  };

  const calendarDays = getCalendarDays();
  const selectedDateKey = toDateKey(selectedDate);
  const selectedEvents = events[selectedDateKey] || [];

  /* ---------- 이벤트/투두 ---------- */
  const addEvent = () => {
    if (!newEvent.trim()) return;
    const k = toDateKey(selectedDate);
    setEvents(prev => ({ ...prev, [k]: [...(prev[k] || []), { id: Date.now(), text: newEvent.trim(), color: accentColor }] }));
    setNewEvent('');
  };
  const deleteEvent = (key: string, id: number) => {
    setEvents(prev => {
      const next = { ...prev };
      next[key] = (prev[key] || []).filter(e => e.id !== id);
      if ((next[key] || []).length === 0) delete next[key];
      return next;
    });
  };
  const editEvent = (key: string, id: number, text: string) => {
    setEvents(prev => ({ ...prev, [key]: (prev[key] || []).map(e => (e.id === id ? { ...e, text } : e)) }));
    setEditingEvent(null);
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos(prev => [...prev, { id: Date.now(), text: newTodo.trim(), completed: false, color: accentColor }]);
    setNewTodo('');
  };
  const toggleTodo = (id: number) => setTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const deleteTodo = (id: number) => setTodos(prev => prev.filter(t => t.id !== id));

  /* ---------- 업로드 핸들러 ---------- */
  const loadAsDataURL = (file: File, setter: (v: string) => void) => {
    const r = new FileReader();
    r.onload = e => setter(String(e.target?.result || ''));
    r.readAsDataURL(file);
  };
  const onBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadAsDataURL(f, setBackgroundImage);
  };
  const onHeaderImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadAsDataURL(f, setHeaderImage);
  };
  const onTimeImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadAsDataURL(f, setTimeBgImage);
  };
  const onTodoImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadAsDataURL(f, setTodoBgImage);
  };

  /* ---------- UI ---------- */
  const cardOverlay = isDark ? hexToRgba('#0f172a', containerOpacity) : hexToRgba('#ffffff', containerOpacity);

  return (
    <div
      className="min-h-screen p-3 sm:p-4 dark:bg-slate-900"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* 헤더 (각진/컴팩트) */}
        <div className="relative mb-3 sm:mb-4">
          <div
            className="shadow-sm overflow-hidden relative border border-gray-200 dark:border-slate-700"
            style={{
              backgroundColor: headerImage ? undefined : hexToRgba(headerBgColor, containerOpacity),
              backgroundImage: headerImage ? `url(${headerImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: '108px'
            }}
          >
            {headerImage && <div className="absolute inset-0 bg-black/15 dark:bg-black/30" />}
            <div className="relative z-10 px-3 py-3 sm:px-4 sm:py-4">
              <div className="w-full flex items-start justify-between gap-3" style={{ textAlign: headerTextAlign }}>
                <div className="flex-1">
                  {isEditingHeader ? (
                    <input
                      type="text"
                      value={headerTitle}
                      onChange={e => setHeaderTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && setIsEditingHeader(false)}
                      onBlur={() => setIsEditingHeader(false)}
                      className="text-xl sm:text-2xl font-semibold bg-transparent border-2 border-dashed border-white/50 px-2 py-1 placeholder-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full"
                      style={{ color: headerTextColor }}
                      autoFocus
                    />
                  ) : (
                    <h1
                      className="text-xl sm:text-2xl font-semibold cursor-pointer hover:opacity-80 transition-opacity leading-tight"
                      style={{ color: headerTextColor }}
                      onClick={() => setIsEditingHeader(true)}
                    >
                      {headerTitle}
                    </h1>
                  )}
                  <p className="text-xs sm:text-sm mt-1 opacity-90 leading-tight" style={{ color: headerTextColor }}>
                    {now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                  </p>
                  {/* 요구사항: 년/월/일 아래 줄에 시:분:초 */}
                  <p className="text-[11px] sm:text-xs mt-0.5 opacity-90 leading-tight" style={{ color: headerTimeColor }}>
                    {now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  </p>
                </div>

                {/* 다크모드 토글 */}
                <button
                  onClick={() => setIsDark(v => !v)}
                  className="px-2.5 py-2 border bg-white/90 dark:bg-slate-800 dark:text-gray-100 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="다크 모드 토글"
                  title="다크 모드 토글"
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* 헤더 설정 버튼 */}
          <div className="absolute -top-2 -right-2 z-30">
            <button
              onClick={() => setShowHeaderSettings(v => !v)}
              className="p-2 sm:p-2.5 bg-white shadow-sm hover:shadow border border-white transition-transform hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
              aria-label="헤더 설정"
            >
              <Settings size={16} className="text-white" />
            </button>

            {showHeaderSettings && (
              <div className="absolute right-0 top-full mt-3 bg-white/98 dark:bg-slate-800 dark:text-gray-100 backdrop-blur-md shadow-2xl p-3 min-w-[240px] sm:min-w-[260px] z-40 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <Settings size={14} />
                  <h3 className="text-xs sm:text-sm font-semibold">헤더 설정</h3>
                </div>

                {/* 정렬 */}
                <div className="mb-3">
                  <label className="block text-[11px] sm:text-xs font-medium mb-2">글자 정렬</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { value: 'left', icon: AlignLeft },
                      { value: 'center', icon: AlignCenter },
                      { value: 'right', icon: AlignRight }
                    ].map(({ value, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setHeaderTextAlign(value as 'left' | 'center' | 'right')}
                        className={`flex items-center justify-center p-2 border ${
                          headerTextAlign === value
                            ? 'text-white'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-200'
                        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
                        style={{ backgroundColor: headerTextAlign === value ? accentColor : undefined }}
                      >
                        <Icon size={14} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 색상 */}
                <div className="mb-3">
                  <label className="block text-[11px] sm:text-xs font-medium mb-2">색상</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 border dark:bg-slate-700">
                      <span className="text-[11px] text-gray-500 dark:text-gray-300">제목/날짜 글자</span>
                      <input
                        type="color"
                        value={headerTextColor}
                        onChange={e => setHeaderTextColor(e.target.value)}
                        className="w-7 h-7 cursor-pointer border"
                      />
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 border dark:bg-slate-700">
                      <span className="text-[11px] text-gray-500 dark:text-gray-300">배경</span>
                      <input
                        type="color"
                        value={headerBgColor}
                        onChange={e => setHeaderBgColor(e.target.value)}
                        className="w-7 h-7 cursor-pointer border"
                      />
                    </div>
                  </div>
                </div>

                {/* 시간 글자색 */}
                <div className="mb-3">
                  <label className="block text-[11px] sm:text-xs font-medium mb-2">시간 글자색</label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 border dark:bg-slate-700">
                    <input
                      type="color"
                      value={headerTimeColor}
                      onChange={e => setHeaderTimeColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer border"
                    />
                    <span className="text-[11px] text-gray-500 dark:text-gray-300 truncate">{headerTimeColor}</span>
                  </div>
                </div>

                {/* 배경 이미지 */}
                <div className="mb-3">
                  <label className="block text-[11px] sm:text-xs font-medium mb-2">배경 이미지</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => headerImageInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border text-xs"
                    >
                      <Upload size={12} /> 업로드
                    </button>
                    {headerImage && (
                      <button
                        onClick={() => setHeaderImage('')}
                        className="px-2 py-2 bg-red-50 hover:bg-red-100 text-red-600 border text-xs"
                      >
                        <X size={12} />
                      </button>
                    )}
                    <input ref={headerImageInputRef} type="file" accept="image/*" onChange={onHeaderImgUpload} className="hidden" />
                  </div>
                </div>

                <button
                  onClick={() => setShowHeaderSettings(false)}
                  className="w-full px-2.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-100 border text-xs"
                >
                  완료
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 레이아웃: 모바일 1열, lg부터 2열 */}
        <div className="grid grid-cols-12 gap-3">
          {/* 왼쪽: 현재시간 + 투두 + (요청) 전체 설정(축소판) */}
          <div className="col-span-12 lg:col-span-4">
            {/* 현재 시간 카드 (예전 타이머 위치 대체) */}
            <div
              className="relative overflow-hidden border border-gray-200 dark:border-slate-700 p-4 mb-3"
              style={{
                backgroundColor: timeBgImage ? undefined : hexToRgba(timeBgColor, containerOpacity),
                backgroundImage: timeBgImage ? `url(${timeBgImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: '120px'
              }}
            >
              {timeBgImage && <div className="absolute inset-0 bg-black/25" />}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {/* 달력 아이콘 재사용 */}
                    <Calendar size={20} />
                    현재 시각
                  </h3>
                  <div className="flex items-center gap-2 bg-white/85 dark:bg-slate-800 backdrop-blur-sm border p-1.5">
                    <span className="text-[11px] text-gray-600 dark:text-gray-300">꾸밈</span>
                    <input
                      type="color"
                      value={timeBgColor}
                      onChange={e => setTimeBgColor(e.target.value)}
                      className="w-6 h-6 cursor-pointer border"
                      title="배경색"
                    />
                    <button
                      onClick={() => timeImageInputRef.current?.click()}
                      className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border"
                      title="이미지 추가"
                    >
                      <Upload size={12} />
                    </button>
                    <input ref={timeImageInputRef} type="file" accept="image/*" onChange={onTimeImgUpload} className="hidden" />
                    {timeBgImage && (
                      <button
                        onClick={() => setTimeBgImage('')}
                        className="p-1 bg-red-50 hover:bg-red-100 text-red-700 border"
                        title="이미지 제거"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 년/월/일 + (아랫줄) 시:분:초 */}
                <div className="text-center">
                  <div
                    className="text-lg sm:text-xl font-semibold mb-2 px-3 py-2 inline-block"
                    style={{ color: headerTextColor, backgroundColor: hexToRgba('#ffffff', 0.0) }}
                  >
                    {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일
                  </div>
                  <div
                    className="text-4xl sm:text-5xl font-mono font-bold px-4 py-4 inline-block text-white"
                    style={{ backgroundColor: accentColor, minWidth: '70%', letterSpacing: '1px' }}
                  >
                    {pad2(now.getHours())}:{pad2(now.getMinutes())}:{pad2(now.getSeconds())}
                  </div>
                </div>
              </div>
            </div>

            {/* 투두 */}
            <div
              className="relative overflow-hidden border border-gray-200 dark:border-slate-700 p-4"
              style={{
                backgroundColor: todoBgImage ? undefined : hexToRgba(todoBgColor, containerOpacity),
                backgroundImage: todoBgImage ? `url(${todoBgImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: '280px'
              }}
            >
              {todoBgImage && <div className="absolute inset-0 bg-black/25" />}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckSquare size={20} />
                    할 일 리스트
                  </h3>
                  <div className="flex items-center gap-2 bg-white/85 dark:bg-slate-800 backdrop-blur-sm border p-1.5">
                    <span className="text-[11px] text-gray-600 dark:text-gray-300">꾸밈</span>
                    <input
                      type="color"
                      value={todoBgColor}
                      onChange={e => setTodoBgColor(e.target.value)}
                      className="w-6 h-6 cursor-pointer border"
                      title="배경색"
                    />
                    <button
                      onClick={() => todoImageInputRef.current?.click()}
                      className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border"
                      title="이미지 추가"
                    >
                      <Upload size={12} />
                    </button>
                    <input ref={todoImageInputRef} type="file" accept="image/*" onChange={onTodoImgUpload} className="hidden" />
                    {todoBgImage && (
                      <button
                        onClick={() => setTodoBgImage('')}
                        className="p-1 bg-red-50 hover:bg-red-100 text-red-700 border"
                        title="이미지 제거"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTodo}
                    onChange={e => setNewTodo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTodo()}
                    placeholder="새 할 일을 입력하세요..."
                    className="flex-1 px-3 py-2 border bg-white/95 dark:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  <button
                    onClick={addTodo}
                    className="px-3 py-2 text-white hover:opacity-90 transition-opacity border"
                    style={{ backgroundColor: accentColor }}
                    aria-label="할 일 추가"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {todos.map(todo => (
                    <div key={todo.id} className="flex items-center gap-3 p-2 bg-white/95 dark:bg-slate-800 border">
                      <button
                        onClick={() => toggleTodo(todo.id)}
                        className={`w-6 h-6 border flex items-center justify-center ${todo.completed ? 'text-white' : 'bg-white dark:bg-slate-700'}`}
                        style={{ backgroundColor: todo.completed ? todo.color : undefined }}
                        aria-label="완료 토글"
                      >
                        {todo.completed && <CheckSquare size={14} />}
                      </button>
                      <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                        {todo.text}
                      </span>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border"
                        aria-label="삭제"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {todos.length === 0 && (
                    <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-300">할 일을 추가해보세요!</div>
                  )}
                </div>
              </div>
            </div>

            {/* (요청) 전체 설정 — 투두 아래로 이동, 축소판 */}
            <div className="mt-3 border border-gray-200 dark:border-slate-700 p-3" style={{ backgroundColor: cardOverlay }}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-semibold">전체 설정</h3>
                <button
                  onClick={() => bgInputRef.current?.click()}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border text-xs"
                >
                  <Upload size={12} className="inline mr-1" />
                  전체 배경
                </button>
                <input ref={bgInputRef} type="file" accept="image/*" onChange={onBgUpload} className="hidden" />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-white/70 dark:bg-slate-800/70 border">
                  <Palette size={14} />
                  <span className="text-[11px]">테마</span>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="w-6 h-6 cursor-pointer border ml-auto"
                  />
                </div>

                <div className="flex items-center gap-2 p-2 bg-white/70 dark:bg-slate-800/70 border">
                  <span className="text-[11px]">컨테이너 투명도</span>
                  <input
                    type="range"
                    min={0.5}
                    max={1}
                    step={0.01}
                    value={containerOpacity}
                    onChange={e => setContainerOpacity(Number(e.target.value))}
                    className="flex-1"
                    title={`${Math.round(containerOpacity * 100)}%`}
                  />
                  <span className="text-[11px] w-10 text-right">{Math.round(containerOpacity * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 캘린더 */}
          <div className="col-span-12 lg:col-span-8">
            <div className="p-3 sm:p-4 border border-gray-200 dark:border-slate-700" style={{ backgroundColor: cardOverlay }}>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Calendar size={18} />
                  {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentDate(d => addMonthsSafe(d, -1))}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border text-sm"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border text-xs"
                  >
                    오늘
                  </button>
                  <button
                    onClick={() => setCurrentDate(d => addMonthsSafe(d, +1))}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border text-sm"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* (요청) 각 날짜에 일정 표시 강화: 색 점 + 텍스트 최대 3줄 */}
              <div className="grid grid-cols-7 gap-1.5 mb-3">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="text-center py-1.5 font-medium text-gray-600 dark:text-gray-200 text-xs sm:text-sm border bg-gray-50 dark:bg-slate-800">
                    {day}
                  </div>
                ))}

                {calendarDays.map(day => {
                  const dateKey = toDateKey(day);
                  const dayEvents = events[dateKey] || [];
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(new Date(day))}
                      className={`p-2 min-h-[86px] text-left transition-all relative border ${
                        isToday ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-800'
                      } ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-500' : ''}`}
                      style={{ boxShadow: isSelected ? `0 0 0 2px ${accentColor} inset` : 'none' }}
                    >
                      <div className={`font-medium text-xs sm:text-sm mb-1 ${isToday ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(ev => (
                          <div key={ev.id} className="flex items-center gap-1 text-[11px] sm:text-xs truncate" title={ev.text}>
                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: ev.color }} />
                            <span className="truncate">{ev.text}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-300">+{dayEvents.length - 3}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 선택 날짜 일정 편집 */}
              <div className="border-t pt-3 dark:border-slate-700">
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 일정
                </h3>

                <div className="flex gap-2 mb-2.5">
                  <input
                    type="text"
                    value={newEvent}
                    onChange={e => setNewEvent(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addEvent()}
                    placeholder="새 일정 추가..."
                    className="flex-1 px-3 py-2 border bg-white dark:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  <button
                    onClick={addEvent}
                    className="px-3 py-2 text-white hover:opacity-90 transition-opacity border"
                    style={{ backgroundColor: accentColor }}
                    aria-label="일정 추가"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedEvents.map(ev => (
                    <div key={ev.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800 border">
                      {editingEvent === ev.id ? (
                        <input
                          type="text"
                          defaultValue={ev.text}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const t = e.target as HTMLInputElement;
                              editEvent(selectedDateKey, ev.id, t.value);
                            }
                          }}
                          onBlur={e => editEvent(selectedDateKey, ev.id, (e.target as HTMLInputElement).value)}
                          className="flex-1 px-2 py-1 border bg-white dark:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <div className="flex-1 px-2 py-1 text-white text-sm border" style={{ backgroundColor: ev.color, borderColor: ev.color }}>
                          {ev.text}
                        </div>
                      )}
                      <button
                        onClick={() => setEditingEvent(editingEvent === ev.id ? null : ev.id)}
                        className="p-1 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700 border"
                        aria-label="편집"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => deleteEvent(selectedDateKey, ev.id)}
                        className="p-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20 border"
                        aria-label="삭제"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {selectedEvents.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-300 text-center py-5 text-sm">일정이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> {/* container */}
    </div>
  );
};

export default CalendarPlanner;
