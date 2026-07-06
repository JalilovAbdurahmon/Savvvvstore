import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { Toaster } from "react-hot-toast";
import "./index.css";
import "./i18n/index.js";
import { OrdersNotificationProvider } from "./context/OrdersNotificationContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <OrdersNotificationProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 5000,
              style: {
                background: "#fff",
                color: "#1c1917",
                border: "1px solid #e7e0d4", // sand rangiga mos
                borderRadius: "12px",
                padding: "0",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
              },
            }}
          />
        </AuthProvider>
      </OrdersNotificationProvider>
    </BrowserRouter>
  </React.StrictMode>
);
