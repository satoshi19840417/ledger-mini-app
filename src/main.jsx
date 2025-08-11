import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { StoreProvider } from "./state/StoreContext.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { initErrorLogger } from "./errorLogger.js";

initErrorLogger();

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <StoreProvider>
      <App />
    </StoreProvider>
  </ErrorBoundary>
);
