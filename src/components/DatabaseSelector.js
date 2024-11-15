import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const DatabaseSelector = ({ onDatabaseSelect }) => {
  const [databases, setDatabases] = useState([
    { id: "13baa70b73c081dfbe0de671b568ea6e", title: "Default Database" }
    // Add more default databases here if needed
  ]);
  const [selectedDatabase, setSelectedDatabase] = useState("");

  const handleDatabaseChange = (value) => {
    setSelectedDatabase(value);
    onDatabaseSelect(value);
  };

  return (
    <Card className="w-96 absolute top-4 left-4 z-10">
      <CardHeader className="p-4">
        <h3 className="text-lg font-semibold">Select Database</h3>
      </CardHeader>
      <CardContent className="p-4">
        <Select value={selectedDatabase} onValueChange={handleDatabaseChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a database..." />
          </SelectTrigger>
          <SelectContent>
            {databases.map((db) => (
              <SelectItem key={db.id} value={db.id}>
                {db.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};

export default DatabaseSelector;