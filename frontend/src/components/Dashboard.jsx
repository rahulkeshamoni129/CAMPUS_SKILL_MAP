import React, { useState } from 'react';
import StudentForm from './StudentForm';

export default function Dashboard() {
  console.log('Dashboard rendered');
  const [recommendation, setRecommendation] = useState('');

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>Student Placement Guidance Dashboard</h1>
      <StudentForm setRecommendation={setRecommendation} />
      {recommendation && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
          <h2>Personalized Recommendation:</h2>
          <p>{recommendation}</p>
        </div>
      )}
    </div>
  );
}