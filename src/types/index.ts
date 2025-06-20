// src/types/index.ts

/**
 * 定义单个控件的基础结构
 */
export interface Control {
    id: string;
    type: 'button' | 'd-pad' | 'joystick' | 'group' | 'radial' | 'slider';
    label: string;
    position: any; // 暂时使用 any，后续会定义更具体的类型
    size: any;     // 暂时使用 any
    style?: Record<string, string>;
    mapping?: any;
    action?: any;
    cooldown?: number;
    controls?: Control[]; // 仅用于 'group' 类型
  }
  
  /**
   * 定义整个布局文件的顶层结构
   */
  export interface Layout {
    layoutId: string;
    name: string;
    version?: string;
    inherits?: string;
    initialSet: string;
    controlSets: Record<string, Control[]>;
  }
  