<template>
  <InteractWrapper
    :draggable="true"
    :resizable="isPrimarySelected"
    :element-id="control.id"
    :initial-position="control.position"
    :initial-size="control.size"
    :resize-min-size="{ width: 120, height: 80 }"
    :wrapper-class="wrapperClass"
    :debug="false"
    @select="handleGroupSelect"
    @drag-end="handleDragEnd"
    @resize-end="handleResizeEnd"
  >
    <div
      class="group-content-wrapper relative w-full h-full"
      :data-id="control.id"
      @click="handleGroupClick"
    >
      <!-- 组标题栏 - 专门的拖拽区域 -->
      <div 
        ref="titleBarRef"
        class="group-title-bar absolute top-0 left-0 right-0 h-8 bg-purple-100 border-b border-purple-300 select-none flex items-center justify-center cursor-move z-10"
      >
        <div class="text-purple-700 text-xs font-semibold">
          {{ control.label }} ({{ control.controls?.length || 0 }})
        </div>
      </div>

      <!-- 组内容区域 -->
      <div 
        class="group-content-area absolute inset-0 pt-8 z-5"
        @dragover="handleDragOver"
        @drop="handleDrop"
      >
        <!-- 空状态提示 -->
        <div 
          v-if="!control.controls || control.controls.length === 0"
          class="absolute inset-0 flex items-center justify-center text-purple-400 text-xs"
          style="pointer-events: none;"
        >
          拖拽控件到此组
        </div>

        <!-- 子控件渲染 -->
        <template v-if="control.controls && control.controls.length > 0">
          <GroupRenderer
            v-for="childControl in control.controls.filter(c => c.type === 'group')"
            :key="childControl.id"
            :control="childControl"
            :is-selected="isChildSelected(childControl.id)"
            :is-primary-selected="isPrimaryChildSelected(childControl.id)"
            :selected-control-ids="selectedControlIds"
            class="child-control z-15"
            @select="handleChildSelect"
            @drag-start="handleChildDragStart"
            @update-geometry="handleChildGeometryUpdate"
          />
          <ControlRenderer
            v-for="childControl in control.controls.filter(c => c.type !== 'group')"
            :key="childControl.id"
            :control="childControl"
            :is-selected="isChildSelected(childControl.id)"
            :is-primary-selected="isPrimaryChildSelected(childControl.id)"
            :selected-control-ids="selectedControlIds"
            class="child-control z-15"
            @select="handleChildSelect"
            @drag-start="handleChildDragStart"
            @update-geometry="handleChildGeometryUpdate"
          />
        </template>
      </div>

      <!-- 缩放手柄 - 只在选中时显示 -->
      <div v-if="isPrimarySelected" class="resize-handles">
        <!-- 四个角的缩放点 -->
        <div class="resize-handle nw"></div>
        <div class="resize-handle ne"></div>
        <div class="resize-handle sw"></div>
        <div class="resize-handle se"></div>
        
        <!-- 边的缩放点 -->
        <div class="resize-handle n"></div>
        <div class="resize-handle s"></div>
        <div class="resize-handle w"></div>
        <div class="resize-handle e"></div>
      </div>
    </div>
  </InteractWrapper>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Control } from '../types';
import InteractWrapper from './InteractWrapper.vue';
import ControlRenderer from './ControlRendererV3.vue';

interface Props {
  control: Control;
  isSelected: boolean;
  isPrimarySelected: boolean;
  selectedControlIds: string[];
}

