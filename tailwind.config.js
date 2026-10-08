/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // var_dump / GBK 工具代码高亮配色
        'php-orange': '#F97316',
        'php-blue': '#3B82F6',
        'php-green': '#10B981',
        'php-red': '#EF4444',
        'php-purple': '#8B5CF6',
        'php-yellow': '#F59E0B',
        'php-gray': '#6B7280',
        // JSON 格式化工具配色
        'code-orange': '#F97316',
        'code-blue': '#3B82F6',
        'code-green': '#10B981',
        'code-red': '#EF4444',
        'code-purple': '#8B5CF6',
        'code-yellow': '#F59E0B',
        'code-gray': '#6B7280',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
