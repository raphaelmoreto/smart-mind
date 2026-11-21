import { Navigate } from 'react-router';
import { authService } from '../../services/authService.js';

export default function ProtectedRoute({ children }) {
    return authService.getCurrentUser() ? children : <Navigate to="/" replace />;
}