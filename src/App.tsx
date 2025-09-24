// src/App.tsx
import React, { useEffect, useState } from "react";
import CalendarPlanner from "./CalendarPlanner";
import { auth, provider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      alert("로그인 실패: 팝업 차단 해제 또는 네트워크 확인");
    }
  };

  const handleLogout = async () => {
    if (!confirm("로그아웃하시겠어요? 동기화는 중지되지만 로컬 데이터는 남습니다.")) return;
    await signOut(auth);
  };

  if (!ready) return <div className="min-h-screen grid place-items-center">로딩 중…</div>;

  return (
    <div>
      {/* 상단 바: 로그인 상태 */}
      <div className="w-full px-3 py-2 flex items-center justify-end gap-2 bg-white/80 backdrop-blur-sm"
           style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(0,0,0,.08)" }}>
        {user ? (
          <>
            <UserIcon size={16} />
            <span className="text-sm">{user.displayName || user.email || "Google 사용자"}</span>
            <button onClick={handleLogout}
                    className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
              <LogOut className="inline -mt-1 mr-1" size={14} />
              로그아웃
            </button>
          </>
        ) : (
          <button onClick={handleLogin}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:opacity-90 rounded">
            <LogIn className="inline -mt-1 mr-1" size={14} />
            Google로 로그인
          </button>
        )}
      </div>

      {/* 본문: 로그인 없어도 사용 가능(로컬 저장), 로그인 시 클라우드 동기화 활성 */}
      <CalendarPlanner currentUser={user} />
    </div>
  );
};

export default App;
