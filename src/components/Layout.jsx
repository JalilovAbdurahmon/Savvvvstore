import React from "react";
import Sidebar from "./Sidebar.jsx";

const Layout = ({ children, title, subtitle }) => {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar />
      <main className="flex-1 px-10 py-8 max-w-6xl">
        {(title || subtitle) && (
          <header className="mb-8">
            {title && <h2 className="text-3xl font-serif font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
          </header>
        )}
        {children}
      </main>
    </div>
  );
};

export default Layout;
