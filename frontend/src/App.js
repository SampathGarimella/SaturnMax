import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RoleLoginPage from "./pages/RoleLoginPage";
import ConsultantDashboard from "./pages/ConsultantDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import OperationsApplications from "./pages/operations/OperationsApplications";
import OperationsConsultants from "./pages/operations/OperationsConsultants";
import OperationsJobs from "./pages/operations/OperationsJobs";
import OperationsMessages from "./pages/operations/OperationsMessages";
import OperationsReviews from "./pages/operations/OperationsReviews";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardHome from "./pages/DashboardHome";
import BrowseJobs from "./pages/BrowseJobs";
import MyApplications from "./pages/MyApplications";
import Messages from "./pages/Messages";
import MyProfile from "./pages/MyProfile";
import Settings from "./pages/Settings";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            classNames: {
              toast:
                "font-body border border-slate-200 shadow-lg rounded-lg bg-white text-slate-900",
            },
          }}
        />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/consultant-login" element={<RoleLoginPage role="consultant" />} />
          <Route path="/employee-login" element={<RoleLoginPage role="employee" />} />
          <Route
            path="/consultant-dashboard"
            element={
              <ProtectedRoute allowedRoles={["consultant"]}>
                <ConsultantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee-dashboard"
            element={
              <ProtectedRoute allowedRoles={["employee", "admin"]}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="applications" replace />} />
            <Route path="jobs" element={<OperationsJobs />} />
            <Route path="applications" element={<OperationsApplications />} />
            <Route path="messages" element={<OperationsMessages />} />
            <Route path="consultants" element={<OperationsConsultants />} />
            <Route path="reviews" element={<OperationsReviews />} />
          </Route>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["candidate"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="jobs" element={<BrowseJobs />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="messages" element={<Messages />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
