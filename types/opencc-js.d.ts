declare module 'opencc-js' {
  export function Converter(options?: { from?: string; to?: string }): (text: string) => string
  export const Locale: Record<string, unknown>
  export const ConverterFactory: (...args: unknown[]) => (text: string) => string
  export const HTMLConverter: (...args: unknown[]) => unknown
  export const CustomConverter: (...args: unknown[]) => (text: string) => string
}

