// Type declarations for native-only Capacitor plugins that are not installed
// in the web project. These modules are dynamically imported inside try/catch
// blocks and only resolve at runtime on native platforms (Android/iOS).

declare module '@capacitor-community/safe-area' {
  export enum SystemBarsStyle {
    Light = 'LIGHT',
    Dark = 'DARK',
    Default = 'DEFAULT',
  }

  export const SafeArea: {
    setSystemBarsStyle(options: { style: SystemBarsStyle }): Promise<void>;
    enable(options: {
      config: {
        customColorsForSystemBars: boolean;
        statusBarColor?: string;
        navigationBarColor?: string;
      };
    }): Promise<void>;
    getStatusBarHeight(): Promise<{ statusBarHeight: number }>;
    getSafeAreaInsets(): Promise<{
      insets: { top: number; right: number; bottom: number; left: number };
    }>;
  };
}
