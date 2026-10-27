import { useState } from 'react'
import './Study.css'

const SUBJECTS = [
  {
    id: 'os',
    name: 'Operating Systems',
    icon: '🖥️',
    totalTopics: 42,
    color: 'cyan',
    units: [
      { name: 'Introduction & Process Management', topics: ['Introduction to OS', 'OS Types & Structure', 'System Calls', 'Process Concept', 'Process States', 'PCB', 'Process Scheduling', 'CPU Scheduling Criteria', 'FCFS', 'SJF', 'Priority Scheduling', 'Round Robin'] },
      { name: 'Synchronization & Deadlocks', topics: ['Critical Section Problem', 'Peterson\'s Solution', 'Mutex Locks', 'Semaphores', 'Classic Sync Problems', 'Monitors', 'Deadlock Characterization', 'Resource Allocation Graph', 'Deadlock Prevention', 'Deadlock Avoidance', 'Banker\'s Algorithm', 'Deadlock Detection & Recovery'] },
      { name: 'Memory Management', topics: ['Memory Hierarchy', 'Contiguous Allocation', 'Paging', 'Page Table Structures', 'TLB', 'Segmentation', 'Virtual Memory Concepts', 'Demand Paging', 'Page Replacement Algorithms', 'Thrashing'] },
      { name: 'File Systems & I/O', topics: ['File Concepts & Access', 'Directory Structure', 'Disk Scheduling', 'RAID', 'File System Implementation', 'I/O Hardware', 'I/O Software Layers', 'Buffering & Caching'] },
    ],
  },
  {
    id: 'ml',
    name: 'Machine Learning',
    icon: '🤖',
    totalTopics: 44,
    color: 'purple',
    units: [
      { name: 'Foundations', topics: ['What is ML?', 'Types of ML', 'Supervised vs Unsupervised', 'Bias-Variance Tradeoff', 'Overfitting & Underfitting', 'Cross-Validation', 'Feature Scaling', 'Feature Selection', 'Data Preprocessing', 'Train/Test Split', 'Evaluation Metrics'] },
      { name: 'Supervised Learning', topics: ['Linear Regression', 'Polynomial Regression', 'Logistic Regression', 'K-Nearest Neighbors', 'Decision Trees', 'Random Forests', 'Support Vector Machines', 'Naive Bayes', 'Gradient Descent', 'Regularization (L1/L2)', 'Ensemble Methods'] },
      { name: 'Unsupervised Learning', topics: ['K-Means Clustering', 'Hierarchical Clustering', 'DBSCAN', 'PCA', 'Association Rules', 'Apriori Algorithm', 'Anomaly Detection', 'Gaussian Mixture Models', 't-SNE'] },
      { name: 'Neural Networks & Deep Learning', topics: ['Perceptron', 'Multi-Layer Perceptron', 'Backpropagation', 'Activation Functions', 'CNN Basics', 'RNN Basics', 'Dropout & Batch Norm', 'Transfer Learning', 'Optimization (Adam, SGD)', 'Hyperparameter Tuning', 'Model Selection', 'Ethics in ML', 'ML Pipeline'] },
    ],
  },
  {
    id: 'sepm',
    name: 'Software Engineering & PM',
    icon: '📋',
    totalTopics: 44,
    color: 'gold',
    units: [
      { name: 'SE Fundamentals', topics: ['Software Engineering Intro', 'Software Process Models', 'Waterfall Model', 'Iterative Model', 'Agile Methodology', 'Scrum Framework', 'Kanban', 'XP Practices', 'Requirements Engineering', 'Functional vs Non-Functional Req', 'Use Case Diagrams'] },
      { name: 'Design & Architecture', topics: ['Software Design Principles', 'Modularity', 'Coupling & Cohesion', 'Design Patterns Intro', 'Creational Patterns', 'Structural Patterns', 'Behavioral Patterns', 'UML Diagrams', 'Class Diagrams', 'Sequence Diagrams', 'Architecture Styles'] },
      { name: 'Testing & Quality', topics: ['Testing Fundamentals', 'Unit Testing', 'Integration Testing', 'System Testing', 'Black Box Testing', 'White Box Testing', 'Code Reviews', 'CI/CD Basics', 'Software Quality Metrics', 'ISO/CMM Standards', 'Technical Debt'] },
      { name: 'Project Management', topics: ['PM Fundamentals', 'Project Planning', 'Estimation Techniques', 'Risk Management', 'Scheduling (Gantt/PERT)', 'Team Management', 'Configuration Management', 'Software Maintenance', 'DevOps Basics', 'Documentation', 'Release Management'] },
    ],
  },
  {
    id: 'mdm',
    name: 'MDM-III Data Engineering',
    icon: '📊',
    totalTopics: 45,
    color: 'green',
    units: [
      { name: 'Data Foundations', topics: ['Data Engineering Intro', 'Data Types & Formats', 'Structured vs Unstructured', 'Data Quality', 'Data Governance', 'Metadata Management', 'Data Lifecycle', 'ETL vs ELT', 'Data Lakes', 'Data Warehouses', 'Data Marts'] },
      { name: 'Data Processing', topics: ['Batch Processing', 'Stream Processing', 'MapReduce', 'Apache Spark Basics', 'Data Pipelines', 'Workflow Orchestration', 'Airflow Basics', 'Data Transformation', 'Data Cleaning', 'Data Integration', 'Schema Design'] },
      { name: 'Storage & Databases', topics: ['Relational Databases Review', 'NoSQL Overview', 'Document Databases', 'Key-Value Stores', 'Column-Family Stores', 'Graph Databases', 'ACID vs BASE', 'CAP Theorem', 'Indexing Strategies', 'Partitioning & Sharding', 'Replication'] },
      { name: 'Analytics & Visualization', topics: ['Data Analysis Fundamentals', 'Statistical Analysis', 'Exploratory Data Analysis', 'Data Visualization Principles', 'Dashboard Design', 'Business Intelligence', 'Reporting Tools', 'Big Data Concepts', 'Cloud Data Services', 'Data Privacy & Ethics', 'ML in Data Engineering', 'Real-time Analytics', 'Data Mesh'] },
    ],
  },
]

