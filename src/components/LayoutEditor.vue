<script setup lang="ts">
import Toolbox from './Toolbox.vue';
import Canvas from './Canvas.vue'; // 直接使用 Canvas 组件
import PropertyInspector from './PropertyInspector.vue';
import TopBar from './TopBar.vue';
</script>

<template>
  <div class="flex flex-col h-screen font-sans bg-gray-100">
    <TopBar />
    <main class="flex flex-grow overflow-hidden">
      <Toolbox />
      <Canvas />
      <PropertyInspector />
    </main>
  </div>
</template>