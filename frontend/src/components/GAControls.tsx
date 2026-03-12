/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/preserve-manual-memoization */
import { useRef, useCallback } from "react";
import { useAppState } from "../data/store";
import type {
  SelectionMethod,
  CrossoverMethod,
  MutationMethod,
  FitnessMethod,
} from "../data/types";
import { scheduleApi } from "../api/scheduleApi";

export function GAControls() {
  const { state, dispatch } = useAppState();
  const stopRef = useRef(false);

  // const handleRun = useCallback(async () => {
  //   stopRef.current = false;

  //   dispatch({ type: "SET_GA_STATUS", payload: "running" });
  //   dispatch({ type: "SET_CURRENT_GENERATION", payload: 0 });

  //   let fitness = 200;

  //   for (let gen = 1; gen <= state.gaConfig.maxGenerations; gen++) {
  //     if (stopRef.current) break;

  //     await new Promise((r) => setTimeout(r, 20));

  //     fitness += Math.random() * 10;

  //     dispatch({ type: "SET_CURRENT_GENERATION", payload: gen });
  //     dispatch({ type: "SET_BEST_FITNESS", payload: fitness });

  //     if (gen % 50 === 0) {
  //       const newTimetable = state.courses.map((course) => {
  //         const randomRoom =
  //           state.rooms[Math.floor(Math.random() * state.rooms.length)];

  //         const randomSlot =
  //           state.timeslots[Math.floor(Math.random() * state.timeslots.length)];

  //         return {
  //           courseId: course.id,
  //           lecturerId: course.lecturerId,
  //           roomId: randomRoom?.id ?? 1,
  //           timeslotId: randomSlot?.id ?? 1,
  //         };
  //       });

  //       dispatch({
  //         type: "SET_TIMETABLE",
  //         payload: newTimetable,
  //       });
  //     }
  //   }

  //   dispatch({ type: "SET_GA_STATUS", payload: "completed" });
  // }, [state.gaConfig.maxGenerations, dispatch]);

  const handleRun = useCallback(async () => {
    stopRef.current = false;

    try {
      dispatch({ type: "SET_GA_STATUS", payload: "running" });
      dispatch({ type: "SET_CURRENT_GENERATION", payload: 0 });

      const payload = {
        courses: state.courses,
        lecturers: state.lecturers,
        rooms: state.rooms,
        timeslots: state.timeslots,
        config: state.gaConfig,
      };

      const res = await scheduleApi.generate(payload);
      // console.log(res);

      const result = res.data;

      const timetable = result.schedule.map((s: any) => ({
        courseId: s.course,
        lecturerId: s.lecturer,
        roomId: s.room,
        timeslotId: s.timeslot,
        units: s.units,
      }));

      // dispatch({
      //   type: "SET_TIMETABLE",
      //   payload: result.bestChromosome,
      // });

      dispatch({
        type: "SET_TIMETABLE",
        payload: timetable,
      });

      dispatch({
        type: "SET_BEST_FITNESS",
        payload: result.bestFitness,
      });

      dispatch({
        type: "SET_CURRENT_GENERATION",
        payload: result.generations,
      });

      dispatch({ type: "SET_GA_STATUS", payload: "completed" });
    } catch (err) {
      console.error("GA run error:", err);
      dispatch({ type: "SET_GA_STATUS", payload: "idle" });
    }
  }, [
    state.courses,
    state.lecturers,
    state.rooms,
    state.timeslots,
    state.gaConfig,
    dispatch,
  ]);

  const handleStop = () => {
    stopRef.current = true;
  };

  const handleReset = () => {
    stopRef.current = true;
    dispatch({ type: "RESET_GA" });
  };

  const disabled = state.gaStatus === "running";

  return (
    <div className="ga-controls">
      <div className="page-header">
        <h2 className="page-title">GA Scheduler</h2>
        <p className="page-description">
          Configure genetic algorithm parameters
        </p>
      </div>

      <div className="ga-layout">
        <div className="ga-params">
          {/* POPULATION */}

          <h3 className="section-title">Population</h3>

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
              disabled={disabled}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { populationSize: Number(e.target.value) },
                })
              }
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
              disabled={disabled}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { maxGenerations: Number(e.target.value) },
                })
              }
            />
          </div>

          {/* SELECTION */}

          <h3 className="section-title">Selection</h3>

          <div className="param-group">
            <label className="param-label">Selection Method</label>

            <select
              value={state.gaConfig.selectionMethod}
              disabled={disabled}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: {
                    selectionMethod: e.target.value as SelectionMethod,
                  },
                })
              }
            >
              <option value="tournament">Tournament</option>
              <option value="roulette">Roulette</option>
              <option value="rank">Rank</option>
            </select>
          </div>

          {state.gaConfig.selectionMethod === "tournament" && (
            <div className="param-group">
              <label className="param-label">
                Tournament K
                <span className="param-value">
                  {state.gaConfig.tournamentK}
                </span>
              </label>

              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={state.gaConfig.tournamentK}
                disabled={disabled}
                onChange={(e) =>
                  dispatch({
                    type: "SET_GA_CONFIG",
                    payload: { tournamentK: Number(e.target.value) },
                  })
                }
              />
            </div>
          )}

          {/* CROSSOVER */}

          <h3 className="section-title">Crossover</h3>

          <div className="param-group">
            <label className="param-label">Crossover Method</label>

            <select
              value={state.gaConfig.crossoverMethod}
              disabled={disabled}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: {
                    crossoverMethod: e.target.value as CrossoverMethod,
                  },
                })
              }
            >
              <option value="single">Single Point</option>
              <option value="two">Two Point</option>
              <option value="multipoint">Multipoint</option>
              <option value="uniform">Uniform</option>
            </select>
          </div>

          {state.gaConfig.crossoverMethod === "multipoint" && (
            <div className="param-group">
              <label className="param-label">
                Multipoint N
                <span className="param-value">
                  {state.gaConfig.multipointN}
                </span>
              </label>

              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={state.gaConfig.multipointN}
                disabled={disabled}
                onChange={(e) =>
                  dispatch({
                    type: "SET_GA_CONFIG",
                    payload: { multipointN: Number(e.target.value) },
                  })
                }
              />
            </div>
          )}

          <div className="param-group">
            <label className="param-label">
              Crossover Rate
              <span className="param-value">
                {state.gaConfig.crossoverRate.toFixed(1)}
              </span>
            </label>

            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={state.gaConfig.crossoverRate}
              disabled={disabled}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { crossoverRate: Number(e.target.value) },
                })
              }
            />
          </div>

          {/* MUTATION */}

          <h3 className="section-title">Mutation</h3>

          <div className="param-group">
            <label className="param-label">Mutation Method</label>

            <select
              value={state.gaConfig.mutationMethod}
              disabled={disabled}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { mutationMethod: e.target.value as MutationMethod },
                })
              }
            >
              <option value="swap">Swap</option>
              <option value="scramble">Scramble</option>
              <option value="random">Random</option>
            </select>
          </div>

          <div className="param-group">
            <label className="param-label">
              Mutation Rate
              <span className="param-value">
                {(state.gaConfig.mutationRate ?? 0).toFixed(1)}
              </span>
            </label>

            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={state.gaConfig.mutationRate}
              disabled={disabled}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { mutationRate: Number(e.target.value) },
                })
              }
            />
          </div>

          {/* ELITISM */}

          <h3 className="section-title">Elitism</h3>

          <div className="param-group">
            <label className="param-label">
              Elitism Rate
              <span className="param-value">
                {(state.gaConfig.elitismRate ?? 0).toFixed(2)}
              </span>
            </label>

            <input
              type="range"
              min={0}
              max={0.5}
              step={0.05}
              value={state.gaConfig.elitismRate}
              disabled={disabled}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { elitismRate: Number(e.target.value) },
                })
              }
            />
          </div>

          {/* FITNESS */}

          <h3 className="section-title">Fitness</h3>

          <div className="param-group">
            <label className="param-label">Fitness Method</label>

            <select
              value={state.gaConfig.fitnessMethod}
              disabled={disabled}
              onChange={(e) =>
                dispatch({
                  type: "SET_GA_CONFIG",
                  payload: { fitnessMethod: e.target.value as FitnessMethod },
                })
              }
            >
              <option value="alpha-beta">Alpha Beta</option>
              <option value="penalty">Penalty</option>
            </select>
          </div>

          {state.gaConfig.fitnessMethod === "alpha-beta" && (
            <>
              <div className="param-group">
                <label className="param-label">Alpha</label>
                <input
                  type="number"
                  value={state.gaConfig.alpha}
                  disabled={disabled}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_GA_CONFIG",
                      payload: { alpha: Number(e.target.value) },
                    })
                  }
                />
              </div>

              <div className="param-group">
                <label className="param-label">Beta</label>
                <input
                  type="number"
                  value={state.gaConfig.beta}
                  disabled={disabled}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_GA_CONFIG",
                      payload: { beta: Number(e.target.value) },
                    })
                  }
                />
              </div>
            </>
          )}

          {state.gaConfig.fitnessMethod === "penalty" && (
            <>
              <div className="param-group">
                <label className="param-label">Base Score</label>
                <input
                  type="number"
                  value={state.gaConfig.baseScore}
                  disabled={disabled}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_GA_CONFIG",
                      payload: { baseScore: Number(e.target.value) },
                    })
                  }
                />
              </div>

              <div className="param-group">
                <label className="param-label">Hard Penalty</label>
                <input
                  type="number"
                  value={state.gaConfig.hardPenalty}
                  disabled={disabled}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_GA_CONFIG",
                      payload: { hardPenalty: Number(e.target.value) },
                    })
                  }
                />
              </div>

              <div className="param-group">
                <label className="param-label">Soft Reward</label>
                <input
                  type="number"
                  value={state.gaConfig.softReward}
                  disabled={disabled}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_GA_CONFIG",
                      payload: { softReward: Number(e.target.value) },
                    })
                  }
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
        </div>
      </div>
    </div>
  );
}
