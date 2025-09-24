// src/App.tsx
import React, { useEffect, useState } from "react";
import CalendarPlanner from "./CalendarPlanner";

const makeRoomId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const App: React.FC = () => {
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    let rid = location.hash.replace(/^#/, "");
    if (!rid) {
      rid = makeRoomId();
      history.replaceState(null, "", `#${rid}`);
    }
    setRoomId(rid);
  }, []);

  if (!roomId) return <div className="min-h-screen grid place-items-center">로드 중…</div>;
  return <CalendarPlanner roomId={roomId} />;
};

export default App;
