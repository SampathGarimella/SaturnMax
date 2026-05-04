import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RoleLoginPage from "./pages/RoleLoginPage";
import ConsultantDashboard from "./pages/ConsultantDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import OperationsConsultants from "./pages/operations/OperationsConsultants";
import OperationsConvert from "./pages/operations/OperationsConvert";
import OperationsHiringCandidates from "./pages/operations/OperationsHiringCandidates";
import OperationsInterviewReviews from "./pages/operations/OperationsInterviewReviews";
import OperationsJobs from "./pages/operations/OperationsJobs";
import OperationsManualConsultant from "./pages/operations/OperationsManualConsultant";
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
import WorkProfile from "./pages/WorkProfile";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          closeButton
          duration={4000}
          toastOptions={{
            classNames: {
              toast:
                "font-body rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl",
              title: "text-sm font-semibold",
              description: "text-xs text-slate-500",
              success: "border-emerald-200 bg-white text-slate-900",
              error: "border-rose-200 bg-white text-slate-900",
              warning: "border-amber-200 bg-white text-slate-900",
              info: "border-blue-200 bg-white text-slate-900",
              closeButton:
                "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900",
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
            path="/consultant-dashboard/profile"
            element={
              <ProtectedRoute allowedRoles={["consultant"]}>
                <ConsultantDashboard profileOnly />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
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
            <Route index element={<Navigate to="hiring/candidates" replace />} />
            <Route path="jobs" element={<OperationsJobs />} />
            <Route path="applications" element={<Navigate to="/employee-dashboard/hiring/candidates" replace />} />
            <Route path="messages" element={<OperationsMessages />} />
            <Route path="consultants" element={<Navigate to="/employee-dashboard/hiring/consultants" replace />} />
            <Route path="reviews" element={<OperationsReviews />} />
            <Route path="hiring/candidates" element={<OperationsHiringCandidates />} />
            <Route path="hiring/candidates/:applicationId" element={<OperationsHiringCandidates />} />
            <Route path="hiring/interviews" element={<OperationsInterviewReviews />} />
            <Route path="hiring/convert" element={<OperationsConvert />} />
            <Route path="hiring/consultants" element={<OperationsConsultants />} />
            <Route path="hiring/manual-consultant" element={<OperationsManualConsultant />} />
            <Route path="profile" element={<WorkProfile portal="employee" />} />
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
