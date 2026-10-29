import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import ProtectedRoute from './components/ProtectedRoute'
import RequiresInternet from './components/RequiresInternet'
import Login from './pages/Login'
import Dashboard from './pages/manager/Dashboard'
import Deliveries from './pages/manager/Deliveries'
import DeliveryDetail from './pages/manager/DeliveryDetail'
import RecordDelivery from './pages/manager/RecordDelivery'
import Members from './pages/manager/Members'
import MemberDetail from './pages/manager/MemberDetail'
import MemberBatches from './pages/manager/MemberBatches'
import Lots from './pages/manager/Lots'
import LotDetail from './pages/manager/LotDetail'
import Sales from './pages/manager/Sales'
import Payments from './pages/manager/Payments'
import BuyerRequests from './pages/manager/BuyerRequests'
import Disputes from './pages/manager/Disputes'
import Reports from './pages/manager/Reports'
import Ledger from './pages/manager/Ledger'
import Settings from './pages/manager/Settings'
import Home from './pages/public/Home'
import SendRequest from './pages/public/SendRequest'
import RequestStatus from './pages/public/RequestStatus'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/record-delivery" element={<RecordDelivery />} />
          <Route path="/members" element={<Members />} />
          <Route path="/members/:id" element={<MemberDetail />} />
          <Route element={<RequiresInternet />}>
            <Route path="/members/:id/batches" element={<MemberBatches />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/deliveries" element={<Deliveries />} />
            <Route path="/deliveries/:id" element={<DeliveryDetail />} />
            <Route path="/lots" element={<Lots />} />
            <Route path="/lots/:id" element={<LotDetail />} />
            <Route path="/sales" element={<Sales />} />
            {/* Lots are no longer shared: sales pay the members by batch. Old links land on the dashboard. */}
            <Route path="/share" element={<Navigate to="/dashboard" replace />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/buyer-requests" element={<BuyerRequests />} />
            <Route path="/disputes" element={<Disputes />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/request" element={<SendRequest />} />
        <Route path="/status" element={<RequestStatus />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
