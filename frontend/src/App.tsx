import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./lib/AuthProvider";
import { AgentHomePage } from "./pages/AgentHomePage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { CustomerChatPage } from "./pages/CustomerChatPage";

function RootRoute() {
  const { session } = useAuth();
  const isAgentSignedIn = Boolean(session?.access_token);

  // If customer (not logged in), show customer chat window directly
  // If agent is signed in, show the landing overview / control center
  if (!isAgentSignedIn) {
    return <CustomerChatPage />;
  }
  return <HomePage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/overview" element={<HomePage />} />
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
