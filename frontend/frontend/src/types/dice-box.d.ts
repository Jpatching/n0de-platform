declare module '@3d-dice/dice-box' {
  export interface DiceBoxOptions {
    assetPath?: string;
    theme?: string;
    scale?: number;
    gravity?: number;
    mass?: number;
    friction?: number;
    restitution?: number;
    angularDamping?: number;
    linearDamping?: number;
    spinForce?: number;
    throwForce?: number;
    startingHeight?: number;
    settleTimeout?: number;
    delay?: number;
    sounds?: boolean;
    shadows?: boolean;
    enableShadows?: boolean;
    lights?: boolean;
    desk?: boolean;
    container?: HTMLElement;
  }

  export interface DiceResult {
    value: number;
    sides: number;
    type: string;
    groupId?: number;
    rollId?: string;
  }

  export class DiceBox {
    constructor(container: HTMLElement, options?: DiceBoxOptions);
    init(): Promise<void>;
    roll(notation: string): Promise<DiceResult[]>;
    clear(): void;
  }
}

declare module '@3d-dice/dice-box-threejs' {
  // Add any additional types if needed
} 