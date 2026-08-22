import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { GroupLayout } from './components/layout/GroupLayout'

// Pages - Auth
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

// Pages - App
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { CreateGroupPage } from './pages/CreateGroupPage'
import { JoinGroupPage } from './pages/JoinGroupPage'

// Pages - Group
import { GroupDashboard } from './pages/group/GroupDashboard'
import { MatchDaysPage } from './pages/group/MatchDaysPage'
import { MatchDayDetail } from './pages/group/MatchDayDetail'
import { StatsFormPage } from './pages/group/StatsFormPage'
import { EditStatsPage } from './pages/group/EditStatsPage'
import { LeaderboardPage } from './pages/group/LeaderboardPage'
import { TeamsPage } from './pages/group/TeamsPage'
import { GroupSettingsPage } from './pages/group/GroupSettingsPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1A1D26',
              color: '#FFFFFF',
              border: '1px solid #2A2D37',
              borderRadius: '0.75rem',
            },
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/join/:code" element={<JoinGroupPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/groups/new" element={<CreateGroupPage />} />
            </Route>

            <Route path="/groups/:groupId" element={<GroupLayout />}>
              <Route index element={<GroupDashboard />} />
              <Route path="match-days" element={<MatchDaysPage />} />
              <Route path="match-days/:matchDayId" element={<MatchDayDetail />} />
              <Route path="match-days/:matchDayId/stats" element={<StatsFormPage />} />
              <Route path="match-days/:matchDayId/stats/:statId/edit" element={<EditStatsPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="teams" element={<TeamsPage />} />
              <Route path="settings" element={<GroupSettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
