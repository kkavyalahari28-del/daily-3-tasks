import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { getActionErrorMessage } from "./actionErrors";
import "./styles.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("CONVEX_URL is missing from .env.local");
}

const convex = new ConvexReactClient(convexUrl);

function App() {
  const generateTasks = useAction(api.tasks.generate);
  const [goal, setGoal] = useState("");
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanGoal = goal.trim();

    if (!cleanGoal) {
      setError("Write your goal first.");
      return;
    }

    setError("");
    setTasks([]);
    setIsLoading(true);

    try {
      const nextTasks = await generateTasks({ goal: cleanGoal });
      setTasks(nextTasks);
    } catch (requestError) {
      console.error(requestError);
      setError(getActionErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="goal-page">
      <section className="number-panel" aria-hidden="true">
        <div className="number-wrap">
          <span className="big-three">3</span>
          <div className="task-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="work-panel" aria-labelledby="page-title">
        <div className="work-area">
          <div className="intro">
            <h1 id="page-title">What are you working toward?</h1>
            <p>
              Tell me your income goal. You’ll get three specific tasks to
              start today.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="goal">Your goal</label>
            <textarea
              id="goal"
              name="goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="Sign my first creator as a growth operator"
              rows="3"
              maxLength="500"
              aria-describedby={error ? "goal-error" : undefined}
              aria-invalid={Boolean(error)}
              disabled={isLoading}
            />
            <div className="form-footer">
              <span className="goal-count" aria-hidden="true">
                {goal.length}/500
              </span>
              <button type="submit" disabled={isLoading}>
                {isLoading ? "Making your 3 tasks…" : "Give me 3 tasks"}
              </button>
            </div>
          </form>

          {error ? (
            <p className="error-message" id="goal-error" role="alert">
              {error}
            </p>
          ) : null}

          {tasks.length === 3 ? (
            <section className="results" aria-labelledby="results-title">
              <h2 id="results-title">Start here</h2>
              <ol>
                {tasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
);
