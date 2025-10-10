
import ProtectedRoute from '@/components/ProtectedRoute';
import Users from '@/components/tables/users';
import { getUsers } from '@/actions/users';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

export default async function AdminUsersPage() {



  const data = await getUsers();



  return (
    <ProtectedRoute allowedRoles={['staff', 'admin']}>
      <Users user={data} />
    </ProtectedRoute>
  );
}


