<script setup lang="ts">
import { computed } from 'vue';
import type { Control } from '../types';
import InteractWrapper from './InteractWrapper.vue';

const props = defineProps<{
  control: Control;
  isSelected: boolean;       // 是否被选中
  isPrimarySelected: boolean; // 是否是主选中对象
  selectedControlIds?: string[]; // 传递所有选中的控件ID
}>();

const emit = defineEmits(['select', 'update-geometry', 'drag-start', 'drag-end']);

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
  
  const conditionalClasses = {
    'ring-2 ring-red-500 ring-inset': props.isSelected,
    'z-10': props.isSelected,
    'cursor-move': !props.isSelected,
    'cursor-nw-resize': props.isSelected,
    'touch-none': true,
    'border-blue-400': props.control.type !== 'radial',
    'border-green-400 bg-green-50 rounded-full': props.control.type === 'radial'
  };
  
  return [...classes, conditionalClasses];
});

// 计算样式对象
const styleObject = computed(() => {
  const style: Record<string, any> = {};
  const { position, size } = props.control;

  const toCssValue = (value: any) => {
    if (typeof value === 'object' && value !== null && 'preferred' in value) {
      const { min = '0px', preferred, max = '100vw' } = value;
      return `clamp(${min}, ${preferred}, ${max})`;
    }
    return value;
  };

  if (size.width) style.width = toCssValue(size.width);
  if (size.height) style.height = toCssValue(size.height);
  if (size.aspectRatio) style.aspectRatio = size.aspectRatio;

  let anchorY, anchorX;
  if (position.anchor === 'center') {
      anchorY = 'middle';
      anchorX = 'center';
  } else {
      const parts = position.anchor.split('-');
      anchorY = parts[0];
      anchorX = parts[1];
  }

  // 清理之前的位置和变换
  let transforms: string[] = [];

  // 清理之前的位置属性
  style.left = '';
  style.right = '';
  style.top = '';
  style.bottom = '';

  // 设置水平位置
  if (anchorX === 'left' && position.left !== undefined) {
    style.left = toCssValue(position.left);
  } else if (anchorX === 'right' && position.right !== undefined) {
    style.right = toCssValue(position.right);
  } else if (anchorX === 'center') {
    style.left = position.left ? toCssValue(position.left) : '50%';
    transforms.push('translateX(-50%)');
  } else {
    // Fallback: 如果没有有效的水平位置，使用left: 0
    style.left = '0px';
  }

  // 设置垂直位置
  if (anchorY === 'top' && position.top !== undefined) {
    style.top = toCssValue(position.top);
  } else if (anchorY === 'bottom' && position.bottom !== undefined) {
    style.bottom = toCssValue(position.bottom);
  } else if (anchorY === 'middle') {
    style.top = position.top ? toCssValue(position.top) : '50%';
    transforms.push('translateY(-50%)');
  } else {
    // Fallback: 如果没有有效的垂直位置，使用top: 0
    style.top = '0px';
  }

  // 应用变换
  if (transforms.length > 0) {
    style.transform = transforms.join(' ');
  }

  if (props.control.style) {
    Object.assign(style, props.control.style);
  }

  return style;
});

// 事件处理
function handleSelect(id: string) {
  console.log('🎯 选择控件:', id);
  emit('select', id);
}

function handleDragStart({ id, event }: { id: string; event: any }) {
  console.log('📋 开始拖拽:', props.control.label);
  emit('drag-start', { controlId: props.control.id, event });
}

function handleDragEnd({ id, dx, dy }: { id: string; dx: number; dy: number }) {
  console.log('📋 拖拽结束:', { id, dx, dy });
  emit('update-geometry', { 
    id, 
    dx, 
    dy, 
    isDrag: true 
  });
}

function handleResizeEnd({ id, rect }: { id: string; rect: any }) {
  console.log('📐 缩放结束:', { id, rect });
  emit('update-geometry', { 
    id, 
    newRect: rect, 
    isDrag: false 
  });
}
</script>

<template>
  <InteractWrapper
    :draggable="true"
    :resizable="isPrimarySelected"
    :element-id="control.id"
    :element-type="control.type"
    :resize-allow-from="'.resize-handles'"
    :resize-min-size="{ width: 50, height: 30 }"
    :wrapper-class="wrapperClass"
    :wrapper-style="styleObject"
    :debug="false"
    @select="handleSelect"
    @drag-start="handleDragStart"
    @drag-end="handleDragEnd"
    @resize-end="handleResizeEnd"
  >
    <div class="control-content">
      <!-- 根据控件类型显示不同的内容 -->
      <div v-if="control.type === 'radial'" class="text-center">
        <div class="font-semibold text-green-700">{{ control.style?.centerLabel || control.label }}</div>
        <div class="text-xs text-green-500">{{ control.buttons?.length || 0 }} 个按钮</div>
      </div>
      
      <span v-else class="pointer-events-none">{{ control.label }}</span>
      
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
  </InteractWrapper>
</template>

<style scoped>
.control-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #3b82f6;
  border: 1px solid white;
  border-radius: 50%;
  pointer-events: all;
  cursor: pointer;
}

.resize-handle:hover {
  background-color: #2563eb;
  transform: scale(1.2);
}

.resize-handle.nw { cursor: nw-resize; }
.resize-handle.ne { cursor: ne-resize; }
.resize-handle.sw { cursor: sw-resize; }
.resize-handle.se { cursor: se-resize; }
.resize-handle.n { cursor: n-resize; }
.resize-handle.s { cursor: s-resize; }
.resize-handle.w { cursor: w-resize; }
.resize-handle.e { cursor: e-resize; }
</style>


