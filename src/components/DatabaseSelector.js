import React, { useState, useEffect } from 'react';
import { fetchDatabases } from '../utils/notionApi';

const DatabaseSelector = ({ onDatabaseSelect }) => {
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDatabases = async () => {
      try {
        setLoading(true);
        const fetchedDatabases = await fetchDatabases();
        setDatabases(fetchedDatabases);

        // If we have databases, select the first one by default
        if (fetchedDatabases.length > 0) {
          setSelectedDatabase(fetchedDatabases[0].id);
          onDatabaseSelect(fetchedDatabases[0].id);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error loading databases:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDatabases();
  }, [onDatabaseSelect]);

  const handleDatabaseChange = (event) => {
    const value = event.target.value;
    setSelectedDatabase(value);
    onDatabaseSelect(value);
  };

  const styles = {
    container: {
      position: 'absolute',
      top: '16px',
      left: '16px',
      zIndex: 10,
      padding: '12px',
      backgroundColor: 'white',
      borderRadius: '4px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      width: '300px'
    },
    header: {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '8px'
    },
    select: {
      width: '100%',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      backgroundColor: 'white',
      fontSize: '14px'
    },
    error: {
      color: 'red',
      padding: '8px',
      fontSize: '14px'
    }
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error loading databases: {error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>Select Database</div>
      <select
        value={selectedDatabase}
        onChange={handleDatabaseChange}
        disabled={loading}
        style={styles.select}
      >
        {loading ? (
          <option value="">Loading databases...</option>
        ) : (
          databases.map((db) => (
            <option key={db.id} value={db.id}>
              {db.icon ? `${db.icon} ` : ''}{db.title}
            </option>
          ))
        )}
      </select>
    </div>
  );
};

export default DatabaseSelector;