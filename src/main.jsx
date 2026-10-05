import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="landing-page">
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

      <section className="message-panel" aria-labelledby="page-title">
        <div className="message">
          <h1 id="page-title">
            3 tasks a day. Miss one? It moves to tomorrow, no guilt.
          </h1>
          <p>
            For freelancers chasing a goal who wake up without a clear plan.
          </p>
          <button type="button">Start</button>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
