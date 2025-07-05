<template>
  <div
    ref="groupRef"
    class="group-renderer absolute border-2 border-dashed border-purple-400 bg-purple-50/20"
    :class="{ 
      'ring-2 ring-red-500 ring-inset': isSelected,
      'z-10': isSelected,
      'cursor-move': !isInteracting,
      'cursor-nw-resize': isSelected && !isInteracting
    }"
    :style="styleObject"
    :data-id="control.id"
    @click="handleGroupClick"
  >
    <!-- 组标题栏 - 专门的拖拽区域 -->
    <div 
      ref="titleBarRef"
      class="group-title-bar absolute top-0 left-0 right-0 h-8 bg-purple-100 border-b border-purple-300 select-none flex items-center justify-center cursor-move group-drag-area"
    >
      <div class="text-purple-700 text-xs font-semibold">
        {{ control.label }} ({{ control.controls?.length || 0 }})
      </div>
    </div>

    <!-- 组内容区域 -->
    <div 
      class="group-content-area absolute inset-0 pt-8"
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
          class="child-control"
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
          class="child-control"
          @select="handleChildSelect"
          @drag-start="handleChildDragStart"
          @update-geometry="handleChildGeometryUpdate"
        />
      </template>
    </div>

    <!-- 缩放手柄 - 只在选中时显示 -->
    <div v-if="isPrimarySelected" class="resize-handles">
      <!-- 四个角的缩放点 -->
      <div class="resize-handle nw" style="top: -4px; left: -4px;"></div>
      <div class="resize-handle ne" style="top: -4px; right: -4px;"></div>
      <div class="resize-handle sw" style="bottom: -4px; left: -4px;"></div>
      <div class="resize-handle se" style="bottom: -4px; right: -4px;"></div>
      
      <!-- 边的缩放点 -->
      <div class="resize-handle n" style="top: -4px; left: 50%; transform: translateX(-50%);"></div>
      <div class="resize-handle s" style="bottom: -4px; left: 50%; transform: translateX(-50%);"></div>
      <div class="resize-handle w" style="top: 50%; left: -4px; transform: translateY(-50%);"></div>
      <div class="resize-handle e" style="top: 50%; right: -4px; transform: translateY(-50%);"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, defineComponent } from 'vue';
import interact from 'interactjs';
import type { Control } from '../types';
import ControlRenderer from './ControlRenderer.vue';

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

const groupRef = ref<HTMLElement>();
const titleBarRef = ref<HTMLElement>();
const isInteracting = ref(false);

// 样式计算
const styleObject = computed(() => {
  const style: Record<string, any> = {};
  const { position, size } = props.control;

  // 尺寸设置
  if (size.width) style.width = size.width;
  if (size.height) style.height = size.height;

  // 位置设置
  const anchor = position.anchor || 'top-left';
  let anchorY, anchorX;
  
  if (anchor === 'center') {
    anchorY = 'middle';
    anchorX = 'center';
  } else {
    const parts = anchor.split('-');
    anchorY = parts[0];
    anchorX = parts[1];
  }

  // 水平位置
  if (anchorX === 'left' && position.left !== undefined) {
    style.left = position.left;
  } else if (anchorX === 'right' && position.right !== undefined) {
    style.right = position.right;
  } else if (anchorX === 'center') {
    style.left = position.left || '50%';
    style.transform = 'translateX(-50%)';
  }

  // 垂直位置
  if (anchorY === 'top' && position.top !== undefined) {
    style.top = position.top;
  } else if (anchorY === 'bottom' && position.bottom !== undefined) {
    style.bottom = position.bottom;
  } else if (anchorY === 'middle') {
    style.top = position.top || '50%';
    const existingTransform = style.transform || '';
    style.transform = existingTransform ? `${existingTransform} translateY(-50%)` : 'translateY(-50%)';
  }

  return style;
});

// 子控件选择状态
function isChildSelected(childId: string): boolean {
  return props.selectedControlIds.includes(childId);
}

