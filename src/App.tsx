import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import EventsPage from "./pages/EventsPage";
import UsersPage from "./pages/UsersPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./auth/ProtectedRoute";

function App() {
  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Everything below requires an authenticated session. */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
