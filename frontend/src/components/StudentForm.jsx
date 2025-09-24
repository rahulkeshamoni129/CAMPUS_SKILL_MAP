import React, { useState } from 'react';
import { addStudent, getRecommendations } from '../services/api';

export default function StudentForm({ setRecommendation }) {
  const [student, setStudent] = useState({ name: '', degree: '', cgpa: '', skills: '', interests: '' });

  const handleChange = (e) => {
    setStudent({ ...student, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const studentData = {
      ...student,
      cgpa: parseFloat(student.cgpa),
      skills: student.skills.split(','),
      interests: student.interests.split(',')
    };
    console.log('Submitting studentData:', studentData);
    await addStudent(studentData);
    const res = await getRecommendations(studentData);
    setRecommendation(res.data.recommendation);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px', margin: '20px' }}>
      <input name="name" placeholder="Name" value={student.name} onChange={handleChange} required style={{ padding: '8px' }} />
      <input name="degree" placeholder="Degree" value={student.degree} onChange={handleChange} required style={{ padding: '8px' }} />
      <input name="cgpa" placeholder="CGPA" value={student.cgpa} onChange={handleChange} required style={{ padding: '8px' }} />
      <input name="skills" placeholder="Skills (comma separated)" value={student.skills} onChange={handleChange} required style={{ padding: '8px' }} />
      <input name="interests" placeholder="Interests (comma separated)" value={student.interests} onChange={handleChange} required style={{ padding: '8px' }} />
      <button type="submit" style={{ padding: '10px', backgroundColor: 'blue', color: 'white', border: 'none', cursor: 'pointer' }}>Get Recommendation</button>
    </form>
  );
}