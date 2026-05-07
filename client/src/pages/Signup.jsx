import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Mail, Lock, Building, Eye, EyeOff, UserPlus } from 'lucide-react';

const PASSWORD_STRENGTH_LEVELS = {
  weak: { label: 'Weak', color: '#ef4444' },
  medium: { label: 'Medium', color: '#f59e0b' },
  strong: { label: 'Strong', color: '#10b981' }
};

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    college: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const navigate = useNavigate();

  const checkPasswordStrength = useCallback((password) => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }
    
    let strength = 'weak';
    if (password.length >= 8 && 
        /[A-Z]/.test(password) && 
        /[a-z]/.test(password) && 
        /\d/.test(password) && 
        /[@$!%*?&]/.test(password)) {
      strength = 'strong';
    } else if (password.length >= 6) {
      strength = 'medium';
    }
    
    setPasswordStrength(strength);
  }, []);

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setFormData({...formData, password: value});
    checkPasswordStrength(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate fields
    if (!formData.name || !formData.email || !formData.password || !formData.college) {
      showError('All fields are required');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      showError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      await signup(formData.name, formData.email, formData.password, formData.college);
      showSuccess('Account created successfully!');
      navigate('/profile');
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Signup failed';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-container">
      <div className="auth-card">
        <h1>🎯 Kai</h1>
        <h2>Create Your Account</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special char"
                value={formData.password}
                onChange={handlePasswordChange}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="input-icon-button"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordStrength && (
              <div className="password-strength">
                <div 
                  className="strength-bar" 
                  style={{
                    width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%',
                    backgroundColor: PASSWORD_STRENGTH_LEVELS[passwordStrength].color
                  }}
                />
                <span style={{ color: PASSWORD_STRENGTH_LEVELS[passwordStrength].color }}>
                  {PASSWORD_STRENGTH_LEVELS[passwordStrength].label}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="college">College / University</label>
            <div className="input-wrapper">
              <Building size={18} className="input-icon" />
              <input
                id="college"
                type="text"
                placeholder="IIT Delhi"
                value={formData.college}
                onChange={(e) => setFormData({...formData, college: e.target.value})}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-large">
            <UserPlus size={18} />
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <p>
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
}

