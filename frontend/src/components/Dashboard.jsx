import React, { useMemo, useRef, useState } from 'react';
import StudentForm from './StudentForm';
import { Bar, Radar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { parseRecommendationText } from '../utils/llmParser';
import { demandFor, normalizeSkill } from '../data/skillsDemand';
import { matchResourcesForSkill } from '../utils/resourceMatcher';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [recommendation, setRecommendation] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [useLLMSuggestions, setUseLLMSuggestions] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedSkillResources, setSelectedSkillResources] = useState([]);

  const barRef = useRef(null);

  const parsed = useMemo(() => parseRecommendationText(recommendation), [recommendation]);

  const charts = useMemo(() => {
    if (!studentData) return {};
    const userSkillsRaw = (studentData.skills || []).map(s => s.trim()).filter(Boolean);
    const userSkills = Array.from(new Set(userSkillsRaw.map(normalizeSkill)));

    // Prefer LLM-provided missing skills or skillScores when available
    const missingFromLLM = parsed.missingSkills || [];
    const scoreEntries = Object.entries(parsed.skillScores || {});
    // Derive a ranked list from LLM skill scores if present (descending)
    const rankedByScore = scoreEntries
      .sort((a,b) => (b[1] ?? 0) - (a[1] ?? 0))
      .map(([name]) => name);
    const inferredMissing = Object.keys({ Python:1, Java:1, JavaScript:1, React:1, 'Data Analysis':1, 'Machine Learning':1, SQL:1, AWS:1, Docker:1, Kubernetes:1 })
      .filter(s => !userSkills.includes(s));
    const missingPool = useLLMSuggestions
      ? (missingFromLLM.length ? missingFromLLM : rankedByScore)
      : inferredMissing;
    const missingSkills = Array.from(new Set(missingPool.filter(s => s && !userSkills.includes(s)))).slice(0, 6);

    // Bar chart: Values prefer LLM-provided scores, else market demand
    const barLabels = missingSkills;
    const barData = missingSkills.map(s => (parsed.skillScores?.[s] ?? parsed.skillDemand?.[s] ?? demandFor(s)));
    const missingSkillsBar = {
      data: {
        labels: barLabels,
        datasets: [
          {
            label: 'Priority (LLM) or Demand (0-100) — Missing Skills',
            data: barData,
            backgroundColor: 'rgba(255, 99, 132, 0.5)'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' }, tooltip: { enabled: true } },
        scales: { y: { beginAtZero: true, max: 100 } }
      }
    };

    // Radar chart: Prefer LLM-provided current/demand values
    const radarSkills = Array.from(new Set([...userSkills, ...missingSkills])).slice(0, 8);
    const demandScores = radarSkills.map(s => (parsed.skillDemand?.[s] ?? demandFor(s)));
    const possessionScores = radarSkills.map(s => (
      parsed.skillCurrent?.[s] ?? (userSkills.includes(s) ? 100 : 0)
    ));
    const coverageRadar = {
      data: {
        labels: radarSkills,
        datasets: [
          { label: 'Your Coverage (LLM where available)', data: possessionScores, backgroundColor: 'rgba(54, 162, 235, 0.2)', borderColor: 'rgba(54, 162, 235, 1)' },
          { label: 'Demand (LLM or market)', data: demandScores, backgroundColor: 'rgba(255, 206, 86, 0.2)', borderColor: 'rgba(255, 206, 86, 1)' }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { r: { suggestedMin: 0, suggestedMax: 100 } }
      }
    };

    // Doughnut: current vs missing skill count
    const doughnut = {
      data: {
        labels: ['Possessed Skills', 'Missing Skills'],
        datasets: [
          {
            data: [userSkills.length, missingSkills.length],
            backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)']
          }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } } }
    };

    return { missingSkillsBar, coverageRadar, doughnut, missingSkills, userSkills };
  }, [studentData, parsed, useLLMSuggestions]);

  const handleBarClick = (evt) => {
    if (!barRef.current) return;
    const chart = barRef.current;
    const points = chart.getElementsAtEventForMode(evt.native, 'nearest', { intersect: true }, true);
    if (!points || points.length === 0) return;
    const idx = points[0].index;
    const skill = charts.missingSkills[idx];
    if (!skill) return;
    setSelectedSkill(skill);
    const bySkill = parsed.resourcesBySkill?.[skill] || [];
    setSelectedSkillResources(bySkill.length ? bySkill : matchResourcesForSkill(skill, parsed.resources));
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>Student Placement Guidance Dashboard</h1>
      <StudentForm setRecommendation={setRecommendation} onResult={({ studentData, recommendationText }) => {
        setStudentData(studentData);
        setRecommendation(recommendationText);
      }} />

      {recommendation && (
        <div style={{ marginTop: '20px', padding: '16px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', borderRadius: 8 }}>
          <h2>Personalized Recommendation</h2>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '8px 0 16px 0' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={useLLMSuggestions} onChange={(e) => setUseLLMSuggestions(e.target.checked)} />
              Prefer LLM-extracted missing skills (fallback to inferred)
            </label>
          </div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{recommendation}</p>

          {studentData && (
            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: 16 }}>
              {/* Missing Skills Bar */}
              {charts.missingSkillsBar && (
                <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
                  <h3 style={{ marginBottom: 8 }}>Top Missing Skills by Demand</h3>
                  <Bar
                    ref={barRef}
                    data={charts.missingSkillsBar.data}
                    options={charts.missingSkillsBar.options}
                    onClick={handleBarClick}
                  />
                </div>
              )}

              {/* Radar Coverage */}
              {charts.coverageRadar && (
                <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
                  <h3 style={{ marginBottom: 8 }}>Your Coverage vs Market Demand</h3>
                  <Radar data={charts.coverageRadar.data} options={charts.coverageRadar.options} />
                </div>
              )}

              {/* Doughnut */}
              {charts.doughnut && (
                <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
                  <h3 style={{ marginBottom: 8 }}>Skill Coverage Summary</h3>
                  <Doughnut data={charts.doughnut.data} options={charts.doughnut.options} />
                </div>
              )}
            </div>
          )}

          {/* Suggested roles and resources from LLM parsing, if any */}
          {(parsed.roles?.length || parsed.resources?.length || parsed.salaryRange) && (
            <div style={{ marginTop: 16, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {parsed.roles?.length ? (
                <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
                  <h3>Suggested Roles</h3>
                  <ul>
                    {parsed.roles.map(r => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              ) : null}
              {parsed.resources?.length ? (
                <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
                  <h3>What To Read / Learn</h3>
                  <ul>
                    {parsed.resources.map((r, i) => {
                      const text = String(r);
                      const m = text.match(/https?:\/\/\S+/);
                      if (m) {
                        return (
                          <li key={i}>
                            <a href={m[0]} target="_blank" rel="noreferrer">{text.replace(m[0], '').trim() || m[0]}</a>
                          </li>
                        );
                      }
                      return <li key={i}>{text}</li>;
                    })}
                  </ul>
                </div>
              ) : null}
              {parsed.salaryRange ? (
                <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
                  <h3>Salary Range (from LLM)</h3>
                  <p>{parsed.salaryRange}</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Drilldown panel for selected skill */}
          {selectedSkill && (
            <div style={{ marginTop: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
              <h3>Focus: {selectedSkill}</h3>
              <p>Market demand score: {demandFor(selectedSkill)}</p>
              {selectedSkillResources.length > 0 && (
                <>
                  <h4>Targeted Resources</h4>
                  <ul>
                    {selectedSkillResources.map((r, i) => {
                      const text = String(r);
                      const m = text.match(/https?:\/\/\S+/);
                      if (m) {
                        return (
                          <li key={i}>
                            <a href={m[0]} target="_blank" rel="noreferrer">{text.replace(m[0], '').trim() || m[0]}</a>
                          </li>
                        );
                      }
                      return <li key={i}>{text}</li>;
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}