// src/factories/controlFactory.ts
import { v4 as uuidv4 } from 'uuid';
import type { Control, RadialButton } from '../types';

export function createControl(
  type: Control['type'], 
  dropPosition: { x: number, y: number },
  options?: {
    parentType?: 'canvas' | 'group',
    parentRect?: { width: number, height: number }
  }
): Control {
  // 编辑器内部统一使用 px 单位，导出时再转换为响应式单位

  let position: any;
  let size: any;

  // 编辑器内部统一使用 px 单位，导出时再转换为响应式单位
  position = {
    anchor: 'top-left',
    left: `${dropPosition.x}px`,
    top: `${dropPosition.y}px`
  };
  
  if (type === 'group') {
    size = {
      width: '200px',
      height: '150px'
    };
  } else if (type === 'radial') {
    size = {
      width: '120px',
      height: '120px'
    };
  } else {
    size = {
      width: '120px',
      height: '60px',
    };
  }

  const baseControl: Control = {
    id: uuidv4(),
    type,
    label: type,
    position,
    size,
    style: {},
    mapping: {},
  };

  if (type === 'button') {
    baseControl.size = size;
  }

  if (type === 'group') {
    baseControl.label = '控件组';
    baseControl.controls = [];
  }

  if (type === 'radial') {
    baseControl.label = '轮盘菜单';
    baseControl.size = size;
    baseControl.style = {
      centerLabel: '菜单',
      centerBackgroundColor: '#4F46E5',
    };
    const defaultButtons: any[] = [
      { label: '选项1', angle: 0 },
      { label: '选项2', angle: 90 },
      { label: '选项3', angle: 180 },
      { label: '选项4', angle: 270 },
    ];
    baseControl.buttons = defaultButtons;
  }

  return baseControl;
}
