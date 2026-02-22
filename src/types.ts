export interface Exercise {
  id?: number;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface Workout {
  id?: number;
  name: string;
  date: string;
  duration: number;
  calories: number;
  exercises?: Exercise[];
}

export interface UserProfile {
  name: string;
  weight: number;
  height: number;
  goal: string;
}

export interface DailyStat {
  date: string;
  calories: number;
}
