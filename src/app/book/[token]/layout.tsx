import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interview Invitation",
  description: "Choose an interview time using your private Novus NYC invitation.",
};

export default function InterviewInvitationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
