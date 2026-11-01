import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./lib/AuthProvider";
import { AgentHomePage } from "./pages/AgentHomePage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { CustomerChatPage } from "./pages/CustomerChatPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/customer" element={<CustomerChatPage />} />
          <Route path="/chat" element={<CustomerChatPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/agent"
            element={
              <ProtectedRoute>
                <AgentHomePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
