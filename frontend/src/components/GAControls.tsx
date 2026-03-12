/* eslint-disable react-hooks/preserve-manual-memoization */
// GA Controls: parameter sliders, run/stop/reset, fitness chart
import { useRef, useCallback, useEffect, useState } from "react";
import { useAppState } from "../data/store";
// import type { Chromosome } from "../data/types";

export function GAControls() {
  const { state, dispatch } = useAppState();
  const stopRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localHistory, setLocalHistory] = useState<number[]>([]);

  // const handleRun = useCallback(async () => {
  //     stopRef.current = false;
  //     dispatch({ type: 'SET_GA_STATUS', payload: 'running' });
  //     dispatch({ type: 'SET_FITNESS_HISTORY', payload: [] });
  //     dispatch({ type: 'SET_CURRENT_GENERATION', payload: 0 });

  //     try {
  //         const result = await runGAAsync(
  //             state.lecturers,
  //             state.courses,
  //             state.rooms,
  //             state.gaConfig,
  //             {
  //                 onGeneration: (gen: number, fitness: number, best: Chromosome) => {
  //                     dispatch({ type: 'SET_CURRENT_GENERATION', payload: gen });
  //                     dispatch({ type: 'SET_BEST_FITNESS', payload: fitness });
  //                     setLocalHistory(prev => [...prev, fitness]);
  //                     // Update timetable periodically
  //                     if (gen % 50 === 0 || fitness >= 1000) {
  //                         dispatch({ type: 'SET_TIMETABLE', payload: best });
  //                     }
  //                 },
  //                 shouldStop: () => stopRef.current,
  //             }
  //         );

  //         dispatch({ type: 'SET_TIMETABLE', payload: result.bestChromosome });
  //         dispatch({ type: 'SET_FITNESS_HISTORY', payload: result.fitnessHistory });
  //         dispatch({ type: 'SET_BEST_FITNESS', payload: result.bestFitness });
  //         dispatch({ type: 'SET_CURRENT_GENERATION', payload: result.generations });
  //         dispatch({ type: 'SET_GA_STATUS', payload: 'completed' });
  //         setLocalHistory(result.fitnessHistory);
  //     } catch (err) {
  //         console.error('GA Error:', err);
  //         dispatch({ type: 'SET_GA_STATUS', payload: 'idle' });
  //     }
  // }, [state.lecturers, state.courses, state.rooms, state.gaConfig, dispatch]);

  //FAKE DATA
  const handleRun = useCallback(async () => {
    stopRef.current = false;

    dispatch({ type: "SET_GA_STATUS", payload: "running" });
    dispatch({ type: "SET_FITNESS_HISTORY", payload: [] });
    dispatch({ type: "SET_CURRENT_GENERATION", payload: 0 });

    const history: number[] = [];
    let fitness = 200;

    for (let gen = 1; gen <= state.gaConfig.maxGenerations; gen++) {
      if (stopRef.current) break;

      await new Promise((r) => setTimeout(r, 20));

      // fake improvement
      fitness += Math.random() * 10;

      history.push(fitness);

      dispatch({ type: "SET_CURRENT_GENERATION", payload: gen });
      dispatch({ type: "SET_BEST_FITNESS", payload: fitness });

      setLocalHistory([...history]);

      // fake timetable
      if (gen % 50 === 0) {
        const newTimetable = state.courses.map((course) => {
          const randomRoom =
            state.rooms[Math.floor(Math.random() * state.rooms.length)];

          const randomSlot =
            state.timeslots[Math.floor(Math.random() * state.timeslots.length)];

          return {
            courseId: course.id,
            lecturerId: course.lecturerId,
            roomId: randomRoom?.id ?? 1,
            timeslotId: randomSlot?.id ?? 1,
          };
        });

        dispatch({
          type: "SET_TIMETABLE",
          payload: newTimetable,
        });
      }
    }

    dispatch({ type: "SET_FITNESS_HISTORY", payload: history });
    dispatch({ type: "SET_GA_STATUS", payload: "completed" });
  }, [state.gaConfig.maxGenerations, dispatch]);

  const handleStop = () => {
    stopRef.current = true;
  };

  const handleReset = () => {
    stopRef.current = true;
    dispatch({ type: "RESET_GA" });
    setLocalHistory([]);
  };

  // Draw fitness chart
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // Use a fixed or parent-relative rect to prevent canvas from squishing to 0
    const parent = canvas.parentElement;
    const rect = parent
      ? parent.getBoundingClientRect()
      : canvas.getBoundingClientRect();

    // Prevent rendering if container is hidden or 0 size
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    // If localHistory exists, prefer it during runs, otherwise use store state
    const history =
      localHistory.length > 0 ? localHistory : state.fitnessHistory;

    // Background (transparent/card color)
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "#e2e8f0"; // Light gray grid
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (h / 5) * i + 20;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();
    }

    if (history.length === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Run the GA to see fitness progress", w / 2, h / 2);
      return;
    }

    const maxFit = Math.max(...history, 1);
    const minFit = Math.min(...history, 0);
    let range = maxFit - minFit;
    if (range === 0) range = maxFit || 1; // Prevent division by zero if all values are equal

    const padding = { top: 20, bottom: 30, left: 40, right: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Gradient fill
    const gradient = ctx.createLinearGradient(
      0,
      padding.top,
      0,
      h - padding.bottom,
    );
    gradient.addColorStop(0, "rgba(31, 92, 169, 0.25)"); // Light blue gradient
    gradient.addColorStop(1, "rgba(31, 92, 169, 0)");

    ctx.beginPath();
    ctx.moveTo(padding.left, h - padding.bottom);
    for (let i = 0; i < history.length; i++) {
      const x = padding.left + (i / Math.max(1, history.length - 1)) * chartW;
      const y = padding.top + chartH - ((history[i] - minFit) / range) * chartH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(padding.left + chartW, h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const x = padding.left + (i / Math.max(1, history.length - 1)) * chartW;
      const y = padding.top + chartH - ((history[i] - minFit) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#1f5ca9"; // Primary blue line
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current point glow
    const historyLen = Math.max(1, history.length - 1);
    const lastX = padding.left + ((history.length - 1) / historyLen) * chartW;
    const lastY =
      padding.top +
      chartH -
      ((history[history.length - 1] - minFit) / range) * chartH;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#1f5ca9";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(31, 92, 169, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = "#64748b";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(maxFit.toFixed(0), padding.left - 5, padding.top + 5);
    ctx.fillText(minFit.toFixed(0), padding.left - 5, h - padding.bottom);
    ctx.textAlign = "center";
    ctx.fillText("Generations", w / 2, h - 5);
  }, [localHistory, state.fitnessHistory]);

  // Redraw whenever history changes or window resizes
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      drawChart();
      // We use RAF to ensure the DOM has painted the container before we check its rect
      animationFrameId = requestAnimationFrame(() => drawChart());
    };

    render();
    window.addEventListener("resize", drawChart);

    return () => {
      window.removeEventListener("resize", drawChart);
      cancelAnimationFrame(animationFrameId);
    };
  }, [drawChart]);

  return (
    <div className="ga-controls">
      <div className="page-header">
        <h2 className="page-title">GA Scheduler</h2>
        <p className="page-description">
          Configure and run the genetic algorithm to generate an optimal
          timetable
        </p>
      </div>

      <div className="ga-layout">
        <div className="ga-params">
          <h3 className="section-title">Parameters</h3>

          <div className="param-group">
            <label className="param-label">
              Population Size
              <span className="param-value">
                {state.gaConfig.populationSize}
              </span>
            </label>
            <input
              type="range"
              min={10}
              max={200}
              value={state.gaConfig.populationSize}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { populationSize: Number(e.target.value) },
                })
              }
              className="slider"
              disabled={state.gaStatus === "running"}
            />
          </div>

          <div className="param-group">
            <label className="param-label">
              Mutation Rate
              <span className="param-value">
                {(state.gaConfig.mutationRate * 100).toFixed(0)}%
              </span>
            </label>
            <input
              type="range"
              min={1}
              max={30}
              value={state.gaConfig.mutationRate * 100}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { mutationRate: Number(e.target.value) / 100 },
                })
              }
              className="slider"
              disabled={state.gaStatus === "running"}
            />
          </div>

          <div className="param-group">
            <label className="param-label">
              Crossover Rate
              <span className="param-value">
                {(state.gaConfig.crossoverRate * 100).toFixed(0)}%
              </span>
            </label>
            <input
              type="range"
              min={50}
              max={100}
              value={state.gaConfig.crossoverRate * 100}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { crossoverRate: Number(e.target.value) / 100 },
                })
              }
              className="slider"
              disabled={state.gaStatus === "running"}
            />
          </div>

          <div className="param-group">
            <label className="param-label">
              Max Generations
              <span className="param-value">
                {state.gaConfig.maxGenerations}
              </span>
            </label>
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={state.gaConfig.maxGenerations}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { maxGenerations: Number(e.target.value) },
                })
              }
              className="slider"
              disabled={state.gaStatus === "running"}
            />
          </div>

          <div className="param-group">
            <label className="param-label">
              Tournament Size
              <span className="param-value">
                {state.gaConfig.tournamentSize}
              </span>
            </label>
            <input
              type="range"
              min={2}
              max={10}
              value={state.gaConfig.tournamentSize}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { tournamentSize: Number(e.target.value) },
                })
              }
              className="slider"
              disabled={state.gaStatus === "running"}
            />
          </div>

          <div className="control-buttons">
            {state.gaStatus !== "running" && (
              <button className="btn-run" onClick={handleRun} id="btn-run-ga">
                🚀 Run GA
              </button>
            )}
            {state.gaStatus === "running" && (
              <button
                className="btn-stop"
                onClick={handleStop}
                id="btn-stop-ga"
              >
                ⏹️ Stop
              </button>
            )}
            <button
              className="btn-reset"
              onClick={handleReset}
              id="btn-reset-ga"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        <div className="ga-chart-section">
          <h3 className="section-title">Fitness Progress</h3>
          <div className="stats-row">
            <div className="stat">
              <span className="stat-label">Generation</span>
              <span className="stat-value">{state.currentGeneration}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Best Fitness</span>
              <span className="stat-value highlight">
                {state.bestFitness.toFixed(1)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Status</span>
              <span className={`stat-value status-${state.gaStatus}`}>
                {state.gaStatus === "running"
                  ? "● Running"
                  : state.gaStatus === "completed"
                    ? "✓ Done"
                    : "○ Idle"}
              </span>
            </div>
          </div>
          <div className="chart-container">
            <canvas ref={canvasRef} className="fitness-chart"></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
