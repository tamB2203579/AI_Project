/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useCallback } from "react";
import { useAppState } from "../data/store";
import { scheduleApi } from "../api/scheduleApi";
import type { ScheduleRequest } from "../data/types";

export function GAControls() {
  const { state, dispatch } = useAppState();
  const stopRef = useRef(false);
  const config = state.gaConfig;

  /* ── config helpers ── */
  const setConfig = useCallback(
    (updater: (prev: ScheduleRequest) => ScheduleRequest) =>
      dispatch({ type: "SET_GA_CONFIG", payload: updater(config) }),
    [dispatch, config]
  );
  const updateGA = (p: Partial<ScheduleRequest["ga"]>) => setConfig(c => ({ ...c, ga: { ...c.ga, ...p } }));
  const updateSelection = (p: Partial<ScheduleRequest["selection"]>) => setConfig(c => ({ ...c, selection: { ...c.selection, ...p } }));
  const updateCrossover = (p: Partial<ScheduleRequest["crossover"]>) => setConfig(c => ({ ...c, crossover: { ...c.crossover, ...p } }));
  const updateMutation = (p: Partial<ScheduleRequest["mutation"]>) => setConfig(c => ({ ...c, mutation: { ...c.mutation, ...p } }));
  const updateFitness = (p: Partial<ScheduleRequest["fitness"]>) => setConfig(c => ({ ...c, fitness: { ...c.fitness, ...p } }));

  /* ── run handler ── */
  const handleRun = useCallback(async () => {
    stopRef.current = false;
    dispatch({ type: "SET_GA_STATUS", payload: "running" });
    dispatch({ type: "SET_CURRENT_GENERATION", payload: 0 });
    try {
      const res = await scheduleApi.generate(config);
      const result = res.data;

      const finalGen = result.generations ?? 0;

      dispatch({
        type: "SET_TIMETABLE", payload: result.schedule.map((s: any) => ({
          courseId: s.courseId, courseName: s.courseName,
          lecturerId: s.lecturerId, lecturerName: s.lecturerName,
          roomId: s.roomId, roomName: s.roomName,
          timeslotId: s.timeslotId, units: s.units,
        }))
      });
      dispatch({ type: "SET_BEST_FITNESS", payload: typeof result.best_fitness === "object" ? result.best_fitness?.hard_score ?? 0 : result.best_fitness ?? 0 });
      dispatch({ type: "SET_CURRENT_GENERATION", payload: finalGen });
      dispatch({ type: "SET_HARD_CONSTRAINTS", payload: result.hard_constraints ?? [] });
      dispatch({ type: "SET_SOFT_CONSTRAINTS", payload: result.soft_constraints ?? [] });
      dispatch({ type: "SET_GA_STATUS", payload: "completed" });
    } catch (err) {
      console.error("GA run error:", err);
      dispatch({ type: "SET_GA_STATUS", payload: "idle" });
    }
  }, [dispatch, config]);

  const handleStop = useCallback(() => {
    stopRef.current = true;
    dispatch({ type: "SET_GA_STATUS", payload: "idle" });
  }, [dispatch]);

  const handleReset = useCallback(() => {
    stopRef.current = true;
    dispatch({ type: "RESET_GA" });
  }, [dispatch]);

  const disabled = state.gaStatus === "running";

  return (
    <div className="ga-controls">
      <div className="page-header">
        <h2 className="page-title">GA Scheduler</h2>
        <p className="page-description">Configure genetic algorithm parameters and generate a timetable</p>
      </div>

      <div className="ga-layout">

        {/* ── LEFT: config ── */}
        <div className="ga-params">
          <h3 className="section-title">Population</h3>
          <div className="param-group"><label className="param-label">Population Size<span className="param-value">{config.ga.pop_size}</span></label><input type="range" min={10} max={500} step={10} value={config.ga.pop_size} disabled={disabled} onChange={e => updateGA({ pop_size: +e.target.value })} /></div>
          <div className="param-group"><label className="param-label">Max Generations<span className="param-value">{config.ga.max_generations}</span></label><input type="range" min={50} max={5000} step={50} value={config.ga.max_generations} disabled={disabled} onChange={e => updateGA({ max_generations: +e.target.value })} /></div>
          <div className="param-group"><label className="param-label">Max Time (s)<span className="param-value">{config.ga.max_time_seconds}s</span></label><input type="range" min={10} max={60} step={5} value={config.ga.max_time_seconds} disabled={disabled} onChange={e => updateGA({ max_time_seconds: +e.target.value })} /></div>
          <div className="param-group"><label className="param-label">Stall Generations<span className="param-value">{config.ga.max_stall_generations}</span></label><input type="range" min={10} max={200} step={10} value={config.ga.max_stall_generations} disabled={disabled} onChange={e => updateGA({ max_stall_generations: +e.target.value })} /></div>
          <div className="param-group"><label className="param-label">Elitism Rate<span className="param-value">{config.ga.elitism_rate.toFixed(2)}</span></label><input type="range" min={0} max={0.5} step={0.05} value={config.ga.elitism_rate} disabled={disabled} onChange={e => updateGA({ elitism_rate: +e.target.value })} /></div>

          <h3 className="section-title">Selection</h3>
          <div className="param-group"><label className="param-label">Method</label><select value={config.selection.method} disabled={disabled} onChange={e => updateSelection({ method: e.target.value })}><option value="tournament">Tournament</option><option value="roulette">Roulette</option><option value="rank">Rank</option><option value="elimination">Elimination</option></select></div>
          {config.selection.method === "tournament" && <div className="param-group"><label className="param-label">Tournament K<span className="param-value">{config.selection.tournament_k}</span></label><input type="range" min={2} max={10} step={1} value={config.selection.tournament_k} disabled={disabled} onChange={e => updateSelection({ tournament_k: +e.target.value })} /></div>}

          <h3 className="section-title">Crossover</h3>
          <div className="param-group"><label className="param-label">Method</label><select value={config.crossover.method} disabled={disabled} onChange={e => updateCrossover({ method: e.target.value })}><option value="single_point">Single Point</option><option value="two_point">Two Point</option><option value="multi_point">Multi Point</option><option value="uniform">Uniform</option></select></div>
          {config.crossover.method === "multi_point" && <div className="param-group"><label className="param-label">N Points<span className="param-value">{config.crossover.n_points}</span></label><input type="range" min={1} max={10} step={1} value={config.crossover.n_points} disabled={disabled} onChange={e => updateCrossover({ n_points: +e.target.value })} /></div>}
          <div className="param-group"><label className="param-label">Rate<span className="param-value">{config.crossover.rate.toFixed(2)}</span></label><input type="range" min={0} max={1} step={0.05} value={config.crossover.rate} disabled={disabled} onChange={e => updateCrossover({ rate: +e.target.value })} /></div>

          <h3 className="section-title">Mutation</h3>
          <div className="param-group"><label className="param-label">Method</label><select value={config.mutation.method} disabled={disabled} onChange={e => updateMutation({ method: e.target.value })}><option value="random">Random</option><option value="swap">Swap</option><option value="creep">Creep</option><option value="heuristic">Heuristic</option></select></div>
          <div className="param-group"><label className="param-label">Rate<span className="param-value">{config.mutation.rate.toFixed(2)}</span></label><input type="range" min={0} max={1} step={0.01} value={config.mutation.rate} disabled={disabled} onChange={e => updateMutation({ rate: +e.target.value })} /></div>

          <h3 className="section-title">Fitness</h3>
          <div className="param-group"><label className="param-label">Method</label><select value={config.fitness.method} disabled={disabled} onChange={e => updateFitness({ method: e.target.value })}><option value="alpha_beta">Alpha Beta</option><option value="penalty">Penalty</option><option value="weighted">Weighted</option><option value="lexicographic">Lexicographic</option></select></div>
          {config.fitness.method === "alpha_beta" && <><div className="param-group"><label className="param-label">Alpha</label><input type="number" value={config.fitness.alpha} disabled={disabled} onChange={e => updateFitness({ alpha: +e.target.value })} /></div><div className="param-group"><label className="param-label">Beta</label><input type="number" value={config.fitness.beta} disabled={disabled} onChange={e => updateFitness({ beta: +e.target.value })} /></div></>}
          {config.fitness.method === "penalty" && <><div className="param-group"><label className="param-label">Base Score</label><input type="number" value={config.fitness.base_score} disabled={disabled} onChange={e => updateFitness({ base_score: +e.target.value })} /></div><div className="param-group"><label className="param-label">Hard Penalty</label><input type="number" value={config.fitness.hard_penalty} disabled={disabled} onChange={e => updateFitness({ hard_penalty: +e.target.value })} /></div><div className="param-group"><label className="param-label">Soft Bonus</label><input type="number" value={config.fitness.soft_bonus} disabled={disabled} onChange={e => updateFitness({ soft_bonus: +e.target.value })} /></div></>}

          <div className="control-buttons">
            {state.gaStatus !== "running" && <button className="btn-run" onClick={handleRun}>🚀 Run GA</button>}
            {state.gaStatus === "running" && <button className="btn-stop" onClick={handleStop}>⏹ Stop</button>}
            <button className="btn-reset" onClick={handleReset}>🔄 Reset</button>
          </div>
          {state.gaStatus === "completed" && (
            <div className="param-group" style={{ marginTop: 12 }}>
              <span className="param-label">✅ Completed · Fitness: <strong>{state.bestFitness}</strong> · Gen: <strong>{state.currentGeneration}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
