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
        @dragleave="handleDragLeave"
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
  (e: 'control-drop', data: { groupId: string; controlId: string; relativePosition: any }): void;
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
    classes.push('ring-2', 'ring-red-500', 'ring-inset');
    // 🔧 选中时稍微提升层级，但仍然在普通控件之下
    classes.push('z-5');
  } else {
    // 🔧 未选中时保持在最底层
    classes.push('z-1');
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
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  
  // 添加视觉反馈
  const groupElement = event.currentTarget as HTMLElement;
  groupElement.classList.add('drop-target-active');
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault();
  const groupElement = event.currentTarget as HTMLElement;
  groupElement.classList.remove('drop-target-active');
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  
  const groupElement = event.currentTarget as HTMLElement;
  groupElement.classList.remove('drop-target-active');
  
  if (!event.dataTransfer) return;

  try {
    // 尝试解析拖拽数据
    let dragData;
    try {
      dragData = JSON.parse(event.dataTransfer.getData('application/json'));
    } catch {
      // 如果不是JSON，可能是内部控件拖拽，从自定义数据类型获取
      const controlId = event.dataTransfer.getData('text/control-id');
      if (controlId) {
        dragData = { controlId, isInternalDrag: true };
      } else {
        console.warn('无法解析拖拽数据');
        return;
      }
    }

    console.log('🎯 组控件接收拖放:', dragData);
    
    // 处理内部控件拖拽（控件间移动到组）
    if (dragData.isInternalDrag && dragData.controlId) {
      const groupRect = groupElement.getBoundingClientRect();
      const groupContentArea = groupElement.querySelector('.group-content-area');
      const contentRect = groupContentArea?.getBoundingClientRect() || groupRect;
      
      // 计算相对于组内容区域的位置
      const relativeX = event.clientX - contentRect.left;
      const relativeY = event.clientY - contentRect.top - 32; // 减去标题栏高度
      
      const relativePosition = {
        left: `${Math.max(0, relativeX)}px`,
        top: `${Math.max(0, relativeY)}px`,
        anchor: 'top-left'
      };
      
      console.log('✅ 计算入组位置:', {
        控件ID: dragData.controlId,
        目标组: props.control.id,
        相对位置: relativePosition,
        鼠标位置: { x: event.clientX, y: event.clientY },
        组边界: { left: contentRect.left, top: contentRect.top },
        调整后位置: { x: relativeX, y: relativeY - 32 }
      });
      
      // 发送控件入组事件给上层处理
      emit('control-drop', {
        groupId: props.control.id,
        controlId: dragData.controlId,
        relativePosition
      });
      
      return;
    }
    
    // 处理工具箱拖拽（新建控件到组）
    if (dragData.type) {
      console.log('🎯 工具箱控件拖入组:', dragData.type);
      // TODO: 实现工具箱控件直接拖入组的逻辑
      // 这里需要创建新控件并添加到组内
      // emit('toolbox-drop', { groupId: props.control.id, controlType: dragData.type, relativePosition });
    }
    
  } catch (error) {
    console.error('处理拖放失败:', error);
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

/* 拖拽视觉反馈 */
.group-content-area.drop-target-active {
  background-color: rgba(139, 69, 19, 0.1);
  border: 2px dashed #8b4513;
  border-radius: 4px;
}

.group-content-area.drop-target-active::after {
  content: '拖放控件到此处';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(139, 69, 19, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  pointer-events: none;
  z-index: 100;
}
</style> 