const STORAGE_KEY = 'questism_study_data'

function loadStudyData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { completed: {}, mode: 'balanced' }
}

function saveStudyData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export default function StudyPage() {
  const [studyData, setStudyData] = useState(loadStudyData)
  const [expandedSubject, setExpandedSubject] = useState(null)
  const [planMode, setPlanMode] = useState(studyData.mode || 'balanced')

  const completed = studyData.completed || {}

  const toggleTopic = (subjectId, topicName) => {
    const key = `${subjectId}:${topicName}`
    const newCompleted = { ...completed }
    if (newCompleted[key]) {
      delete newCompleted[key]
    } else {
      newCompleted[key] = Date.now()
    }
    const newData = { ...studyData, completed: newCompleted }
    setStudyData(newData)
    saveStudyData(newData)
  }

  const getSubjectStats = (subject) => {
    let done = 0
    subject.units.forEach(unit => {
      unit.topics.forEach(topic => {
        if (completed[`${subject.id}:${topic}`]) done++
      })
    })
    return { done, total: subject.totalTopics, percent: Math.round((done / subject.totalTopics) * 100) }
  }

  const totalCompleted = Object.keys(completed).length
  const totalTopics = 175
  const overallPercent = Math.round((totalCompleted / totalTopics) * 100)

  return (
    <div className="study-page">
      {/* Header */}
      <div className="study-header">
        <div className="study-header__top">
          <h1 className="study-header__title">
            <span className="text-cyan">⟐</span> Study Module
          </h1>
          <span className="badge badge--cyan">{totalCompleted} / {totalTopics}</span>
        </div>
        <p className="study-header__subtitle">
          4 subjects. 20 units. 175 topics. Systematic mastery.
        </p>
      </div>

      {/* Overall Progress */}
      <div className="study-progress glass-panel">
        <div className="study-progress__header">
          <span className="hud-label">Overall Completion</span>
          <span className="study-progress__percent">{overallPercent}%</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-bar__fill ${overallPercent === 100 ? 'progress-bar__fill--gold' : 'progress-bar__fill--cyan'}`}
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>


      {/* Subject Cards */}
      <div className="study-subjects">
        {SUBJECTS.map(subject => {
          const stats = getSubjectStats(subject)
          const isExpanded = expandedSubject === subject.id

          return (
            <div key={subject.id} className={`study-subject glass-panel study-subject--${subject.color}`}>
              <button
                className="study-subject__header"
                onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                id={`study-subject-${subject.id}`}
              >
                <div className="study-subject__header-left">
                  <span className="study-subject__icon">{subject.icon}</span>
                  <div>
                    <h3 className="study-subject__name">{subject.name}</h3>
                    <span className="study-subject__count">{stats.done}/{stats.total} topics</span>
                  </div>
                </div>
                <div className="study-subject__header-right">
                  <span className={`study-subject__percent ${stats.percent === 100 ? 'text-gold' : ''}`}>
                    {stats.percent}%
                  </span>
                  <span className={`study-subject__arrow ${isExpanded ? 'study-subject__arrow--open' : ''}`}>
                    ▸
                  </span>
                </div>
              </button>

              <div className="progress-bar" style={{ margin: '0 20px 16px' }}>
                <div
                  className={`progress-bar__fill progress-bar__fill--${subject.color}`}
                  style={{ width: `${stats.percent}%` }}
                />
              </div>

              {isExpanded && (
                <div className="study-subject__units animate-fade-in">
                  {subject.units.map((unit, ui) => (
                    <div key={ui} className="study-unit">
                      <h4 className="study-unit__name">Unit {ui + 1}: {unit.name}</h4>
                      <div className="study-unit__topics">
                        {unit.topics.map(topic => {
                          const isDone = completed[`${subject.id}:${topic}`]
                          return (
                            <button
                              key={topic}
                              className={`study-topic ${isDone ? 'study-topic--done' : ''}`}
                              onClick={() => toggleTopic(subject.id, topic)}
                            >
                              <span className={`care-item__check ${isDone ? 'care-item__check--done' : ''}`}>
                                {isDone ? '✓' : ''}
                              </span>
                              <span className="study-topic__name">{topic}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
