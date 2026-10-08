import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ConvexProvider,
  ConvexReactClient,
  useAction,
  useMutation,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { getActionErrorMessage } from "./actionErrors";
import "./styles.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("CONVEX_URL is missing from .env.local");
}

const convex = new ConvexReactClient(convexUrl);
const CLIENT_ID_KEY = "daily-3-tasks-client-id";

function getLocalDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getOrCreateClientId() {
  const existingClientId = window.localStorage.getItem(CLIENT_ID_KEY);

  if (existingClientId) {
    return existingClientId;
  }

  const clientId = window.crypto.randomUUID();
  window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}

function TaskItem({ task, isSaving, onToggle }) {
  return (
    <li className={`task-item${task.completed ? " is-complete" : ""}`}>
      <button
        type="button"
        className="task-toggle"
        aria-label={`${task.completed ? "Mark as not done" : "Mark as done"}: ${task.text}`}
        aria-pressed={task.completed}
        disabled={isSaving}
        onClick={() => onToggle(task)}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 10.5 3 3 7-7" />
        </svg>
      </button>
      <span>{task.text}</span>
    </li>
  );
}

function App() {
  const [clientId] = useState(getOrCreateClientId);
  const [localDate] = useState(getLocalDateKey);
  const [timezoneOffsetMinutes] = useState(() =>
    new Date().getTimezoneOffset(),
  );
  const generateTasks = useAction(api.tasks.generate);
  const openChecklistForDay = useMutation(api.checklists.openForDay);
  const setTaskCompleted = useMutation(api.checklists.setTaskCompleted);
  const [goal, setGoal] = useState("");
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savingTaskIds, setSavingTaskIds] = useState([]);

  useEffect(() => {
    let ignoreResult = false;

    async function loadChecklist() {
      try {
        const savedChecklist = await openChecklistForDay({
          clientId,
          localDate,
          timezoneOffsetMinutes,
        });

        if (!ignoreResult && savedChecklist) {
          setGoal(savedChecklist.goal);
          setTasks(savedChecklist.tasks);
        }
      } catch (requestError) {
        console.error(requestError);

        if (!ignoreResult) {
          setError("I couldn't load your checklist. Refresh and try again.");
        }
      }
    }

    loadChecklist();

    return () => {
      ignoreResult = true;
    };
  }, [clientId, localDate, openChecklistForDay, timezoneOffsetMinutes]);

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
      const checklist = await generateTasks({
        goal: cleanGoal,
        clientId,
        localDate,
      });
      setGoal(checklist.goal);
      setTasks(checklist.tasks);
    } catch (requestError) {
      console.error(requestError);
      setError(getActionErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTaskToggle(task) {
    const completed = !task.completed;
    setError("");
    setSavingTaskIds((current) => [...current, task.id]);
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, completed } : item,
      ),
    );

    try {
      await setTaskCompleted({
        clientId,
        taskId: task.id,
        completed,
      });
    } catch (requestError) {
      console.error(requestError);
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, completed: task.completed }
            : item,
        ),
      );
      setError(getActionErrorMessage(requestError));
    } finally {
      setSavingTaskIds((current) =>
        current.filter((taskId) => taskId !== task.id),
      );
    }
  }

  const mostImportantTasks = tasks.filter(
    (task) => task.section === "important",
  );
  const laterTasks = tasks.filter((task) => task.section === "later");

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
            <h1 id="page-title">What income goal are you working toward?</h1>
            <p>
              If you’re a freelancer, tell me how much you want to earn and
              what kind of work you do. You’ll get three specific tasks to
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
              placeholder="Earn ₹50,000 a month from freelance design"
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

          {tasks.length > 0 ? (
            <section className="results" aria-labelledby="results-title">
              <h2 id="results-title">Most important</h2>
              <ol
                className="task-list important-task-list"
                aria-label="Most important tasks"
              >
                {mostImportantTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isSaving={savingTaskIds.includes(task.id)}
                    onToggle={handleTaskToggle}
                  />
                ))}
              </ol>

              <details className="later-tasks">
                <summary>
                  <span>Later</span>
                  <span className="later-count">
                    {laterTasks.length} {laterTasks.length === 1 ? "task" : "tasks"}
                  </span>
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="m6 8 4 4 4-4" />
                  </svg>
                </summary>
                <ol className="task-list" aria-label="Later tasks">
                  {laterTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isSaving={savingTaskIds.includes(task.id)}
                      onToggle={handleTaskToggle}
                    />
                  ))}
                </ol>
              </details>
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
