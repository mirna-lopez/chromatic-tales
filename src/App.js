import { useState, useRef } from "react";
import "./App.css";

const GENRES = ["Fantasy", "Noir", "Romance", "Horror", "Sci-fi"];

function isValidHex(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a2e" : "#f5f0e8";
}

export default function App() {
  const [hexInput, setHexInput] = useState("");
  const [palette, setPalette] = useState([]);
  const [hexError, setHexError] = useState("");
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [view, setView] = useState("builder");
  const [genre, setGenre] = useState("Fantasy");
  const [howItWorksOpen, setHowItWorksOpen] = useState(true);
  const inputRef = useRef(null);

  function normalizeHex(val) {
    val = val.trim();
    if (val && !val.startsWith("#")) val = "#" + val;
    return val;
  }

  function handleAddColor() {
    const normalized = normalizeHex(hexInput);
    if (!isValidHex(normalized)) {
      setHexError("Invalid hex code. Try #RRGGBB format (e.g. #A3C4BC).");
      return;
    }
    if (palette.length >= 5) {
      setHexError("Maximum 5 colors allowed.");
      return;
    }
    if (palette.includes(normalized)) {
      setHexError("That color is already in your palette.");
      return;
    }
    setHexError("");
    setPalette([...palette, normalized]);
    setHexInput("");
    inputRef.current?.focus();
  }

  function handleRemoveColor(hex) {
    setPalette(palette.filter((c) => c !== hex));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleAddColor();
  }

  async function handleGenerate() {
    if (palette.length === 0) return;
    setLoading(true);
    setApiError("");
    setStory("");

    const paletteDesc = palette.join(", ");

    const genrePrompts = {
      Fantasy: "Write in a lyrical high-fantasy style with mythical imagery.",
      Noir: "Write in a hard-boiled noir style — rain-soaked streets, moral ambiguity, cynical tone.",
      Romance: "Write in a warm, tender romance style with emotional intimacy.",
      Horror: "Write in a slow-burn horror style — dread, atmosphere, the uncanny.",
      "Sci-fi": "Write in a speculative sci-fi style with technological or cosmic imagery.",
    };

    const prompt = `You are a literary AI. A user has built a color palette: ${paletteDesc}.
${genrePrompts[genre]}
Write a vivid, atmospheric story snippet of exactly 100–150 words inspired by these colors.
The colors should feel embedded in the narrative — not described literally, but felt through mood, setting, and imagery.
Do not mention hex codes. Do not explain the colors. Just tell the story.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.REACT_APP_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      if (data.content && data.content[0]?.text) {
        setStory(data.content[0].text);
      } else {
        setApiError("Something went wrong generating your story. Try again.");
      }
    } catch (err) {
      setApiError("Could not connect to the AI. Check your API key and try again.");
    } finally {
      setLoading(false);
    }
  }

  const PaletteBar = () => (
    <div className="palette-bar" aria-label="Your current palette">
      <span className="palette-bar-label">Your palette:</span>
      {palette.map((hex) => (
        <span key={hex} className="palette-bar-swatch" style={{ background: hex }} title={hex} aria-label={hex} />
      ))}
      {palette.map((hex) => (
        <span key={hex + "-label"} className="palette-bar-hex">{hex}</span>
      ))}
    </div>
  );

  return (
    <div className="app">
      <nav className="nav" role="navigation" aria-label="Main navigation">
        <span className="nav-logo">🎨 Chromatic Tales</span>
        <button
          className="nav-link"
          onClick={() => setView(view === "builder" ? "story" : "builder")}
          aria-label={view === "builder" ? "Switch to Story view" : "Switch to Palette Builder"}
        >
          {view === "builder" ? "Story Output →" : "← Palette Builder"}
        </button>
      </nav>

      {view === "story" && palette.length > 0 && <PaletteBar />}

      {/* PALETTE BUILDER */}
      {view === "builder" && (
        <main className="builder-layout">
          <section className="builder-main" aria-label="Palette Builder">
            <div className="builder-header">
              <h1 className="app-title">Build a palette.<br />Generate a story.</h1>
              <p className="app-tagline">
                Enter hex codes to create your palette, then let AI write a story inspired by your colors.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="hex-input">Add a color</label>
              <div className="input-row">
                <div className="input-wrapper">
                  {hexInput && isValidHex(normalizeHex(hexInput)) && (
                    <span
                      className="input-preview"
                      style={{ background: normalizeHex(hexInput) }}
                      aria-hidden="true"
                    />
                  )}
                  <input
                    id="hex-input"
                    ref={inputRef}
                    className="hex-input"
                    type="text"
                    placeholder="e.g. #A3C4BC"
                    value={hexInput}
                    onChange={(e) => { setHexInput(e.target.value); setHexError(""); }}
                    onKeyDown={handleKeyDown}
                    aria-label="Enter a hex color code"
                    aria-describedby="hex-hint hex-error"
                    maxLength={7}
                  />
                </div>
                <button
                  className="btn-add"
                  onClick={handleAddColor}
                  disabled={palette.length >= 5}
                  aria-label="Add color to palette"
                >
                  + Add Color
                </button>
              </div>
              <p id="hex-hint" className="input-hint">
                Format: #RRGGBB (e.g. #A3C4BC). Must be a valid 6-digit hex code.
              </p>
              <p className="input-ai-note">
                ✦ Generation uses AI and may take a few seconds. Up to 5 colors allowed.
              </p>
              {hexError && (
                <p id="hex-error" className="input-error" role="alert" aria-live="assertive">
                  ⚠ {hexError}
                </p>
              )}
            </div>

            {palette.length > 0 && (
              <div className="palette-section">
                <p className="palette-count">
                  Your Palette ({palette.length} color{palette.length !== 1 ? "s" : ""})
                </p>
                <div className="swatches" role="list" aria-label="Palette colors">
                  {palette.map((hex) => (
                    <div key={hex} className="swatch" style={{ background: hex }} role="listitem">
                      <button
                        className="swatch-remove"
                        onClick={() => handleRemoveColor(hex)}
                        aria-label={`Remove color ${hex}`}
                        style={{ color: getTextColor(hex), borderColor: getTextColor(hex) }}
                      >
                        ×
                      </button>
                      <span className="swatch-label" style={{ color: getTextColor(hex) }}>{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className={`btn-generate ${palette.length === 0 ? "btn-disabled" : ""}`}
              onClick={() => { setView("story"); handleGenerate(); }}
              disabled={palette.length === 0}
              aria-label={
                palette.length === 0
                  ? "Generate Story — add at least one color first"
                  : "Generate Story with current palette"
              }
              title={palette.length === 0 ? "Enter at least one color to generate a story" : ""}
            >
              ✦ Generate Story
            </button>

            {palette.length === 0 && (
              <p className="empty-hint" role="status">
                Add at least one color to generate a story.
              </p>
            )}
          </section>

          <aside className="sidebar" aria-label="How It Works guide">
            <div className="sidebar-header">
              <span className="sidebar-title">How It Works</span>
              <button
                className="sidebar-toggle"
                onClick={() => setHowItWorksOpen(!howItWorksOpen)}
                aria-expanded={howItWorksOpen}
                aria-controls="how-it-works-content"
              >
                {howItWorksOpen ? "collapse ▲" : "expand ▼"}
              </button>
            </div>
            {howItWorksOpen && (
              <div id="how-it-works-content" className="sidebar-content">
                <div className="how-step">
                  <span className="step-num">1</span>
                  <div>
                    <strong>Enter a hex code</strong>
                    <p>Type any valid 6-digit hex like #FF6B6B and click Add Color.</p>
                  </div>
                </div>
                <div className="how-step">
                  <span className="step-num">2</span>
                  <div>
                    <strong>Build your palette</strong>
                    <p>Add up to 5 colors. Each swatch shows its hex code. Click × to remove.</p>
                  </div>
                </div>
                <div className="how-step">
                  <span className="step-num">3</span>
                  <div>
                    <strong>Generate a story</strong>
                    <p>Click Generate Story. An AI-powered snippet appears in seconds. Regenerate anytime!</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </main>
      )}

      {/* STORY OUTPUT */}
      {view === "story" && (
        <main className="story-layout" aria-label="Story Output">
          {palette.length === 0 ? (
            <div className="empty-state" role="status">
              <span className="empty-icon">🎨</span>
              <p>Add at least one color to generate a story.</p>
              <button className="btn-back" onClick={() => setView("builder")}>← Back to Palette Builder</button>
            </div>
          ) : (
            <>
              <div className="genre-section">
                <p className="genre-label">
                  <strong>Choose a story approach</strong>
                  <span className="genre-hint"> — different genres, same palette</span>
                </p>
                <div className="genre-tabs" role="tablist" aria-label="Story genre selector">
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      role="tab"
                      aria-selected={genre === g}
                      className={`genre-tab ${genre === g ? "genre-tab-active" : ""}`}
                      onClick={() => setGenre(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="story-region"
                role="region"
                aria-label="Generated story"
                aria-live="polite"
                aria-busy={loading}
              >
                {loading && (
                  <div className="loading-state">
                    <span className="spinner" aria-hidden="true">⧗</span>
                    <p aria-live="assertive">Generating your story...</p>
                  </div>
                )}
                {!loading && apiError && (
                  <div className="api-error" role="alert">
                    <p>⚠ {apiError}</p>
                    <button className="btn-retry" onClick={handleGenerate}>Try Again</button>
                  </div>
                )}
                {!loading && story && (
                  <div className="story-text">
                    <p className="story-heading">Your Generated Story</p>
                    <p>{story}</p>
                  </div>
                )}
                {!loading && !story && !apiError && (
                  <div className="story-placeholder">
                    <p>Select a genre above and click Generate Story.</p>
                  </div>
                )}
              </div>

              <div className="story-actions">
                <button
                  className="btn-regenerate"
                  onClick={handleGenerate}
                  disabled={loading}
                  aria-label="Regenerate story with current palette"
                >
                  ↻ {story ? "Regenerate Story" : "Generate Story"}
                </button>
                <button
                  className="btn-back"
                  onClick={() => setView("builder")}
                  aria-label="Go back to Palette Builder to edit colors"
                >
                  ← Edit Palette
                </button>
              </div>
            </>
          )}
        </main>
      )}
    </div>
  );
}
