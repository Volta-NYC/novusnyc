import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interview Booking",
  description: "Schedule or manage an interview with Novus NYC.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function BookingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
