import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex justify-center items-center h-screen bg-slate-900 text-white">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // Redirect based on their actua role or generic unauthorized
        if (user.role === 'superadmin') return <Navigate to="/superadmin" replace />;
        if (user.role === 'company_admin') return <Navigate to="/admin" replace />;
        if (user.role === 'employee') return <Navigate to="/user" replace />;

        return <div className="p-10 text-center text-red-500">Unauthorized Access</div>;
    }

    return children;
};

export default ProtectedRoute;
