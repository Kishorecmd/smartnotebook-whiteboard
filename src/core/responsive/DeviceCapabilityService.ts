export class DeviceCapabilityService {
  public static hasTouch(): boolean {
    return 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0;
  }

  public static isCoarsePointer(): boolean {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      return true;
    }
    return false;
  }

  public static hasHover(): boolean {
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
      return true;
    }
    return false;
  }

  public static getDevicePixelRatio(): number {
    return window.devicePixelRatio || 1;
  }
}
