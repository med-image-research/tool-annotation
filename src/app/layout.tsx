import type { Metadata } from 'next';
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-sans',
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ViX-Ray Verifier · Công cụ kiểm duyệt Bounding Box X-quang Ngực',
  description:
    'Công cụ giúp bác sĩ chẩn đoán hình ảnh rà soát, căn chỉnh và xác thực bounding box theo từng reference finding.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${jetbrainsMono.variable} h-full antialiased light`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] font-sans selection:bg-sky-500/25">
        {children}
      </body>
    </html>
  );
}
