import React from 'react';
import GraphView from './components/GraphView';

function App() {
  const databaseId = process.env.REACT_APP_NOTION_DATABASE_ID || "13baa70b73c081dfbe0de671b568ea6e";

  console.log('Environment:', {
    apiUrl: process.env.REACT_APP_API_URL,
    nodeEnv: process.env.NODE_ENV,
    isDevelopment: process.env.NODE_ENV === 'development'
  });

  return (
    <div className="App">
      <GraphView databaseId={databaseId} />
    </div>
  );
}

export default App;