interface Emits {
  (e: 'select', id: string): void;
  (e: 'drag-start', data: { controlId: string }): void;
  (e: 'update-geometry', data: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const titleBarRef = ref<HTMLElement>();

// 计算样式类
const wrapperClass = computed(() => {
  const classes = [
    'group-renderer',
    'absolute',
    'border-2',
    'border-dashed',
    'border-purple-400',
    'bg-purple-50/20'
  ];

  // 根据选择状态添加样式
  if (props.isSelected) {
    classes.push('ring-2', 'ring-red-500', 'ring-inset', 'z-10');
  }

  return classes;
});

// 子控件选择状态
function isChildSelected(childId: string): boolean {
  return props.selectedControlIds.includes(childId);
}

function isPrimaryChildSelected(childId: string): boolean {
  return props.selectedControlIds[0] === childId;
}

// 事件处理
function handleGroupSelect(id: string) {
  console.log('🏢 组控件选择:', id);
  emit('select', id);
}

function handleGroupClick(event: MouseEvent) {
  console.log('🖱️ 组控件点击:', props.control.label);
  event.stopPropagation();
  emit('select', props.control.id);
}

function handleChildSelect(childId: string) {
  console.log('👶 子控件选择:', childId);
  emit('select', childId);
}

function handleChildDragStart(data: { controlId: string }) {
  console.log('👶 子控件开始拖拽:', data.controlId);
  emit('drag-start', data);
}

function handleChildGeometryUpdate(data: any) {
  console.log('👶 子控件几何更新:', data);
  emit('update-geometry', data);
}

// InteractWrapper事件处理
function handleDragEnd({ id, rect, event }: { id: string; rect: any; event: any }) {
  console.log(`📋 [组控件 ${id}] 拖拽结束:`, { id, rect });

  emit('update-geometry', {
    id,
    newRect: rect,
    isDrag: true
  });
}

function handleResizeEnd({ id, rect, event }: { id: string; rect: any; event: any }) {
  console.log(`📐 [组控件 ${id}] 缩放结束:`, { id, rect });
  
  emit('update-geometry', {
    id,
    newRect: rect,
    isDrag: false
  });
}

// 拖放处理（接收外部控件拖入）
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  
  if (!event.dataTransfer) return;

  try {
    const data = JSON.parse(event.dataTransfer.getData('application/json'));
    console.log('🎯 组控件接收拖放:', data);
    
    // TODO: 这里需要实现控件入组逻辑
    // 可能需要发送一个特殊的事件给上层处理
    // emit('control-drop', { groupId: props.control.id, droppedData: data });
  } catch (error) {
    console.warn('解析拖放数据失败:', error);
  }
}

console.log('🏗️ GroupRenderer 初始化 (使用InteractWrapper):', {
  组ID: props.control.id,
  组名: props.control.label,
  子控件数: props.control.controls?.length || 0,
  是否选中: props.isSelected
});
</script>

<style scoped>
.group-renderer {
  min-width: 120px;
  min-height: 80px;
}

.group-content-wrapper {
  /* 确保内容区域样式 */
}

.group-title-bar {
  /* 标题栏样式保持不变 */
}

.group-content-area {
  /* 内容区域样式保持不变 */
}

.child-control {
  /* 子控件样式 */
}

/* 确保子控件的拖拽不被背景干扰 */
.child-control:hover {
  z-index: 20;
}

/* 缩放手柄样式 */
.resize-handles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 25;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #ef4444;
  border: 1px solid #fff;
  border-radius: 50%;
  pointer-events: auto;
  z-index: 30;
}

/* 角点handles */
.resize-handle.nw {
  top: -4px;
  left: -4px;
  cursor: nw-resize;
}

.resize-handle.ne {
  top: -4px;
  right: -4px;
  cursor: ne-resize;
}

.resize-handle.sw {
  bottom: -4px;
  left: -4px;
  cursor: sw-resize;
}

.resize-handle.se {
  bottom: -4px;
  right: -4px;
  cursor: se-resize;
}

/* 边中点handles */
.resize-handle.n {
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

.resize-handle.s {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

.resize-handle.w {
  top: 50%;
  left: -4px;
  transform: translateY(-50%);
  cursor: w-resize;
}

.resize-handle.e {
  top: 50%;
  right: -4px;
  transform: translateY(-50%);
  cursor: e-resize;
}

.resize-handle:hover {
  background: #dc2626;
  transform: scale(1.2);
}

/* Z-index 层级管理 */
.z-5 { z-index: 5; }
.z-10 { z-index: 10; }
.z-15 { z-index: 15; }
</style> 