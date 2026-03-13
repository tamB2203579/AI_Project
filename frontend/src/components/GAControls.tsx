/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback } from "react";
import { useAppState } from "../data/store";
import { scheduleApi } from "../api/scheduleApi";
import type { ScheduleRequest } from "../data/types";

const defaultConfig: ScheduleRequest = {
  fitness: {
    method: "weighted",
    base_score: 1000,
    hard_penalty: 50,
    soft_bonus: 5,
    alpha: 1000,
    beta: 10,
  },
  selection: {
    method: "tournament",
    tournament_k: 3,
  },
  crossover: {
    method: "single_point",
    rate: 0.8,
    n_points: 3,
  },
  mutation: {
    method: "random",
    rate: 0.05,
  },
  ga: {
    pop_size: 100,
    elitism_rate: 0.1,
    max_generations: 500,
    max_time_seconds: 60,
    max_stall_generations: 50,
    target_fitness: null,
  },
};

export function GAControls() {
  const { state, dispatch } = useAppState();
  const stopRef = useRef(false);
  const [config, setConfig] = useState<ScheduleRequest>(defaultConfig);

  const updateGA = (patch: Partial<ScheduleRequest["ga"]>) =>
    setConfig((c) => ({ ...c, ga: { ...c.ga, ...patch } }));

  const updateSelection = (patch: Partial<ScheduleRequest["selection"]>) =>
    setConfig((c) => ({ ...c, selection: { ...c.selection, ...patch } }));

  const updateCrossover = (patch: Partial<ScheduleRequest["crossover"]>) =>
    setConfig((c) => ({ ...c, crossover: { ...c.crossover, ...patch } }));

  const updateMutation = (patch: Partial<ScheduleRequest["mutation"]>) =>
    setConfig((c) => ({ ...c, mutation: { ...c.mutation, ...patch } }));

  const updateFitness = (patch: Partial<ScheduleRequest["fitness"]>) =>
    setConfig((c) => ({ ...c, fitness: { ...c.fitness, ...patch } }));

  const handleRun = useCallback(async () => {
    stopRef.current = false;

    try {
      dispatch({ type: "SET_GA_STATUS", payload: "running" });
      dispatch({ type: "SET_CURRENT_GENERATION", payload: 0 });

      const res = await scheduleApi.generate(config);
      const result = res.data;

      const timetable = result.schedule.map((s: any) => ({
        courseId: s.courseId,
        lecturerId: s.lecturerId,
        roomId: s.roomId,
        timeslotId: s.timeslotId,
        units: s.units,
      }));

      dispatch({ type: "SET_TIMETABLE", payload: timetable });

      dispatch({
        type: "SET_BEST_FITNESS",
        payload:
          typeof result.best_fitness === "object"
            ? result.best_fitness?.hard_score ?? 0
            : result.best_fitness ?? 0,
      });

      dispatch({
        type: "SET_CURRENT_GENERATION",
        payload: result.generations,
      });

      dispatch({
        type: "SET_HARD_CONSTRAINTS",
        payload: result.hard_constraints ?? [],
      });

      dispatch({
        type: "SET_SOFT_CONSTRAINTS",
        payload: result.soft_constraints ?? [],
      });

      dispatch({ type: "SET_GA_STATUS", payload: "completed" });
    } catch (err) {
      console.error("GA run error:", err);
      dispatch({ type: "SET_GA_STATUS", payload: "idle" });
    }
  }, [dispatch, config]);

  const handleStop = () => {
    stopRef.current = true;
  };

  const handleReset = () => {
    stopRef.current = true;
    dispatch({ type: "RESET_GA" });
    setConfig(defaultConfig);
  };

  const disabled = state.gaStatus === "running";

  return (
    <div className="ga-controls">
      <div className="page-header">
        <h2 className="page-title">GA Scheduler</h2>
        <p className="page-description">
          Configure genetic algorithm parameters and generate a timetable
        </p>
      </div>

      <div className="ga-layout">
        <div className="ga-params">

          {/* POPULATION */}
          <h3 className="section-title">Population</h3>

          <div className="param-group">
            <label className="param-label">
              Population Size
              <span className="param-value">{config.ga.pop_size}</span>
            </label>
            <input
              type="range" min={10} max={500} step={10}
              value={config.ga.pop_size} disabled={disabled}
              onChange={(e) => updateGA({ pop_size: Number(e.target.value) })}
            />
          </div>

          <div className="param-group">
            <label className="param-label">
              Max Generations
              <span className="param-value">{config.ga.max_generations}</span>
            </label>
            <input
              type="range" min={50} max={5000} step={50}
              value={config.ga.max_generations} disabled={disabled}
              onChange={(e) => updateGA({ max_generations: Number(e.target.value) })}
            />
          </div>

          <div className="param-group">
            <label className="param-label">
              Max Time (seconds)
              <span className="param-value">{config.ga.max_time_seconds}s</span>
            </label>
            <input
              type="range" min={10} max={300} step={10}
              value={config.ga.max_time_seconds} disabled={disabled}
              onChange={(e) => updateGA({ max_time_seconds: Number(e.target.value) })}
            />
          </div>

          <div className="param-group">
            <label className="param-label">
              Stall Generations
              <span className="param-value">{config.ga.max_stall_generations}</span>
            </label>
            <input
              type="range" min={10} max={200} step={10}
              value={config.ga.max_stall_generations} disabled={disabled}
              onChange={(e) => updateGA({ max_stall_generations: Number(e.target.value) })}
            />
          </div>

          <div className="param-group">
            <label className="param-label">
              Elitism Rate
              <span className="param-value">{config.ga.elitism_rate.toFixed(2)}</span>
            </label>
            <input
              type="range" min={0} max={0.5} step={0.05}
              value={config.ga.elitism_rate} disabled={disabled}
              onChange={(e) => updateGA({ elitism_rate: Number(e.target.value) })}
            />
          </div>

          {/* SELECTION */}
          <h3 className="section-title">Selection</h3>

          <div className="param-group">
            <label className="param-label">Selection Method</label>
            <select
              value={config.selection.method} disabled={disabled}
              onChange={(e) => updateSelection({ method: e.target.value })}
            >
              <option value="tournament">Tournament</option>
              <option value="roulette">Roulette</option>
              <option value="rank">Rank</option>
              <option value="elimination">Elimination</option>
            </select>
          </div>

          {config.selection.method === "tournament" && (
            <div className="param-group">
              <label className="param-label">
                Tournament K
                <span className="param-value">{config.selection.tournament_k}</span>
              </label>
              <input
                type="range" min={2} max={10} step={1}
                value={config.selection.tournament_k} disabled={disabled}
                onChange={(e) => updateSelection({ tournament_k: Number(e.target.value) })}
              />
            </div>
          )}

          {/* CROSSOVER */}
          <h3 className="section-title">Crossover</h3>

          <div className="param-group">
            <label className="param-label">Crossover Method</label>
            <select
              value={config.crossover.method} disabled={disabled}
              onChange={(e) => updateCrossover({ method: e.target.value })}
            >
              <option value="single_point">Single Point</option>
              <option value="two_point">Two Point</option>
              <option value="multi_point">Multi Point</option>
              <option value="uniform">Uniform</option>
            </select>
          </div>

          {config.crossover.method === "multi_point" && (
            <div className="param-group">
              <label className="param-label">
                Number of Points
                <span className="param-value">{config.crossover.n_points}</span>
              </label>
              <input
                type="range" min={1} max={10} step={1}
                value={config.crossover.n_points} disabled={disabled}
                onChange={(e) => updateCrossover({ n_points: Number(e.target.value) })}
              />
            </div>
          )}

          <div className="param-group">
            <label className="param-label">
              Crossover Rate
              <span className="param-value">{config.crossover.rate.toFixed(2)}</span>
            </label>
            <input
              type="range" min={0} max={1} step={0.05}
              value={config.crossover.rate} disabled={disabled}
              onChange={(e) => updateCrossover({ rate: Number(e.target.value) })}
            />
          </div>

          {/* MUTATION */}
          <h3 className="section-title">Mutation</h3>

          <div className="param-group">
            <label className="param-label">Mutation Method</label>
            <select
              value={config.mutation.method} disabled={disabled}
              onChange={(e) => updateMutation({ method: e.target.value })}
            >
              <option value="random">Random</option>
              <option value="swap">Swap</option>
              <option value="creep">Creep</option>
            </select>
          </div>

          <div className="param-group">
            <label className="param-label">
              Mutation Rate
              <span className="param-value">{config.mutation.rate.toFixed(2)}</span>
            </label>
            <input
              type="range" min={0} max={1} step={0.01}
              value={config.mutation.rate} disabled={disabled}
              onChange={(e) => updateMutation({ rate: Number(e.target.value) })}
            />
          </div>

          {/* FITNESS */}
          <h3 className="section-title">Fitness</h3>

          <div className="param-group">
            <label className="param-label">Fitness Method</label>
            <select
              value={config.fitness.method} disabled={disabled}
              onChange={(e) => updateFitness({ method: e.target.value })}
            >
              <option value="alpha_beta">Alpha Beta</option>
              <option value="penalty">Penalty</option>
              <option value="weighted">Weighted</option>
              <option value="lexicographic">Lexicographic</option>
            </select>
          </div>

          {config.fitness.method === "alpha_beta" && (
            <>
              <div className="param-group">
                <label className="param-label">Alpha</label>
                <input
                  type="number" value={config.fitness.alpha} disabled={disabled}
                  onChange={(e) => updateFitness({ alpha: Number(e.target.value) })}
                />
              </div>
              <div className="param-group">
                <label className="param-label">Beta</label>
                <input
                  type="number" value={config.fitness.beta} disabled={disabled}
                  onChange={(e) => updateFitness({ beta: Number(e.target.value) })}
                />
              </div>
            </>
          )}

          {config.fitness.method === "penalty" && (
            <>
              <div className="param-group">
                <label className="param-label">Base Score</label>
                <input
                  type="number" value={config.fitness.base_score} disabled={disabled}
                  onChange={(e) => updateFitness({ base_score: Number(e.target.value) })}
                />
              </div>
              <div className="param-group">
                <label className="param-label">Hard Penalty</label>
                <input
                  type="number" value={config.fitness.hard_penalty} disabled={disabled}
                  onChange={(e) => updateFitness({ hard_penalty: Number(e.target.value) })}
                />
              </div>
              <div className="param-group">
                <label className="param-label">Soft Bonus</label>
                <input
                  type="number" value={config.fitness.soft_bonus} disabled={disabled}
                  onChange={(e) => updateFitness({ soft_bonus: Number(e.target.value) })}
                />
              </div>
            </>
          )}

          {/* CONTROLS */}
          <div className="control-buttons">
            {state.gaStatus !== "running" && (
              <button className="btn-run" onClick={handleRun}>
                🚀 Run GA
              </button>
            )}

            {state.gaStatus === "running" && (
              <button className="btn-stop" onClick={handleStop}>
                ⏹ Stop
              </button>
            )}

            <button className="btn-reset" onClick={handleReset}>
              🔄 Reset
            </button>
          </div>

          {/* STATUS */}
          {state.gaStatus === "completed" && (
            <div className="param-group" style={{ marginTop: "12px" }}>
              <span className="param-label">
                ✅ Completed · Fitness: <strong>{state.bestFitness}</strong> · Generation: <strong>{state.currentGeneration}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
