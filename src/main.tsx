import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import miCarritoLogo from "./assets/mi-carrit-logo.png";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const ensureFavicon = (href: string) => {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = href;
};

ensureFavicon(miCarritoLogo);

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
