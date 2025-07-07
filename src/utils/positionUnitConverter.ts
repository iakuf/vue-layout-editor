// 单位转换工具
export function pxToVW(px: number, total: number) {
  return `${(px / total * 100).toFixed(2)}vw`;
}
export function pxToVH(px: number, total: number) {
  return `${(px / total * 100).toFixed(2)}vh`;
}
export function pxToPercent(px: number, total: number) {
  return `${(px / total * 100).toFixed(2)}%`;
}

import type { Layout, Control } from '../types';

// 解析响应式单位为px
export function parseResponsiveValue(val: string, parentWidth: number, parentHeight: number, isY = false): number {
  if (typeof val !== 'string') return 0;
  if (val.endsWith('vw')) {
    return parseFloat(val) / 100 * parentWidth;
  }
  if (val.endsWith('vh')) {
    return parseFloat(val) / 100 * parentHeight;
  }
  if (val.endsWith('%')) {
    // isY 表示top/height用parentHeight，否则用parentWidth
    return parseFloat(val) / 100 * (isY ? parentHeight : parentWidth);
  }
  return parseFloat(val); // px 或数字
}

// 递归转换所有控件的position/size为响应式单位
export function convertLayoutToResponsiveUnits(layout: Layout, canvasRect: DOMRect): Layout {
  // 深拷贝，避免污染原始数据
  const newLayout: Layout = JSON.parse(JSON.stringify(layout));
  
  console.log('🔧 开始导出单位转换:', {
    画布尺寸: { width: canvasRect.width, height: canvasRect.height },
    总控件数: Object.values(layout.controlSets).flat().length
  });

  function convertControl(control: Control, parentRect: DOMRect | null) {
    // 判断类型和层级
    if (control.type === 'group' && parentRect === null) {
      // group顶层控件，canvas为父
      const left = typeof control.position.left === 'string' ? parseFloat(control.position.left) : 0;
      const top = typeof control.position.top === 'string' ? parseFloat(control.position.top) : 0;
      
      // 🔧 先保存原始像素尺寸，用于子控件计算
      const originalWidth = control.size && typeof control.size.width === 'string' ? parseFloat(control.size.width) : 0;
      const originalHeight = control.size && typeof control.size.height === 'string' ? parseFloat(control.size.height) : 0;
      
      console.log('🔧 转换顶层组控件:', {
        id: control.id,
        原始位置_px: { left, top },
        原始尺寸_px: { width: originalWidth, height: originalHeight },
        子控件数: control.controls?.length || 0
      });
      
      // 转换父组的位置和尺寸
      control.position.left = pxToVW(left, canvasRect.width);
      control.position.top = pxToVH(top, canvasRect.height);
      if (control.size) {
        control.size.width = pxToVW(originalWidth, canvasRect.width);
        control.size.height = pxToVH(originalHeight, canvasRect.height);
      }
      
      console.log('🔧 组控件转换后:', {
        id: control.id,
        转换位置: { left: control.position.left, top: control.position.top },
        转换尺寸: { width: control.size?.width, height: control.size?.height }
      });
      
      // 🔧 递归子控件时使用原始像素尺寸
      if (control.controls) {
        const groupRect = {
          width: originalWidth,
          height: originalHeight,
          left: 0, top: 0, right: 0, bottom: 0
        } as DOMRect;
        
        console.log('🔧 处理子控件，组内尺寸:', { width: originalWidth, height: originalHeight });
        control.controls.forEach(child => convertControl(child, groupRect));
      }
    } else if (parentRect) {
      // group内子控件，父group为parentRect
      const left = typeof control.position.left === 'string' ? parseFloat(control.position.left) : 0;
      const top = typeof control.position.top === 'string' ? parseFloat(control.position.top) : 0;
      const width = control.size && typeof control.size.width === 'string' ? parseFloat(control.size.width) : 0;
      const height = control.size && typeof control.size.height === 'string' ? parseFloat(control.size.height) : 0;
      
      console.log('🔧 转换子控件:', {
        id: control.id,
        原始位置_px: { left, top },
        原始尺寸_px: { width, height },
        父组尺寸_px: { width: parentRect.width, height: parentRect.height }
      });
      
      control.position.left = pxToPercent(left, parentRect.width);
      control.position.top = pxToPercent(top, parentRect.height);
      if (control.size) {
        control.size.width = pxToPercent(width, parentRect.width);
        control.size.height = pxToPercent(height, parentRect.height);
      }
      
      console.log('🔧 子控件转换后:', {
        id: control.id,
        转换位置: { left: control.position.left, top: control.position.top },
        转换尺寸: { width: control.size?.width, height: control.size?.height }
      });
      
      // 递归子控件（理论上组内控件不会再有子控件，但兜底）
      if (control.controls) {
        // 🔧 子控件的子控件仍然用相对尺寸计算
        const childOriginalWidth = control.size && typeof control.size.width === 'string' ? parseFloat(control.size.width) : 0;
        const childOriginalHeight = control.size && typeof control.size.height === 'string' ? parseFloat(control.size.height) : 0;
        const groupRect = {
          width: childOriginalWidth,
          height: childOriginalHeight,
          left: 0, top: 0, right: 0, bottom: 0
        } as DOMRect;
        control.controls.forEach(child => convertControl(child, groupRect));
      }
    } else {
      // 普通控件（非group且parentRect为null），用vw/vh
      const left = typeof control.position.left === 'string' ? parseFloat(control.position.left) : 0;
      const top = typeof control.position.top === 'string' ? parseFloat(control.position.top) : 0;
      control.position.left = pxToVW(left, canvasRect.width);
      control.position.top = pxToVH(top, canvasRect.height);
      if (control.size) {
        const width = typeof control.size.width === 'string' ? parseFloat(control.size.width) : 0;
        const height = typeof control.size.height === 'string' ? parseFloat(control.size.height) : 0;
        control.size.width = pxToVW(width, canvasRect.width);
        control.size.height = pxToVH(height, canvasRect.height);
      }
      // 递归子控件（理论上普通控件不会有controls，但兜底）
      if (control.controls) {
        control.controls.forEach(child => convertControl(child, null));
      }
    }
  }

  // 遍历所有控件集
  Object.values(newLayout.controlSets).forEach(controlArr => {
    controlArr.forEach(control => convertControl(control, null));
  });

  return newLayout;
}

