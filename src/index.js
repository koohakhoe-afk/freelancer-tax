import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// MUI 기본 스타일 (선택이지만 보통 사용)
import { CssBaseline } from "@mui/material";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>
);
