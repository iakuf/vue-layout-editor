<template>
  <InteractWrapper :draggable="true" :resizable="isPrimarySelected" :element-id="control.id"
    :initial-position="control.position" :initial-size="control.size" :element-type="control.type"
    :resize-allow-from="'.resize-handles'" :resize-min-size="{ width: 50, height: 30 }" :wrapper-class="wrapperClass"
    :debug="false" @select="handleSelect"
    @drag-end="handleDragEnd" @resize-end="handleResizeEnd">
    <div class="control-content" :class="{ 'has-resize-handles': isPrimarySelected }">
      <!-- 根据控件类型显示不同的内容 -->
      <div v-if="control.type === 'radial'" class="text-center">
        <div class="font-semibold text-green-700">{{ control.style?.centerLabel || control.label }}</div>
        <div class="text-xs text-green-500">{{ control.buttons?.length || 0 }} 个按钮</div>
      </div>

      <span v-else class="pointer-events-none">{{ control.label }}</span>

      <!-- 缩放手柄 - 只在选中时显示，使用更精确的定位 -->
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
import { computed } from 'vue';
import type { Control } from '../types';
import InteractWrapper from './InteractWrapper.vue';

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

// 计算样式类
const wrapperClass = computed(() => {
  const classes = [
    'control-renderer',
    'absolute',
    'border',
    'border-dashed',
    'flex',
    'items-center',
    'justify-center',
    'text-sm',
    'select-none'
  ];

  // 根据条件添加类名
  if (props.isSelected) {
    classes.push('ring-2', 'ring-red-500', 'ring-inset');
    // 🔧 选中时提升层级，但仍在组控件之上
    classes.push('z-20');
    // 只有当没有resize handles时才显示resize cursor
    if (!props.isPrimarySelected) {
      classes.push('cursor-move');
    }
  } else {
    classes.push('cursor-move');
    // 🔧 普通控件的默认层级应该在组控件之上
    classes.push('z-10');
  }

  classes.push('touch-none');

  if (props.control.type !== 'radial') {
    classes.push('border-blue-400');
  } else {
    classes.push('border-green-400', 'bg-green-50', 'rounded-full');
  }

  return classes;
});



// 事件处理
function handleSelect(id: string) {
  console.log('🎯 选择控件:', id);
  emit('select', id);
}

// 修复事件处理函数签名，匹配 InteractWrapper 发送的数据格式
function handleDragEnd({ id, rect, event }: { id: string; rect: any; event: any }) {
  console.log(`📋 [${id}] 拖拽结束:`, { id, rect });

  emit('update-geometry', {
    id,
    newRect: rect,
    isDrag: true
  });
}

function handleResizeEnd({ id, rect, event }: { id: string; rect: any; event: any }) {
  console.log(`📐 [${id}] 缩放结束:`, { id, rect });
  emit('update-geometry', {
    id,
    newRect: rect,
    isDrag: false
  });
}
</script>

<style scoped>
.control-renderer {
  position: relative;
}

.control-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 默认显示move cursor */
  cursor: move;
}

/* 当有resize handles时，主体区域保持move cursor */
.control-content.has-resize-handles {
  cursor: move;
}

.resize-handles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
}

.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #3b82f6;
  border: 1px solid white;
  border-radius: 50%;
  pointer-events: all;
  z-index: 11;
}

.resize-handle:hover {
  background-color: #2563eb;
  transform: scale(1.2);
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

/* 确保resize handles不会被内容遮挡 */
.resize-handle {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
}
</style>