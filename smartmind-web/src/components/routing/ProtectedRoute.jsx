import { Navigate } from 'react-router';
import { authService } from '../../services/authService';

export default function ProtectedRoute({ children }) {
    return authService.getCurrentUser() ? children : <Navigate to="/" replace />;
}