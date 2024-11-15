import React from 'react';
import GraphView from './components/GraphView';

function App() {
  console.log('Environment:', {
    apiUrl: process.env.REACT_APP_API_URL,
    nodeEnv: process.env.NODE_ENV,
    isDevelopment: process.env.NODE_ENV === 'development'
  });

  return (
    <div className="App">
      <GraphView />
    </div>
  );
}

export default App;