// src/factories/controlFactory.ts
import { v4 as uuidv4 } from 'uuid';
import type { Control } from '../types';

export function createControl(type: Control['type'], dropPosition: { x: number, y: number }): Control {
  const baseControl = {
    id: uuidv4(),
    type,
    label: type,
    // 注意：这里的位置是临时的像素值，后续会被转换为响应式Schema
    position: {
      anchor: 'top-left', // 初始锚点
      left: `${dropPosition.x}px`,
      top: `${dropPosition.y}px`,
    },
    size: {
      width: '120px', // 给予一个默认的初始像素尺寸
      height: '60px',
    },
    style: {},
    mapping: {},
  };

  if (type === 'button') {
    baseControl.size = { width: '80px', height: '80px' };
  }

  // 可以为其他控件类型设置不同的默认值
  // if (type === 'd-pad') { ... }

  return baseControl;
}
