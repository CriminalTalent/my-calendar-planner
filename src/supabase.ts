// src/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

// rooms 테이블에서 특정 roomId 문서 가져오기/업서트 편의 함수
export const fetchRoom = async (roomId: string) => {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, payload, updated_at")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const upsertRoom = async (roomId: string, payload: any, updatedAt: number) => {
  const { error } = await supabase
    .from("rooms")
    .upsert({ id: roomId, payload, updated_at: updatedAt });
  if (error) throw error;
};
