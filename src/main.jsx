import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-[#F7F8F7] px-5">
          <section className="w-full max-w-lg rounded-lg bg-white p-6 thin-border">
            <p className="text-sm font-semibold text-red-700">App error</p>
            <h1 className="mt-2 text-2xl font-bold">Burning Lead Tracker could not render</h1>
            <p className="mt-3 break-words text-sm leading-6 text-gray-600">{this.state.error.message}</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
