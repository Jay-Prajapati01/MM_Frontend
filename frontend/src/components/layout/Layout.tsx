import { ReactNode } from "react";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-hero transition-colors duration-300">
      <Header />
      <main className="relative">{children}</main>
    </div>
  );
};

export default Layout;