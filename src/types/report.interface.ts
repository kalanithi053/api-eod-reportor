export interface StatusLog {
  date: string;
  task: string;
  duration: string;
  name: string;
}

export interface StatusMailPayload {
  reportDate: string;
  projectName: string;
  totalHours: string;
  resourceName: string;
  logs: StatusLog[];
}
