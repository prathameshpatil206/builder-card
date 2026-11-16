
import { useState } from "react";
import "./App.css";

function App() {
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [languages, setLanguages] = useState({});
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchProfile(e) {
    e.preventDefault();

    const user = username.trim();

    if (!user) {
      setError("Please enter a GitHub username");
      return;
    }

    // Reset previous search data
    setLoading(true);
    setError("");
    setProfile(null);
    setRepos([]);
    setLanguages({});
    setEvents([]);

    try {
      // 1. Fetch GitHub profile
      const response = await fetch(
        `https://api.github.com/users/${encodeURIComponent(user)}`
      );

      if (!response.ok) {
        throw new Error("GitHub user not found");
      }

      const profileData = await response.json();
      setProfile(profileData);

      // 2. Fetch repositories
      const repoResponse = await fetch(
        `https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=updated&per_page=100`
      );

      if (!repoResponse.ok) {
        throw new Error("Unable to fetch repositories");
      }

      const repoData = await repoResponse.json();

      // Sort repositories by stars and select top 5
      const topRepos = repoData
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 5);

      setRepos(topRepos);

      // 3. Calculate language distribution
      const languageData = {};

      for (const repo of topRepos) {
        try {
          const langResponse = await fetch(repo.languages_url);

          if (!langResponse.ok) continue;

          const langData = await langResponse.json();

          for (const lang in langData) {
            languageData[lang] =
              (languageData[lang] || 0) + langData[lang];
          }
        } catch {
          // Skip repositories whose language data fails
          continue;
        }
      }

      setLanguages(languageData);

      // 4. Fetch recent public activity
      const eventResponse = await fetch(
        `https://api.github.com/users/${encodeURIComponent(user)}/events/public?per_page=5`
      );

      if (!eventResponse.ok) {
        throw new Error("Unable to fetch recent activity");
      }

      const eventData = await eventResponse.json();
      setEvents(eventData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Calculate total bytes across all languages
  const totalBytes = Object.values(languages).reduce(
    (total, bytes) => total + bytes,
    0
  );

  // Sort languages by usage
  const sortedLanguages = Object.entries(languages).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="app">

      <header className="header">
        <h1>Builder<span>Card.</span></h1>
        <p>Discover the developer behind the code.</p>
      </header>

      {/* Search Section */}
      <form className="search-box" onSubmit={fetchProfile}>
        <input
          type="text"
          placeholder="Enter GitHub username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {loading && (
        <p className="status">Fetching GitHub data...</p>
      )}

      {error && (
        <p className="error">{error}</p>
      )}

      {/* Profile Card */}
      {profile && (
        <main className="profile-card">

          <section className="profile-header">
            <img
              src={profile.avatar_url}
              alt={`${profile.login}'s avatar`}
            />

            <div>
              <h2>{profile.name || profile.login}</h2>
              <p className="username">@{profile.login}</p>
              <p>{profile.bio || "No bio available"}</p>
              {profile.location && (
                <p>📍 {profile.location}</p>
              )}
            </div>
          </section>

          <div className="stats">
            <div>
              <h3>{profile.public_repos}</h3>
              <p>Repositories</p>
            </div>

            <div>
              <h3>{profile.followers}</h3>
              <p>Followers</p>
            </div>

            <div>
              <h3>{profile.following}</h3>
              <p>Following</p>
            </div>
          </div>

          <a
            className="github-link"
            href={profile.html_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View GitHub Profile ↗
          </a>

          {/* Top Repositories */}
          <section className="section">
            <h3>⭐ Top Repositories</h3>

            {repos.length === 0 ? (
              <p className="muted">No public repositories found.</p>
            ) : (
              repos.map(repo => (
                <div className="repo" key={repo.id}>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {repo.name}
                  </a>

                  <p>
                    {repo.description || "No description"}
                  </p>

                  <small>
                    ⭐ {repo.stargazers_count} stars
                    {" · "}
                    {repo.language || "Unknown"}
                  </small>
                </div>
              ))
            )}
          </section>

          {/* Main Languages */}
          <section className="section">
            <h3>💻 Main Languages</h3>

            {sortedLanguages.length === 0 ? (
              <p className="muted">
                No language data available.
              </p>
            ) : (
              sortedLanguages.map(([language, bytes]) => {
                const percentage = totalBytes > 0
                  ? (bytes / totalBytes) * 100
                  : 0;

                return (
                  <div className="language" key={language}>
                    <div className="language-info">
                      <span>{language}</span>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>

                    <div className="progress">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${percentage}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* Recent Activity */}
          <section className="section">
            <h3>⚡ Recent Activity</h3>

            {events.length === 0 ? (
              <p className="muted">
                No recent public activity found.
              </p>
            ) : (
              events.map(event => (
                <div className="activity" key={event.id}>
                  <p>
                    {event.type.replace("Event", "")}
                  </p>

                  <small>{event.repo.name}</small>

                  <small>
                    {new Date(
                      event.created_at
                    ).toLocaleString()}
                  </small>
                </div>
              ))
            )}
          </section>

        </main>
      )}

      <footer>
        Built using React and GitHub REST API
      </footer>

    </div>
  );
}

export default App;