function isPrimaryChildSelected(childId: string): boolean {
  return props.selectedControlIds[0] === childId;
}

// 事件处理
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

// interact.js 集成
onMounted(() => {
  if (groupRef.value) {
    const element = groupRef.value;
    
    interact(element)
      .draggable({
        // 只允许从标题栏拖拽
        allowFrom: '.group-drag-area',
        // 忽略子控件和缩放手柄
        ignoreFrom: '.child-control, .resize-handle',
        listeners: { 
          start: handleDragStart,
          move: handleDragMove,
          end: handleDragEnd
        },
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: 'parent'
          })
        ]
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        // 只允许从缩放手柄触发缩放
        allowFrom: '.resize-handle',
        listeners: {
          start: handleResizeStart,
          move: handleResizeMove,
          end: handleResizeEnd
        },
        modifiers: [
          interact.modifiers.restrictEdges({
            outer: 'parent'
          }),
          interact.modifiers.restrictSize({
            min: { width: 120, height: 80 }
          })
        ]
      });
  }
});

function handleDragStart(event: any) {
  isInteracting.value = true;
  const target = event.target;
  
  // 选择组控件
  emit('select', props.control.id);
  
  // 开始拖拽
  emit('drag-start', { controlId: props.control.id });
  
  // 记录初始变换状态
  const initialTransform = target.style.transform || '';
  target.setAttribute('data-initial-transform', initialTransform);
  
  console.log('📋 interact.js 组控件开始拖拽:', props.control.label);
}

function handleDragMove(event: any) {
  const target = event.target;
  const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
  const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

  // 获取基础transform
  const initialTransform = target.getAttribute('data-initial-transform') || '';
  
  // 应用拖拽变换
  target.style.transform = `${initialTransform} translate(${x}px, ${y}px)`.trim();

  // 更新数据属性
  target.setAttribute('data-x', x);
  target.setAttribute('data-y', y);
  
  console.log('📋 interact.js 组控件拖拽中:', { dx: event.dx, dy: event.dy, totalX: x, totalY: y });
}

function handleDragEnd(event: any) {
  console.log('📋 interact.js 组控件结束拖拽:', props.control.label);
  const target = event.target;
  
  // 获取累积的移动量
  const dx = parseFloat(target.getAttribute('data-x') || '0');
  const dy = parseFloat(target.getAttribute('data-y') || '0');
  
  console.log('📋 组控件拖拽完成，累积移动:', { dx, dy });
  
  // 发送几何更新事件
  emit('update-geometry', { 
    id: props.control.id, 
    dx, 
    dy, 
    isDrag: true 
  });
  
  // 清理临时状态
  target.style.transform = target.getAttribute('data-initial-transform') || '';
  target.removeAttribute('data-x');
  target.removeAttribute('data-y');
  target.removeAttribute('data-initial-transform');
  
  isInteracting.value = false;
}

function handleResizeStart(event: any) {
  isInteracting.value = true;
  const target = event.target;
  
  // 记录初始状态
  const initialTransform = target.style.transform || '';
  target.setAttribute('data-initial-transform', initialTransform);
  
  // 为了在缩放过程中获得准确的视觉反馈，需要临时移除transform
  if (initialTransform.includes('translate')) {
    const rect = target.getBoundingClientRect();
    const parentRect = target.parentElement.getBoundingClientRect();
    
    // 计算元素相对于父容器的实际显示位置
    const actualLeft = rect.left - parentRect.left;
    const actualTop = rect.top - parentRect.top;
    
    // 临时移除transform并设置绝对位置
    target.style.transform = '';
    target.style.left = `${actualLeft}px`;
    target.style.top = `${actualTop}px`;
    
    // 记录临时状态，用于恢复
    target.setAttribute('data-temp-positioning', 'true');
  }
  
  // 重置累积位移
  target.setAttribute('data-x', '0');
  target.setAttribute('data-y', '0');
  
  console.log('📐 interact.js 组控件开始缩放:', props.control.label);
}

