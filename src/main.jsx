import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import PasswordResetCallback from "./pages/PasswordResetCallback.jsx";
import { StoreProvider } from "./state/StoreContextWithDB.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { initErrorLogger } from "./errorLogger.js";

initErrorLogger();

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ErrorBoundary>
      <StoreProvider>
        <Routes>
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/auth/callback" element={<PasswordResetCallback />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </StoreProvider>
    </ErrorBoundary>
  </BrowserRouter>
);
