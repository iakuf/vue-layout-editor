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
  const { parentType = 'canvas', parentRect } = options || {};

  // 工具函数：生成vw/vh单位
  const toVW = (px: number, total: number) => `${(px / total * 100).toFixed(2)}vw`;
  const toVH = (px: number, total: number) => `${(px / total * 100).toFixed(2)}vh`;
  // 工具函数：生成百分比单位
  const toPercent = (px: number, total: number) => `${(px / total * 100).toFixed(2)}%`;

  let position: any;
  let size: any;

  if (type === 'group' && parentType === 'canvas' && parentRect) {
    // 顶层控件组，使用vw/vh单位
    position = {
      anchor: 'top-left',
      left: toVW(dropPosition.x, parentRect.width),
      top: toVH(dropPosition.y, parentRect.height)
    };
    size = {
      width: toVW(200, parentRect.width),
      height: toVH(150, parentRect.height)
    };
  } else if (parentType === 'group' && parentRect) {
    // group内子控件，使用百分比单位
    position = {
      anchor: 'top-left',
      left: toPercent(dropPosition.x, parentRect.width),
      top: toPercent(dropPosition.y, parentRect.height)
    };
    size = {
      width: toPercent(80, parentRect.width),
      height: toPercent(80, parentRect.height)
    };
  } else {
    // 默认像素单位（兜底）
    position = {
      anchor: 'top-left',
      left: `${dropPosition.x}px`,
      top: `${dropPosition.y}px`
    };
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
