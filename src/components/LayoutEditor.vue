<script setup lang="ts">
import { ref } from 'vue';
import Toolbox from './Toolbox.vue';
import Canvas from './Canvas.vue';
import CanvasV2 from './CanvasV2.vue';
import PropertyInspector from './PropertyInspector.vue';
import TopBar from './TopBar.vue';

// 新架构开关 - 可以切换测试
const useNewArchitecture = ref(true);

function toggleArchitecture() {
  useNewArchitecture.value = !useNewArchitecture.value;
  console.log('🔄 切换架构:', useNewArchitecture.value ? '新架构' : '旧架构');
}
</script>

<template>
  <div class="flex flex-col h-screen font-sans bg-gray-100">
    <TopBar />
    
    <!-- 架构切换按钮 -->
    <div class="bg-blue-100 border-b border-blue-200 px-4 py-2 text-center">
      <button 
        @click="toggleArchitecture"
        class="bg-blue-500 text-white px-4 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
      >
        {{ useNewArchitecture ? '使用新架构 ✨' : '使用旧架构 🔄' }}
        <span class="text-xs opacity-75 ml-2">
          ({{ useNewArchitecture ? 'CanvasV2' : 'Canvas' }})
        </span>
      </button>
    </div>
    
    <main class="flex flex-grow overflow-hidden">
      <Toolbox />
      
      <!-- 条件渲染不同的Canvas -->
      <CanvasV2 v-if="useNewArchitecture" />
      <Canvas v-else />
      
      <PropertyInspector />
    </main>
  </div>
</template>