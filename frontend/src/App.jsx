import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TrackerPage from "./pages/TrackerPage";
import GeneratePage from "./pages/GeneratePage";
import ManualEditPage from "./pages/ManualEditPage";
import { ToastProvider } from "./context/ToastContext";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/tracker" replace />} />
              <Route path="/tracker" element={<TrackerPage />} />
              <Route path="/generate" element={<GeneratePage />} />
              <Route path="/edit" element={<ManualEditPage />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
