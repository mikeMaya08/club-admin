import { Navigate, Route, Routes } from 'react-router-dom'
import DebugPanel from './components/DebugPanel'
import Guard from './components/Guard'
import Layout from './components/Layout'
import Calendar from './pages/Calendar'
import Courts from './pages/Courts'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Reservations from './pages/Reservations'
import Settings from './pages/Settings'
import Users from './pages/Users'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Guard />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="courts" element={<Courts />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="reservations" element={<Reservations />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DebugPanel app="admin" />
    </>
  )
}
