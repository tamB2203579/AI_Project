# Lecturer Timetable Optimization via Genetic Algorithm
## Theoretical Explanation & Architecture

This application addresses the **University Timetabling Problem (UTP)**, a classic NP-hard optimization challenge. The goal is to schedule a set of courses, taught by specific lecturers, into available rooms over a weekly time grid without any conflicts, while maximizing the lecturers' preferences.

We solve this using a **Genetic Algorithm (GA)**, a heuristic search approach inspired by the process of natural selection.

### 1. The Real-World Constraints
A valid timetable must adhere to two types of constraints:
1. **Hard Constraints**: Rules that *must* be satisfied for the schedule to be physically possible.
    - A lecturer cannot be in two places at once.
    - A room cannot host two classes simultaneously.
    - The number of enrolled students cannot exceed room capacity.
    - A lecturer's scheduled hours cannot exceed their maximum allowed weekly hours.
    - Sessions should not overflow from morning to afternoon (i.e. cross the lunch break boundary).
2. **Soft Constraints**: Preferences that represent a "good" schedule but aren't strictly mandatory.
    - Classes should ideally happen on days that the lecturer prefers.
    - (Optional extensions) Spacing out classes properly, minimizing dead time for students, etc.

### 2. Genetic Algorithm Encoding
To apply a GA, we must encode a potential timetable into a numerical format called a **Chromosome**.

- **Gene**: A single scheduled block of a course. It contains:
  - `courseId`, `lecturerId`, `roomId`
  - `dayIndex` (0 to 4 for Monday-Friday)
  - `slotIndex` (0 to 8 for the 9 daily periods)
  - `duration` (number of consecutive periods)
- **Chromosome**: An array of Genes representing a complete, specific timetable for the university.
- **Population**: A collection of many Chromosomes (e.g., 60 timetables), initially completely randomized.

### 3. Fitness Function (Objective Evaluation)
The fitness function is the heart of the algorithm. It mathematically evaluates how "good" a chromosome is by looking for broken constraints and penalizing the score.

We start every chromosome with an arbitrary base score (e.g., `1000`).
* **Hard Penalties (Critical Failures)**:
  * Lecturer/Room Time Clash: `-100` points per overlapping session.
  * Room Overcapacity: `-50` points.
  * Lecturer Overload: `-50` points.
  * Session Overflow (crosses lunch/day boundary): `-100` points.
* **Soft Rewards (Preferences)**:
  * Lecturer preferred day: `+5` points.

*Perfect schedules approach or exceed a score of 1000 with 0 hard conflicts.*

### 4. Evolutionary Process
The algorithm iterates over hundreds of generations, attempting to evolve a perfect timetable.

#### A. Selection (Tournament)
We randomly pick `k` (e.g., 3) chromosomes from the current population and select the one with the highest fitness score. This process guarantees that "fitter" timetables have a higher probability of becoming parents and passing on their traits, while still allowing some weaker ones to survive to maintain genetic diversity.

#### B. Crossover (Uniform)
We take two parent chromosomes and create two children. For every corresponding gene (course scheduling assignment) in the parents, there is a `50%` chance we swap them. This creates offspring that inherit a mixture of scheduling configurations from both parents.

#### C. Mutation
To prevent the population from getting stuck in local optima (a scenario where timetables look okay but still have the same persistent edge-case conflicts), we introduce random mutations. Every gene has a small `mutationRate` probability (e.g., 5%) of having its `roomId`, `dayIndex`, or `slotIndex` randomly scrambled to a new legally valid configuration. 

#### D. Elitism
To ensure that we never lose our progress, the single best-performing chromosome from the current generation is guaranteed to pass into the next generation entirely unmodified.

### 5. Termination
The GA runs in a continuous loop until one of two conditions is met:
1. It reaches the `maxGenerations` limit (e.g., generation 500).
2. It discovers a chromosome with an optimal fitness score (e.g. `1000`), implying all hard constraints have been perfectly solved with no penalties.

Once the algorithm terminates, the highest-scoring chromosome is decoded back into the visual `TimetableGrid` UI for human review.
