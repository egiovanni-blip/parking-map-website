import LoginForm from '@/components/admin/LoginForm'
import AdminAuthBackdrop from '@/components/AdminAuthBackdrop'

export default function LoginPage() {
  return (
    <AdminAuthBackdrop>
      <LoginForm />
    </AdminAuthBackdrop>
  )
}
