import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Simple Home Page
const Home: React.FC = () => (
  <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
    <h1 style={{ fontSize: '3em', marginBottom: '20px' }}>🚀 Fazner AI Platform</h1>
    <p style={{ fontSize: '1.5em', color: '#666' }}>AI-Powered Development Platform</p>
    <div style={{ marginTop: '40px' }}>
      <a href="/login" style={{ 
        background: '#007bff', 
        color: 'white', 
        padding: '15px 30px', 
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '1.2em',
        margin: '10px'
      }}>Login</a>
      <a href="/register" style={{ 
        background: '#28a745', 
        color: 'white', 
        padding: '15px 30px', 
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '1.2em',
        margin: '10px'
      }}>Register</a>
    </div>
  </div>
);

// Simple Login Page
const Login: React.FC = () => (
  <div style={{ 
    maxWidth: '400px', 
    margin: '100px auto', 
    padding: '40px',
    border: '1px solid #ddd',
    borderRadius: '10px',
    fontFamily: 'system-ui'
  }}>
    <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>🔐 Login</h2>
    <form>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
        <input type="email" placeholder="Enter your email" style={{ 
          width: '100%', 
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          fontSize: '16px'
        }} />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
        <input type="password" placeholder="Enter your password" style={{ 
          width: '100%', 
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          fontSize: '16px'
        }} />
      </div>
      <button type="submit" style={{ 
        width: '100%', 
        padding: '15px',
        background: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        fontSize: '16px',
        cursor: 'pointer'
      }}>Login</button>
    </form>
    <p style={{ textAlign: 'center', marginTop: '20px' }}>
      Don't have an account? <a href="/register">Register</a>
    </p>
  </div>
);

// Simple Register Page
const Register: React.FC = () => (
  <div style={{ 
    maxWidth: '400px', 
    margin: '100px auto', 
    padding: '40px',
    border: '1px solid #ddd',
    borderRadius: '10px',
    fontFamily: 'system-ui'
  }}>
    <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>📝 Register</h2>
    <form>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Name</label>
        <input type="text" placeholder="Enter your name" style={{ 
          width: '100%', 
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          fontSize: '16px'
        }} />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
        <input type="email" placeholder="Enter your email" style={{ 
          width: '100%', 
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          fontSize: '16px'
        }} />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
        <input type="password" placeholder="Create a password" style={{ 
          width: '100%', 
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          fontSize: '16px'
        }} />
      </div>
      <button type="submit" style={{ 
        width: '100%', 
        padding: '15px',
        background: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        fontSize: '16px',
        cursor: 'pointer'
      }}>Create Account</button>
    </form>
    <p style={{ textAlign: 'center', marginTop: '20px' }}>
      Already have an account? <a href="/login">Login</a>
    </p>
  </div>
);

// Simple Dashboard
const Dashboard: React.FC = () => (
  <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
    <h1>📊 Dashboard</h1>
    <p style={{ color: '#666' }}>Welcome to Fazner AI Platform!</p>
    
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px',
      marginTop: '30px'
    }}>
      <div style={{ 
        padding: '30px', 
        background: 'white', 
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3>🤖 AI Chat</h3>
        <p style={{ color: '#666' }}>Start a conversation with AI</p>
        <button style={{ 
          marginTop: '15px',
          padding: '10px 20px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>Open Chat</button>
      </div>
      
      <div style={{ 
        padding: '30px', 
        background: 'white', 
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3>📁 Projects</h3>
        <p style={{ color: '#666' }}>Manage your projects</p>
        <button style={{ 
          marginTop: '15px',
          padding: '10px 20px',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>View Projects</button>
      </div>
      
      <div style={{ 
        padding: '30px', 
        background: 'white', 
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3>⚙️ Settings</h3>
        <p style={{ color: '#666' }}>Configure your account</p>
        <button style={{ 
          marginTop: '15px',
          padding: '10px 20px',
          background: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>Open Settings</button>
      </div>
    </div>
  </div>
);

// Simple Not Found
const NotFound: React.FC = () => (
  <div style={{ 
    textAlign: 'center', 
    padding: '100px 20px',
    fontFamily: 'system-ui'
  }}>
    <h1 style={{ fontSize: '5em', margin: '0' }}>404</h1>
    <p style={{ fontSize: '1.5em', color: '#666' }}>Page Not Found</p>
    <a href="/" style={{ 
      display: 'inline-block',
      marginTop: '30px',
      padding: '15px 30px',
      background: '#007bff',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '5px'
    }}>Go Home</a>
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;