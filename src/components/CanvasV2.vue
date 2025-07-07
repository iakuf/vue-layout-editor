<template>
  <div class="flex-grow p-5 flex justify-center items-center bg-gray-200">
    <div 
      id="layout-canvas"
      class="w-[812px] h-[375px] bg-white shadow-lg relative overflow-hidden" 
      ref="canvasRef"
      @pointerdown.self="handleCanvasClick"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <!-- 循环渲染所有控件 -->
      <component
        v-for="control in activeControls"
        :key="control.id"
        :is="control.type === 'group' ? GroupRenderer : ControlRenderer"
        :control="control"
        :is-selected="selectedControlIds.includes(control.id)"
        :is-primary-selected="selectedControlIds[0] === control.id"
        :selected-control-ids="selectedControlIds"
        @select="handleSelect"
        @update-geometry="handleGeometryUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { Control } from '../types';
import { layout, executeCommand, selectedControlIds } from '../store';
import { createControl } from '../factories/controlFactory';
import { AddControlCommand } from '../commands/AddControlCommand';
// todo: 未来没用到都是需要先删除
// import { ControlTreeManager } from '../utils/ControlTreeManager';
// import { DragStateManager } from '../utils/DragStateManager';
// import { BatchMoveCommand } from '../commands/BatchMoveCommand';
// import { MoveToGroupCommand } from '../commands/MoveToGroupCommand';
import { ResizeControlCommand } from '../commands/ResizeControlCommand';
import GroupRenderer from './GroupRenderer.vue';
import ControlRenderer from './ControlRendererV3.vue';
// 编辑器内部统一使用 px 单位，只在导入导出时转换

const canvasRef = ref<HTMLElement>();

// 计算属性：获取当前活动的控件列表
const activeControls = computed(() => {
  return layout.controlSets[layout.initialSet] || [];
});

// 处理控件选择
function handleSelect(controlId: string) {
  console.log('🎯 选择控件:', controlId);
  selectedControlIds.value = [controlId];
}

// 处理画布点击（取消选择）
function handleCanvasClick() {
  console.log('🖱️ 画布点击 - 取消选择');
  selectedControlIds.value = [];
}

// 处理几何更新（拖拽或缩放）
// 找到 handleGeometryUpdate 函数并替换
function handleGeometryUpdate({ id, newRect, isDrag }: { 
  id: string; 
  newRect: any; 
  isDrag: boolean;
}) {
  console.log(`🔄 几何更新 (${isDrag ? '拖拽' : '缩放'}):`, { id, newRect });
  if (!canvasRef.value) return;

  try {
    // ✨ 核心架构修复 ✨
    // 在这里，我们不仅更新位置和尺寸，还要将锚点标准化为 'top-left'。
    // 这可以确保 interact.js 返回的绝对像素位置得到正确应用，
    // 消除了因 'bottom-right' 等不同锚点造成的布局计算冲突。
    const command = new ResizeControlCommand(id, {
      // 尺寸更新
      width: newRect.width,
      height: newRect.height,
      
      // 位置更新
      left: newRect.left,
      top: newRect.top,
      
      // 锚点标准化
      anchor: 'top-left'
    });

    executeCommand(command);
    console.log(`✅ ${isDrag ? '拖拽' : '缩放'}命令执行成功`);
  } catch (error) {
    console.error(`❌ ${isDrag ? '拖拽' : '缩放'}命令执行失败:`, error);
  }
}


// 处理拖拽悬停事件
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

// 处理拖拽放置事件
function handleDrop(event: DragEvent) {
  event.preventDefault();
  if (!canvasRef.value || !event.dataTransfer) return;

  const data = JSON.parse(event.dataTransfer.getData('application/json'));
  if (!data.type) return;

  // 计算相对于画布的放置坐标
  const canvasRect = canvasRef.value.getBoundingClientRect();
  const dropX = event.clientX - canvasRect.left;
  const dropY = event.clientY - canvasRect.top;

  // 判断是否为group类型
  let parentType: 'canvas' | 'group' = 'canvas';
  let parentRect = canvasRect;

  // 这里可以扩展：如果支持拖到group内部，需要获取group的rect
  // 目前默认都在画布上拖放

  // 使用工厂函数创建新的控件对象，传递parentType和parentRect
  const newControl = createControl(data.type, { x: dropX, y: dropY }, { parentType, parentRect });

  // 判断新控件类型
  const isGroup = newControl.type === 'group';
  if (isGroup) {
    console.log('新增的是顶层控件组，已使用vw/vh单位');
  } else {
    console.log('新增的是普通控件，已使用%单位（如有group父容器）或px单位（兜底）');
  }

  // 创建并执行AddControlCommand
  const command = new AddControlCommand(newControl);
  executeCommand(command);

  // 选中新创建的控件
  selectedControlIds.value = [newControl.id];
}
</script>

<style scoped>
/* Canvas样式 */
#layout-canvas {
  /* 确保容器稳定，防止子元素interact时影响布局 */
  position: relative;
  contain: layout style paint; /* CSS Containment：隔离布局计算 */
  transform: translateZ(0); /* 强制创建新的层叠上下文 */
  will-change: auto; /* 避免不必要的合成层 */
}

/* 确保所有子元素的绝对定位不影响容器和兄弟元素 */
#layout-canvas > * {
  position: absolute;
  transform-style: preserve-3d; /* 保持3D变换空间独立 */
}
</style> 