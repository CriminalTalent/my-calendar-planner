import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, Clock, CheckSquare, Plus, X, Edit3,
  Upload, Palette, Settings, AlignLeft, AlignCenter, AlignRight, Moon, Sun
} from 'lucide-react';

const pad2 = (n: number) => String(n).padStart(2, '0');

// 로컬 타임존 안전한 YYYY-MM-DD
const toDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${pad2(m)}-${pad2(day)}`;
};

// 월 이동
const addMonthsSafe = (d: Date, delta: number) => new Date(d.getFullYear(), d.getMonth() + delta, 1);

const CalendarPlanner = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, {id:number; text:string; color:string}[]>>({});
  const [todos, setTodos] = useState<{id:number; text:string; completed:boolean; color:string}[]>([]);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [newEvent, setNewEvent] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [accentColor, setAccentColor] = useState('#3b82f6');

  // 헤더
  const [headerTitle, setHeaderTitle] = useState('나의 플래너');
  const [headerImage, setHeaderImage] = useState('');
  const [headerBgColor, setHeaderBgColor] = useState('#ffffff');
  const [headerTextColor, setHeaderTextColor] = useState('#1f2937');
  const [headerTextAlign, setHeaderTextAlign] = useState<'left'|'center'|'right'>('left');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [showHeaderSettings, setShowHeaderSettings] = useState(false);

  // 현재 시각 + 시간 색
  const [now, setNow] = useState(new Date());
  const [headerTimeColor, setHeaderTimeColor] = useState('#1f2937');

  // 사이드바 배경
  const [timerBgImage, setTimerBgImage] = useState('');
  const [timerBgColor, setTimerBgColor] = useState('#f3f4f6');
  const [todoBgImage, setTodoBgImage] = useState('');
  const [todoBgColor, setTodoBgColor] = useState('#f3f4f6');

  // 다크 모드
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const headerImageInputRef = useRef<HTMLInputElement | null>(null);
  const timerImageInputRef = useRef<HTMLInputElement | null>(null);
  const todoImageInputRef = useRef<HTMLInputElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // 시계
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // 타이머 (인터벌 1개 유지)
  useEffect(() => {
    if (!isTimerRunning) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }
    if (timerIntervalRef.current) return;

    timerIntervalRef.current = window.setInterval(() => {
      setTimerSeconds(prevS => {
        setTimerMinutes(prevM => {
          let m = prevM;
          let s = prevS;
          if (m === 0 && s === 0) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            setIsTimerRunning(false);
            alert('타이머 완료!');
            return 0;
          }
          if (s === 0) {
            m = Math.max(0, prevM - 1);
            s = 59;
          } else {
            s = prevS - 1;
          }
          setTimerMinutes(m);
          return s;
        });
        return prevS;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerRunning]);

  // 캘린더 날짜
  const getCalendarDays = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay()); // 일~토 6주 채우기

    const days: Date[] = [];
    const end = new Date(start);
    end.setDate(end.getDate() + 41); // 42칸

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  // 이벤트
  const addEvent = () => {
    if (!newEvent.trim()) return;
    const key = toDateKey(selectedDate);
    setEvents(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { id: Date.now(), text: newEvent.trim(), color: accentColor }]
    }));
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
    setEvents(prev => ({ ...prev, [key]: (prev[key] || []).map(e => e.id === id ? { ...e, text } : e) }));
    setEditingEvent(null);
  };

  // Todo
  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos(prev => [...prev, { id: Date.now(), text: newTodo.trim(), completed: false, color: accentColor }]);
    setNewTodo('');
  };
  const toggleTodo = (id: number) => setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTodo = (id: number) => setTodos(prev => prev.filter(t => t.id !== id));

  // 이미지 업로드
  const loadFileAsDataURL = (file: File, setter: (v: string) => void) => {
    const r = new FileReader();
    r.onload = e => setter(String(e.target?.result || ''));
    r.readAsDataURL(file);
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) loadFileAsDataURL(f, setBackgroundImage);
  };
  const handleHeaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) loadFileAsDataURL(f, setHeaderImage);
  };
  const handleTimerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) loadFileAsDataURL(f, setTimerBgImage);
  };
  const handleTodoImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) loadFileAsDataURL(f, setTodoBgImage);
  };

  // 타이머 리셋
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerMinutes(25);
    setTimerSeconds(0);
  };

  const calendarDays = getCalendarDays();
  const selectedDateKey = toDateKey(selectedDate);
  const selectedEvents = events[selectedDateKey] || [];

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
        {/* 헤더 (각진 + 컴팩트) */}
        <div className="relative mb-3 sm:mb-4">
          <div
            className="shadow-sm overflow-hidden relative border border-gray-200 dark:border-slate-700 card"
            style={{
              backgroundColor: headerBgColor,
              backgroundImage: headerImage ? `url(${headerImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: '112px'
            }}
          >
            <div className="absolute inset-0 bg-black/15 dark:bg-black/30" />
            <div className="relative z-10 px-3 py-3 sm:px-4 sm:py-4">
              <div className="w-full flex items-start justify-between gap-3" style={{ textAlign: headerTextAlign }}>
                <div className="flex-1">
                  {isEditingHeader ? (
                    <input
                      type="text"
                      value={headerTitle}
                      onChange={(e) => setHeaderTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingHeader(false)}
                      onBlur={() => setIsEditingHeader(false)}
                      className="text-xl sm:text-2xl font-semibold bg-transparent border-2 border-dashed border-white/50 px-2 py-1 placeholder-white/70 focus-visible-ring max-w-full w-full"
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
                    {new Date().toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
                    })}
                  </p>
                  <p className="text-[11px] sm:text-xs mt-0.5 opacity-90 leading-tight" style={{ color: headerTimeColor }}>
                    {now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  </p>
                </div>

                {/* 다크 모드 토글 */}
                <button
                  onClick={() => setIsDark(v => !v)}
                  className="px-2.5 py-2 border bg-white/90 dark:bg-slate-800 dark:text-gray-100 hover:bg-white focus-visible-ring"
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
                        onClick={() => setHeaderTextAlign(value as 'left'|'center'|'right')}
                        className={`flex items-center justify-center p-2 border ${
                          headerTextAlign === value ? 'text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-200'
                        } focus-visible-ring`}
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
                      <span className="text-[11px] text-gray-500 dark:text-gray-300">날짜 글자</span>
                      <input
                        type="color"
                        value={headerTextColor}
                        onChange={(e) => setHeaderTextColor(e.target.value)}
                        className="w-7 h-7 cursor-pointer border focus-visible-ring"
                      />
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 border dark:bg-slate-700">
                      <span className="text-[11px] text-gray-500 dark:text-gray-300">배경</span>
                      <input
                        type="color"
                        value={headerBgColor}
                        onChange={(e) => setHeaderBgColor(e.target.value)}
                        className="w-7 h-7 cursor-pointer border focus-visible-ring"
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
                      onChange={(e) => setHeaderTimeColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer border focus-visible-ring"
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
                      className="flex-1 flex items-center justify-center gap-2 px-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border transition-colors text-xs focus-visible-ring"
                    >
                      <Upload size={12} />
                      업로드
                    </button>
                    {headerImage && (
                      <button
                        onClick={() => setHeaderImage('')}
                        className="px-2 py-2 bg-red-50 hover:bg-red-100 text-red-600 border transition-colors text-xs focus-visible-ring"
                      >
                        <X size={12} />
                      </button>
                    )}
                    <input
                      ref={headerImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleHeaderImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setShowHeaderSettings(false)}
                  className="w-full px-2.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-100 border text-xs focus-visible-ring"
                >
                  완료
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 전체 배경 설정 */}
        <div className="mb-3 card p-2.5">
          <div className="flex justify-between items-center gap-2">
            <h3 className="text-xs sm:text-sm font-semibold">전체 설정</h3>
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-2">
                <Palette size={14} />
                <span className="text-[11px] text-gray-600 dark:text-gray-300">테마</span>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-6 h-6 cursor-pointer border focus-visible-ring"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border text-xs focus-visible-ring"
              >
                <Upload size={12} />
                전체 배경
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* 메인 레이아웃: 모바일 1열, lg에서 2열 */}
        <div className="grid grid-cols-12 gap-3">
          {/* 왼쪽: 타이머 & Todo */}
          <div className="col-span-12 lg:col-span-4">
            {/* 타이머 */}
            <div
              className="relative overflow-hidden card p-4 mb-3"
              style={{
                backgroundColor: timerBgColor,
                backgroundImage: timerBgImage ? `url(${timerBgImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: '220px'
              }}
            >
              {timerBgImage && <div className="absolute inset-0 bg-black/25" />}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock size={20} />
                    타이머
                  </h3>
                  <div className="flex items-center gap-2 bg-white/85 dark:bg-slate-800 backdrop-blur-sm border p-1.5">
                    <span className="text-[11px] text-gray-600 dark:text-gray-300">꾸밈</span>
                    <input
                      type="color"
                      value={timerBgColor}
                      onChange={(e) => setTimerBgColor(e.target.value)}
                      className="w-6 h-6 cursor-pointer border focus-visible-ring"
                      title="배경색"
                    />
                    <button
                      onClick={() => timerImageInputRef.current?.click()}
                      className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border focus-visible-ring"
                      title="이미지 추가"
                    >
                      <Upload size={12} />
                    </button>
                    <input
                      ref={timerImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleTimerImageUpload}
                      className="hidden"
                    />
                    {timerBgImage && (
                      <button
                        onClick={() => setTimerBgImage('')}
                        className="p-1 bg-red-50 hover:bg-red-100 text-red-700 border focus-visible-ring"
                        title="이미지 제거"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <div
                    className="text-4xl sm:text-5xl font-mono font-bold mb-4 px-4 py-6 mx-auto flex items-center justify-center text-white shadow"
                    style={{ backgroundColor: accentColor, minHeight: '120px' }}
                  >
                    {pad2(timerMinutes)}:{pad2(timerSeconds)}
                  </div>

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setIsTimerRunning(v => !v)}
                      className="flex-1 px-3 py-2 text-white font-semibold hover:opacity-90 transition-opacity border focus-visible-ring"
                      style={{ backgroundColor: accentColor }}
                    >
                      {isTimerRunning ? '일시정지' : '시작'}
                    </button>
                    <button
                      onClick={resetTimer}
                      className="px-3 py-2 bg-gray-600 text-white hover:bg-gray-700 border focus-visible-ring"
                    >
                      리셋
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {[15, 25, 30, 45].map(minutes => (
                      <button
                        key={minutes}
                        onClick={() => {
                          setIsTimerRunning(false);
                          setTimerMinutes(minutes);
                          setTimerSeconds(0);
                        }}
                        className="px-2 py-1.5 bg-white/95 hover:bg-white dark:bg-slate-700 dark:hover:bg-slate-600 border text-sm focus-visible-ring"
                      >
                        {minutes}분
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Todo */}
            <div
              className="relative overflow-hidden card p-4"
              style={{
                backgroundColor: todoBgColor,
                backgroundImage: todoBgImage ? `url(${todoBgImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: '320px'
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
                      onChange={(e) => setTodoBgColor(e.target.value)}
                      className="w-6 h-6 cursor-pointer border focus-visible-ring"
                      title="배경색"
                    />
                    <button
                      onClick={() => todoImageInputRef.current?.click()}
                      className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border focus-visible-ring"
                      title="이미지 추가"
                    >
                      <Upload size={12} />
                    </button>
                    <input
                      ref={todoImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleTodoImageUpload}
                      className="hidden"
                    />
                    {todoBgImage && (
                      <button
                        onClick={() => setTodoBgImage('')}
                        className="p-1 bg-red-50 hover:bg-red-100 text-red-700 border focus-visible-ring"
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
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                    placeholder="새 할 일을 입력하세요..."
                    className="flex-1 px-3 py-2 border bg-white/95 dark:bg-slate-800 focus-visible-ring"
                  />
                  <button
                    onClick={addTodo}
                    className="px-3 py-2 text-white hover:opacity-90 transition-opacity border focus-visible-ring"
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
                        className={`w-6 h-6 border flex items-center justify-center ${todo.completed ? 'text-white' : 'bg-white dark:bg-slate-700'} focus-visible-ring`}
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
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border focus-visible-ring"
                        aria-label="삭제"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {todos.length === 0 && (
                    <div className="text-center py-10">
                      <CheckSquare size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-300 text-sm">할 일을 추가해보세요!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 캘린더 */}
          <div className="col-span-12 lg:col-span-8">
            <div className="card p-3 sm:p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Calendar size={18} />
                  {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentDate(d => addMonthsSafe(d, -1))}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border text-sm focus-visible-ring"
                    aria-label="이전 달"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border text-xs focus-visible-ring"
                    aria-label="오늘"
                  >
                    오늘
                  </button>
                  <button
                    onClick={() => setCurrentDate(d => addMonthsSafe(d, +1))}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border text-sm focus-visible-ring"
                    aria-label="다음 달"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 mb-3">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="text-center py-1.5 font-medium text-gray-600 dark:text-gray-200 text-xs sm:text-sm border bg-gray-50 dark:bg-slate-800">
                    {day}
                  </div>
                ))}

                {calendarDays.map((day) => {
                  const dateKey = toDateKey(day);
                  const dayEvents = events[dateKey] || [];
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(new Date(day))}
                      className={`p-2 min-h-[64px] text-left transition-all hover:bg-gray-50 dark:hover:bg-slate-700 relative border ${
                        isToday ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-slate-800'
                      } ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-500' : ''} focus-visible-ring`}
                      style={{ boxShadow: isSelected ? `0 0 0 2px ${accentColor} inset` : 'none' }}
                    >
                      <div className={`font-medium text-xs sm:text-sm ${isToday ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {dayEvents.slice(0, 2).map(ev => (
                          <div
                            key={ev.id}
                            className="text-[11px] sm:text-xs px-1 py-0.5 text-white truncate border"
                            style={{ backgroundColor: ev.color, borderColor: ev.color }}
                            title={ev.text}
                          >
                            {ev.text}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-300">
                            +{dayEvents.length - 2}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 선택 날짜 일정 */}
              <div className="border-t pt-3 dark:border-slate-700">
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 일정
                </h3>

                <div className="flex gap-2 mb-2.5">
                  <input
                    type="text"
                    value={newEvent}
                    onChange={(e) => setNewEvent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addEvent()}
                    placeholder="새 일정 추가..."
                    className="flex-1 px-3 py-2 border bg-white dark:bg-slate-800 focus-visible-ring"
                  />
                  <button
                    onClick={addEvent}
                    className="px-3 py-2 text-white hover:opacity-90 transition-opacity border focus-visible-ring"
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const t = e.target as HTMLInputElement;
                              editEvent(selectedDateKey, ev.id, t.value);
                            }
                          }}
                          onBlur={(e) => editEvent(selectedDateKey, ev.id, (e.target as HTMLInputElement).value)}
                          className="flex-1 px-2 py-1 border bg-white dark:bg-slate-700 focus-visible-ring"
                          autoFocus
                        />
                      ) : (
                        <div
                          className="flex-1 px-2 py-1 text-white text-sm border"
                          style={{ backgroundColor: ev.color, borderColor: ev.color }}
                        >
                          {ev.text}
                        </div>
                      )}
                      <button
                        onClick={() => setEditingEvent(editingEvent === ev.id ? null : ev.id)}
                        className="p-1 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700 border focus-visible-ring"
                        aria-label="편집"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => deleteEvent(selectedDateKey, ev.id)}
                        className="p-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20 border focus-visible-ring"
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
        </div>{/* grid */}
      </div>
    </div>
  );
};

export default CalendarPlanner;
