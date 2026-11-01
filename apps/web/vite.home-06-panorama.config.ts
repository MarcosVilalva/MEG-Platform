import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {copyFileSync} from 'node:fs';
export default defineConfig({
 base:'/',
 plugins:[react(),{name:'preview-root',closeBundle(){
  copyFileSync(path.resolve(__dirname,'dist-home-06-panorama/home-06-panorama.html'),path.resolve(__dirname,'dist-home-06-panorama/index.html'));
 }}],
 build:{outDir:'dist-home-06-panorama',emptyOutDir:true,rollupOptions:{input:path.resolve(__dirname,'home-06-panorama.html')}}
});
