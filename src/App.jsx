import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/manager/Dashboard'
import RecordDelivery from './pages/manager/RecordDelivery'
import Members from './pages/manager/Members'
import MemberDetail from './pages/manager/MemberDetail'
import Lots from './pages/manager/Lots'
import Sales from './pages/manager/Sales'
import ShareLotMoney from './pages/manager/ShareLotMoney'
import Payments from './pages/manager/Payments'
import BuyerRequests from './pages/manager/BuyerRequests'
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/record-delivery" element={<RecordDelivery />} />
          <Route path="/members" element={<Members />} />
          <Route path="/members/:id" element={<MemberDetail />} />
          <Route path="/lots" element={<Lots />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/share" element={<ShareLotMoney />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/buyer-requests" element={<BuyerRequests />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/settings" element={<Settings />} />
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
