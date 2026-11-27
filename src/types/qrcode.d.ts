declare module 'qrcode' {
  export interface QRCodeModules {
    size: number;
    data: Uint8Array;
    get(row: number, col: number): number;
  }
  export interface QRCodeObject {
    modules: QRCodeModules;
  }
  export function create(
    text: string,
    options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }
  ): QRCodeObject;
  export function toDataURL(text: string, options?: Record<string, unknown>): Promise<string>;
  const QRCode: {
    create: typeof create;
    toDataURL: typeof toDataURL;
  };
  export default QRCode;
}
