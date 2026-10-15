import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Military Job Finder · 현역 신규편입 공고 찾기",
  description: "병역일터 공개 공고를 근거로 현역 산업기능요원 신규편입 개발직을 분류하고 추적합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
