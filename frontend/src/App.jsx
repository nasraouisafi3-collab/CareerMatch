import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  BriefcaseBusiness,
  CalendarDays,
  Upload,
} from "lucide-react";
import "./styles.css";

const API_URL = "http://127.0.0.1:8000/analyze";
const PDF_API_URL = "http://127.0.0.1:8000/extract-pdf";

function App() {
  const [cv, setCv] = useState("");
  const [job, setJob] = useState("");
  const [deadline, setDeadline] = useState("");

  const [cvFileName, setCvFileName] = useState("");
  const [jobFileName, setJobFileName] = useState("");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");

  async function handlePdfUpload(event, type) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      event.target.value = "";
      return;
    }

    setError("");
    setUploading(type);

    if (type === "cv") {
      setCvFileName(`Reading ${file.name}...`);
    } else {
      setJobFileName(`Reading ${file.name}...`);
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(PDF_API_URL, {
        method: "POST",
        body: formData,
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not read the PDF."
        );
      }

      if (!data.text || !data.text.trim()) {
        throw new Error(
          "No readable text was found in this PDF."
        );
      }

      if (type === "cv") {
        setCv(data.text);
        setCvFileName(file.name);
      } else {
        setJob(data.text);
        setJobFileName(file.name);
      }

      setError("");
    } catch (err) {
      console.error("PDF extraction error:", err);

      if (type === "cv") {
        setCvFileName("");
      } else {
        setJobFileName("");
      }

      setError(
        err.message ||
          "Could not extract text from this PDF."
      );
    } finally {
      setUploading("");
      event.target.value = "";
    }
  }

  function handleCvChange(event) {
    setCv(event.target.value);

    if (cvFileName) {
      setCvFileName("");
    }
  }

  function handleJobChange(event) {
    setJob(event.target.value);

    if (jobFileName) {
      setJobFileName("");
    }
  }

  const canAnalyze = cv.trim() && job.trim();

  async function handleAnalyze() {
    if (!canAnalyze || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cv_text: cv,
          job_description: job,
          deadline: deadline || null,
        }),
      });

      if (!response.ok) {
        let message = `Server error: ${response.status}`;

        try {
          const data = await response.json();

          if (data.detail) {
            message = data.detail;
          }
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const data = await response.json();

      setResult(data);
    } catch (err) {
      console.error("Analysis error:", err);

      setError(
        err.message ||
          "We couldn't analyze your application."
      );
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <main className="app">
        <nav className="nav">
          <div className="wordmark">CareerMatch</div>

          <button
            className="back-button"
            onClick={() => setResult(null)}
          >
            <ArrowLeft size={17} />
            New analysis
          </button>
        </nav>

        <section className="results">
          <div className="hero-kicker">
            <span>03</span>
            <span>YOUR ANALYSIS</span>
          </div>

          <div className="score-section">
            <div>
              <p className="result-label">
                CV × JOB ALIGNMENT
              </p>

              <div className="score">
                {result.match_score}
                <span>/100</span>
              </div>

              <p className="score-note">
                CV-to-job alignment, not hiring probability.
              </p>
            </div>

            <div className="score-summary">
              <p>{result.summary}</p>
            </div>
          </div>

          <section className="result-section">
            <div className="result-section-title">
              <span>04</span>
              <h2>What you bring.</h2>
            </div>

            <div className="result-list">
              {result.matched?.length > 0 ? (
                result.matched.map((item, index) => (
                  <article
                    className="result-item matched"
                    key={index}
                  >
                    <div className="item-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                      <h3>{item.skill}</h3>
                      <p>{item.evidence}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-result">
                  No directly supported matches were
                  identified.
                </p>
              )}
            </div>
          </section>

          <section className="result-section">
            <div className="result-section-title">
              <span>05</span>
              <h2>What's missing.</h2>
            </div>

            <div className="result-list">
              {result.missing?.length > 0 ? (
                result.missing.map((item, index) => (
                  <article
                    className="result-item missing"
                    key={index}
                  >
                    <div className="item-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                      <h3>{item.skill}</h3>
                      <p>{item.reason}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-result">
                  No major missing requirements were
                  identified.
                </p>
              )}
            </div>
          </section>

          {result.weak?.length > 0 && (
            <section className="result-section">
              <div className="result-section-title">
                <span>06</span>
                <h2>Where the evidence is weak.</h2>
              </div>

              <div className="result-list">
                {result.weak.map((item, index) => (
                  <article
                    className="result-item weak"
                    key={index}
                  >
                    <div className="item-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                      <h3>{item.skill}</h3>
                      <p>{item.evidence}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {result.roadmap?.length > 0 && (
            <section className="result-section roadmap-section">
              <div className="result-section-title">
                <span>07</span>
                <h2>What you can still improve.</h2>
              </div>

              <div className="roadmap">
                {result.roadmap.map((item, index) => (
                  <article
                    className="roadmap-item"
                    key={index}
                  >
                    <div className="roadmap-days">
                      {item.days}
                    </div>

                    <div>
                      <h3>{item.skill}</h3>
                      <p>{item.goal}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {result.cv_recommendations?.length > 0 && (
            <section className="result-section">
              <div className="result-section-title">
                <span>08</span>
                <h2>Before you apply.</h2>
              </div>

              <div className="recommendations">
                {result.cv_recommendations.map(
                  (item, index) => (
                    <div
                      className="recommendation"
                      key={index}
                    >
                      <span>→</span>
                      <p>{item}</p>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {result.cover_letter && (
            <section className="result-section cover-letter-section">
              <div className="result-section-title">
                <span>09</span>
                <h2>Your starting point.</h2>
              </div>

              <div className="cover-letter">
                <p>{result.cover_letter}</p>
              </div>
            </section>
          )}
        </section>

        <footer>
          <span>CAREERMATCH</span>
          <span>CV × OPPORTUNITY × ACTION</span>
        </footer>
      </main>
    );
  }

  return (
    <main className="app">
      <nav className="nav">
        <div className="wordmark">CareerMatch</div>

        <div className="nav-right">
          <span className="nav-note">
            Understand the opportunity.
          </span>

          <span className="status-dot" />
        </div>
      </nav>

      <section className="hero">
        <div className="hero-kicker">
          <span>01</span>
          <span>CAREER ANALYSIS</span>
        </div>

        <h1>
          Does your CV
          <br />
          <span>match the job?</span>
        </h1>

        <p className="hero-description">
          CareerMatch compares your actual experience
          with a real job opportunity, shows the
          evidence, identifies what's missing, and tells
          you what you can realistically improve.
        </p>
      </section>

      <section className="workspace">
        <div className="input-header">
          <div>
            <span className="section-number">02</span>
            <h2>Bring the opportunity.</h2>
          </div>

          <span className="input-hint">
            Your information stays yours.
          </span>
        </div>

        <div className="input-grid">
          {/* CV */}
          <div className="editor-card">
            <div className="editor-top">
              <div className="editor-label">
                <FileText
                  size={18}
                  strokeWidth={1.8}
                />

                <span>YOUR CV</span>
              </div>

              <span className="required">
                REQUIRED
              </span>
            </div>

            <textarea
              value={cv}
              onChange={handleCvChange}
              placeholder="Paste your CV here..."
            />

            <div className="editor-bottom">
              <div className="editor-meta">
                <div className="character-count">
                  {cv.length} characters
                </div>

                {cvFileName && (
                  <div className="uploaded-file">
                    {uploading === "cv" ? "⏳ " : "✓ "}
                    {cvFileName}
                  </div>
                )}
              </div>

              <label className="upload-button">
                <Upload size={15} />

                <span>
                  {uploading === "cv"
                    ? "Reading..."
                    : "Upload PDF"}
                </span>

                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(event) =>
                    handlePdfUpload(event, "cv")
                  }
                  hidden
                />
              </label>
            </div>
          </div>

          {/* JOB */}
          <div className="editor-card">
            <div className="editor-top">
              <div className="editor-label">
                <BriefcaseBusiness
                  size={18}
                  strokeWidth={1.8}
                />

                <span>JOB OPPORTUNITY</span>
              </div>

              <span className="required">
                REQUIRED
              </span>
            </div>

            <textarea
              value={job}
              onChange={handleJobChange}
              placeholder="Paste the job description here..."
            />

            <div className="editor-bottom">
              <div className="editor-meta">
                <div className="character-count">
                  {job.length} characters
                </div>

                {jobFileName && (
                  <div className="uploaded-file">
                    {uploading === "job" ? "⏳ " : "✓ "}
                    {jobFileName}
                  </div>
                )}
              </div>

              <label className="upload-button">
                <Upload size={15} />

                <span>
                  {uploading === "job"
                    ? "Reading..."
                    : "Upload PDF"}
                </span>

                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(event) =>
                    handlePdfUpload(event, "job")
                  }
                  hidden
                />
              </label>
            </div>
          </div>
        </div>

        <div className="deadline-row">
          <div className="deadline-label">
            <CalendarDays
              size={18}
              strokeWidth={1.8}
            />

            <div>
              <strong>Application deadline</strong>

              <span>
                Optional — used for your realistic
                improvement roadmap.
              </span>
            </div>
          </div>

          <input
            type="date"
            value={deadline}
            onChange={(e) =>
              setDeadline(e.target.value)
            }
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="analyze-area">
          {loading && (
            <div className="analysis-status">
              <span className="status-pulse" />

              <span>
                Comparing your CV with the opportunity...
              </span>
            </div>
          )}

          <button
            className={`analyze-button ${
              !canAnalyze || loading ? "disabled" : ""
            }`}
            disabled={!canAnalyze || loading}
            onClick={handleAnalyze}
          >
            <span>
              {loading
                ? "Analyzing your match..."
                : "Analyze my match"}
            </span>

            {!loading && <ArrowRight size={21} />}
          </button>
        </div>
      </section>

      <footer>
        <span>CAREERMATCH</span>
        <span>CV × OPPORTUNITY × ACTION</span>
      </footer>
    </main>
  );
}

export default App;