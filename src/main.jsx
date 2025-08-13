import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { StoreProvider } from "./state/StoreContextWithDB.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { initErrorLogger } from "./errorLogger.js";
import { Toaster } from "react-hot-toast";

initErrorLogger();

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <StoreProvider>
      <Toaster position="top-right" />
      <App />
    </StoreProvider>
  </ErrorBoundary>
);
