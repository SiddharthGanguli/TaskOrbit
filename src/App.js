import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import { AuthProvider, useAuth } from "./context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

// Component to handle GitHub Pages redirect issues
const AppContent = () => {
  const location = useLocation();
  const redirectPath = new URLSearchParams(location.search).get("redirect");

  if (redirectPath) {
    window.history.replaceState({}, document.title, redirectPath);
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router basename={process.env.PUBLIC_URL || "/"}> {/* Dynamically set basename */}
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
