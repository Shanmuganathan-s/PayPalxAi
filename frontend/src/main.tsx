import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("PayPulse could not find the #root element.");
}

createRoot(container).render(<App />);