// 递归将layout所有控件的position/size转为px
export function convertLayoutToPxUnits(layout: Layout, canvasRect: DOMRect): Layout {
  const newLayout: Layout = JSON.parse(JSON.stringify(layout));

  function convertControl(control: Control, parentRect: DOMRect | null) {
    // 🔧 对于组控件，先计算子控件的groupRect，再转换自己的单位
    if (control.controls && control.controls.length > 0) {
      // 计算组的像素尺寸（基于当前的响应式单位）
      const groupWidth = control.size && typeof control.size.width === 'string' 
        ? parseResponsiveValue(control.size.width, parentRect ? parentRect.width : canvasRect.width, parentRect ? parentRect.height : canvasRect.height, false) 
        : 0;
      const groupHeight = control.size && typeof control.size.height === 'string' 
        ? parseResponsiveValue(control.size.height, parentRect ? parentRect.width : canvasRect.width, parentRect ? parentRect.height : canvasRect.height, true) 
        : 0;
      
      const groupRect = {
        width: groupWidth,
        height: groupHeight,
        left: 0, top: 0, right: 0, bottom: 0
      } as DOMRect;
      
      // 先递归处理子控件
      control.controls.forEach(child => convertControl(child, groupRect));
    }
    
    // 然后处理当前控件的位置和尺寸
    if (control.position) {
      if (control.position.left && typeof control.position.left === 'string') {
        control.position.left = parseResponsiveValue(control.position.left, parentRect ? parentRect.width : canvasRect.width, parentRect ? parentRect.height : canvasRect.height, false) + 'px';
      }
      if (control.position.top && typeof control.position.top === 'string') {
        control.position.top = parseResponsiveValue(control.position.top, parentRect ? parentRect.width : canvasRect.width, parentRect ? parentRect.height : canvasRect.height, true) + 'px';
      }
    }
    if (control.size) {
      if (control.size.width && typeof control.size.width === 'string') {
        control.size.width = parseResponsiveValue(control.size.width, parentRect ? parentRect.width : canvasRect.width, parentRect ? parentRect.height : canvasRect.height, false) + 'px';
      }
      if (control.size.height && typeof control.size.height === 'string') {
        control.size.height = parseResponsiveValue(control.size.height, parentRect ? parentRect.width : canvasRect.width, parentRect ? parentRect.height : canvasRect.height, true) + 'px';
      }
    }
  }

  Object.values(newLayout.controlSets).forEach(controlArr => {
    controlArr.forEach(control => convertControl(control, null));
  });

  return newLayout;
} 