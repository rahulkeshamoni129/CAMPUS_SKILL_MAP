import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const addStudent = (student) => axios.post(`${API_URL}/students/add`, student);
export const getRecommendations = (student) => axios.post(`${API_URL}/recommendations`, student);
export const getAllStudents = () => axios.get(`${API_URL}/students`);