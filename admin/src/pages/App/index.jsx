import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from '../HomePage';

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
};

export { App };
export default App;
