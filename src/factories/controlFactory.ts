// src/factories/controlFactory.ts
import { v4 as uuidv4 } from 'uuid';
import type { Control, RadialButton } from '../types';

export function createControl(type: Control['type'], dropPosition: { x: number, y: number }): Control {
  const baseControl: Control = {
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

  // 控件组配置
  if (type === 'group') {
    baseControl.size = { width: '200px', height: '150px' };
    baseControl.label = '控件组';
    baseControl.controls = []; // 初始化空的子控件数组
  }

  // 轮盘菜单配置
  if (type === 'radial') {
    baseControl.size = { width: '150px', height: '150px' };
    baseControl.label = '轮盘菜单';
    baseControl.style = {
      centerLabel: '菜单',
      centerBackgroundColor: '#4F46E5',
    };
    // 创建默认的轮盘按钮
    const defaultButtons: RadialButton[] = [
      { label: '选项1', angle: 0 },
      { label: '选项2', angle: 90 },
      { label: '选项3', angle: 180 },
      { label: '选项4', angle: 270 },
    ];
    baseControl.buttons = defaultButtons;
  }

  // 可以为其他控件类型设置不同的默认值
  // if (type === 'd-pad') { ... }

  return baseControl;
}