function handleResizeMove(event: any) {
  const target = event.target;
  
  // 直接设置大小和位置，让 interact.js 完全控制
  target.style.width = event.rect.width + 'px';
  target.style.height = event.rect.height + 'px';
  
  // 清除任何变换
  target.style.transform = '';
  
  // 实时更新位置，无论是否临时定位
  const parentRect = target.parentElement.getBoundingClientRect();
  const left = event.rect.left - parentRect.left;
  const top = event.rect.top - parentRect.top;
  target.style.left = `${left}px`;
  target.style.top = `${top}px`;
  
  console.log('📐 interact.js 组控件缩放中:', { 
    width: event.rect.width, 
    height: event.rect.height,
    deltaRect: event.deltaRect,
    当前位置: { left: target.style.left, top: target.style.top }
  });
}

function handleResizeEnd(event: any) {
  console.log('📐 interact.js 组控件结束缩放:', props.control.label);
  const target = event.target;
  

  
  // 使用interact.js提供的rect信息
  const interactRect = event.rect;
  const parentRect = target.parentElement.getBoundingClientRect();
  
  // 计算相对于父容器的位置和尺寸
  let left, top;
  if (target.getAttribute('data-temp-positioning') === 'true') {
    // 如果使用了临时定位，直接使用 interact.js 的 rect
    // 因为临时定位时，interact.js 已经考虑了所有位移
    left = interactRect.left - parentRect.left;
    top = interactRect.top - parentRect.top;
  } else {
    // 正常情况，使用 interact.js 的 rect
    left = interactRect.left - parentRect.left;
    top = interactRect.top - parentRect.top;
  }
  
  const relativeRect = {
    left,
    top,
    right: left + interactRect.width,
    bottom: top + interactRect.height,
    width: interactRect.width,
    height: interactRect.height
  };

  console.log('📐 组控件缩放完成，详细信息:', {
    原始interactRect: interactRect,
    父容器rect: parentRect,
    使用了临时定位: target.getAttribute('data-temp-positioning') === 'true',
    临时定位样式: { left: target.style.left, top: target.style.top },
    计算的最终位置: { left, top },
    最终relativeRect: relativeRect
  });

  emit('update-geometry', { 
    id: props.control.id, 
    newRect: relativeRect, 
    isDrag: false 
  });

  // 清理临时状态，但不清空样式，让 Vue 响应式系统接管
  target.removeAttribute('data-x');
  target.removeAttribute('data-y');
  target.removeAttribute('data-initial-transform');
  
  // 如果使用了临时定位，清理相关属性
  if (target.getAttribute('data-temp-positioning') === 'true') {
    target.removeAttribute('data-temp-positioning');
  }
  
  isInteracting.value = false;
}

onBeforeUnmount(() => {
  try {
    if (groupRef.value && interact && typeof interact.isSet === 'function') {
      if (interact.isSet(groupRef.value)) {
        interact(groupRef.value).unset();
      }
    }
  } catch (error) {
    console.warn('清理GroupRenderer interact.js时出错:', error);
  }
});

console.log('🏗️ GroupRenderer 初始化:', {
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

.group-title-bar {
  z-index: 10;
}

.group-content-area {
  z-index: 5;
}

.child-control {
  z-index: 15;
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
  border-radius: 2px;
  pointer-events: auto;
  z-index: 30;
}

.resize-handle.nw { cursor: nw-resize; }
.resize-handle.ne { cursor: ne-resize; }
.resize-handle.sw { cursor: sw-resize; }
.resize-handle.se { cursor: se-resize; }
.resize-handle.n { cursor: n-resize; }
.resize-handle.s { cursor: s-resize; }
.resize-handle.w { cursor: w-resize; }
.resize-handle.e { cursor: e-resize; }

.resize-handle:hover {
  background: #dc2626;
  transform: scale(1.2);
}
</style> 