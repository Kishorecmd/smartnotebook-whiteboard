import { PenPreset, PenGroup } from './PenPreset';
import { BUILT_IN_PENS } from './presets';

/**
 * The single place pens are looked up. Adding a pen later -- including a
 * teacher-defined custom pen -- means calling `register` with another preset;
 * nothing else in the app needs to change.
 */
export class PenRegistry {
  private static pens = new Map<string, PenPreset>();
  private static order: string[] = [];

  public static register(preset: PenPreset): void {
    if (!this.pens.has(preset.id)) {
      this.order.push(preset.id);
    }
    this.pens.set(preset.id, preset);
  }

  public static registerAll(presets: PenPreset[]): void {
    presets.forEach((p) => this.register(p));
  }

  public static get(id: string): PenPreset | undefined {
    return this.pens.get(id);
  }

  /** Falls back to the Fine Pen so a stroke with an unknown id still renders. */
  public static getOrDefault(id: string | undefined | null): PenPreset {
    const found = id ? this.pens.get(id) : undefined;
    return found || this.pens.get('fine') || this.getAll()[0];
  }

  public static getAll(): PenPreset[] {
    return this.order.map((id) => this.pens.get(id)!).filter(Boolean);
  }

  public static getByGroup(group: PenGroup): PenPreset[] {
    return this.getAll().filter((p) => p.group === group);
  }

  /**
   * Child mode narrows the choice to the pens that suit younger pupils, so the
   * selector stays simple rather than presenting twelve options.
   */
  public static getForMode(childMode: boolean): PenPreset[] {
    const all = this.getAll();
    return childMode ? all.filter((p) => p.availableInChildMode) : all;
  }

  public static has(id: string): boolean {
    return this.pens.has(id);
  }
}

PenRegistry.registerAll(BUILT_IN_PENS);
