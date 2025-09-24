import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = 'my-calendar-planner'; // 본인 저장소명

export default defineConfig({
  plugins: [react()],
  base: `/${repoName}/`,
});
