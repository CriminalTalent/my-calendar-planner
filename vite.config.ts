import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = 'my-calendar-planner'; // 저장소 이름

export default defineConfig({
  plugins: [react()],
  base: `/${repoName}/`, // GitHub Pages(프로젝트 페이지)용 경로
});
